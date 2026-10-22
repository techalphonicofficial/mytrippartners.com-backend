/* =====================================================================
   Generic repository for operational collections (see collections.js).
   Records keep the shape the dashboard has always used: { id, ...fields, arrays, created, updated }.
   Update = shallow merge (arrays replace the stored list as a whole), in one transaction.
   ===================================================================== */
const { getPool, transaction } = require('../db/pool');
const { COLLECTIONS } = require('./collections');
const { now, uid, isoToDb, dbToIso, isDate } = require('../utils/common');

const RESERVED = new Set(['id', 'created', 'updated']);
const parseJson = v => { if (v == null || v === '') return null; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (e) { return null; } };

/* value from a record → column value */
function toCol(f, v, creating) {
  if (v === undefined) v = creating ? f.def : undefined;
  if (v === undefined) return undefined;
  switch (f.kind) {
    case 'int': if (v === null || v === '') return f.opt ? null : 0; return Math.max(0, Math.round(+v || 0));
    case 'num': if (v === null || v === '') return f.opt ? null : 0; return +v || 0;
    case 'bool': if (v === null && f.opt) return null; return v === true || v === 1 || v === 'true' || v === '1' ? 1 : 0;
    case 'date': return isDate(v) ? String(v) : null;
    case 'json': return v == null ? null : JSON.stringify(v);
    default: if (v === null && f.opt) return null; return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
}
/* column value → record value (undefined = omit the key) */
function fromCol(f, v) {
  if (v === null || v === undefined) {
    if (f.opt) return undefined;
    return { int: 0, num: 0, bool: false, date: '', json: f.def ?? null }[f.kind] ?? '';
  }
  switch (f.kind) {
    case 'int': case 'num': return Number(v);
    case 'bool': return !!Number(v);
    case 'date': return String(v).slice(0, 10);
    case 'json': return parseJson(v);
    default: return String(v);
  }
}

class RecordRepository {
  constructor(def) {
    this.def = def;
    this.table = def.table;
    this.keys = new Set([...def.fields.map(f => f.key), ...Object.keys(def.children)]);
  }

  /* ---------- mapping ---------- */
  toRecord(row, kids = {}) {
    const d = this.def;
    if (d.document) return { ...(parseJson(row.data) || {}), id: row.id, created: dbToIso(row.created_at), updated: dbToIso(row.updated_at) };
    const rec = { ...(parseJson(row.extra) || {}) };
    for (const f of d.fields) { const v = fromCol(f, row[f.col]); if (v !== undefined) rec[f.key] = v; }
    for (const [k, c] of Object.entries(d.children)) rec[k] = (kids[k] || []).map(r => this.childToItem(c, r));
    rec.id = row.id; rec.created = dbToIso(row.created_at); rec.updated = dbToIso(row.updated_at);
    return rec;
  }
  childToItem(c, r) {
    if (c.scalar) return fromCol(c.scalar, r[c.scalar.col]);
    const o = c.extra ? { ...(parseJson(r.extra) || {}) } : {};
    for (const f of c.fields) { const v = fromCol(f, r[f.col]); if (v !== undefined) o[f.key] = v; }
    return o;
  }
  rowValues(rec, creating) {
    const cols = {};
    for (const f of this.def.fields) { const v = toCol(f, rec[f.key], creating); if (v !== undefined) cols[f.col] = v; }
    for (const [col, fn] of Object.entries(this.def.derived)) cols[col] = fn(rec);
    const extra = Object.fromEntries(Object.entries(rec).filter(([k]) => !this.keys.has(k) && !RESERVED.has(k)));
    cols.extra = Object.keys(extra).length ? JSON.stringify(extra) : null;
    return cols;
  }

  /* ---------- reads ---------- */
  async loadChildren(conn, ids) {
    const kids = {};
    for (const [k, c] of Object.entries(this.def.children)) {
      kids[k] = new Map();
      if (!ids.length) continue;
      const [rows] = await conn.query(`SELECT * FROM \`${c.table}\` WHERE \`${c.fk}\` IN (?) ORDER BY \`${c.fk}\`, position`, [ids]);
      for (const r of rows) { const id = r[c.fk]; if (!kids[k].has(id)) kids[k].set(id, []); kids[k].get(id).push(r); }
    }
    return kids;
  }
  async list({ limit } = {}, conn = getPool()) {
    const [rows] = await conn.query(`SELECT * FROM \`${this.table}\` ORDER BY created_at DESC, id DESC${limit ? ' LIMIT ' + (+limit | 0) : ''}`);
    const kids = await this.loadChildren(conn, rows.map(r => r.id));
    return rows.map(r => this.toRecord(r, Object.fromEntries(Object.entries(kids).map(([k, m]) => [k, m.get(r.id)]))));
  }
  async get(id, conn = getPool(), { lock = false } = {}) {
    if (id == null || id === '') return null;
    const [rows] = await conn.query(`SELECT * FROM \`${this.table}\` WHERE id=?${lock ? ' FOR UPDATE' : ''}`, [String(id)]);
    if (!rows.length) return null;
    const kids = await this.loadChildren(conn, [rows[0].id]);
    return this.toRecord(rows[0], Object.fromEntries(Object.entries(kids).map(([k, m]) => [k, m.get(rows[0].id)])));
  }
  /* first record whose field equals value (uses the column index) */
  async findBy(key, value, conn = getPool()) {
    const f = this.def.fields.find(x => x.key === key); if (!f) throw new Error(`Unknown field ${key}`);
    const [rows] = await conn.query(`SELECT id FROM \`${this.table}\` WHERE \`${f.col}\`=? LIMIT 1`, [value]);
    return rows.length ? this.get(rows[0].id, conn) : null;
  }
  async exists(id, conn = getPool()) { const [r] = await conn.query(`SELECT 1 FROM \`${this.table}\` WHERE id=?`, [String(id)]); return r.length > 0; }

  /* ---------- writes ---------- */
  async writeChildren(conn, id, rec, only) {
    for (const [k, c] of Object.entries(this.def.children)) {
      if (only && !(k in only)) continue;
      await conn.query(`DELETE FROM \`${c.table}\` WHERE \`${c.fk}\`=?`, [id]);
      const items = Array.isArray(rec[k]) ? rec[k] : [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i], row = { [c.fk]: id, position: i };
        if (c.scalar) row[c.scalar.col] = toCol(c.scalar, it, true) ?? '';
        else {
          const o = it && typeof it === 'object' ? it : {};
          for (const f of c.fields) { const v = toCol(f, o[f.key], true); row[f.col] = v === undefined ? (f.kind === 'str' ? (f.opt ? null : '') : f.kind === 'int' ? (f.opt ? null : 0) : null) : v; }
          for (const [col, fn] of Object.entries(c.derived || {})) row[col] = fn(o);
          if (c.extra) { const known = new Set(c.fields.map(f => f.key)); const ex = Object.fromEntries(Object.entries(o).filter(([key]) => !known.has(key))); row.extra = Object.keys(ex).length ? JSON.stringify(ex) : null; }
        }
        await conn.query(`INSERT INTO \`${c.table}\` SET ?`, [row]);
      }
    }
  }
  async create(data, id, conn) {
    if (!conn) return transaction(c => this.create(data, id, c));
    id = String(id || data.id || uid());
    const t = isoToDb(now()), rec = { ...data }; delete rec.id;
    if (this.def.document) {
      await conn.query(`INSERT INTO \`${this.table}\` (id,data,created_at,updated_at) VALUES (?,?,?,?)`, [id, JSON.stringify(stripMeta(rec)), t, t]);
    } else {
      await conn.query(`INSERT INTO \`${this.table}\` SET ?`, [{ id, ...this.rowValues(rec, true), created_at: t, updated_at: t }]);
      await this.writeChildren(conn, id, rec);
    }
    return this.get(id, conn);
  }
  async update(id, patch, conn) {
    if (!conn) return transaction(c => this.update(id, patch, c));
    const cur = await this.get(id, conn, { lock: true }); if (!cur) return null;
    const p = { ...patch }; ['id', 'created', 'updated'].forEach(k => delete p[k]);
    const next = { ...cur, ...p }, t = isoToDb(now());
    if (this.def.document) {
      await conn.query(`UPDATE \`${this.table}\` SET data=?, updated_at=? WHERE id=?`, [JSON.stringify(stripMeta(next)), t, cur.id]);
    } else {
      await conn.query(`UPDATE \`${this.table}\` SET ? WHERE id=?`, [{ ...this.rowValues(next, false), updated_at: t }, cur.id]);
      await this.writeChildren(conn, cur.id, next, p);
    }
    return this.get(cur.id, conn);
  }
  async remove(id, conn = getPool()) {
    const [r] = await conn.query(`DELETE FROM \`${this.table}\` WHERE id=?`, [String(id)]);
    return r.affectedRows > 0;
  }
}
const stripMeta = r => { const o = { ...r }; delete o.id; delete o.created; delete o.updated; return o; };

const repos = Object.fromEntries(Object.entries(COLLECTIONS).map(([k, def]) => [k, new RecordRepository(def)]));
module.exports = { RecordRepository, repos };
