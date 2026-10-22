/* =====================================================================
   Generic repository for website content (see content/types.js).
   Works with DTOs: { id, …fields, …lists (arrays), …ones (object|null), sortOrder, active }.
   Saves are transactional; child lists and 1:1 parts are replaced as a whole.
   ===================================================================== */
const { getPool, transaction } = require('../db/pool');
const { TYPES } = require('../content/types');

const parseJson = v => { if (v == null) return null; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (e) { return null; } };

function fromCol(f, v) {
  if (v === null || v === undefined) return f.nullable ? null : { int: 0, number: 0, bool: false, json: null }[f.kind] ?? '';
  switch (f.kind) {
    case 'int': case 'number': return Number(v);
    case 'bool': return !!Number(v);
    case 'date': return String(v).slice(0, 10);
    case 'json': return parseJson(v);
    default: return String(v);
  }
}
function toCol(f, v) {
  if (v === undefined || v === null || (v === '' && f.nullable)) return f.nullable ? null : { int: 0, number: 0, bool: 0, json: null, date: null }[f.kind] ?? '';
  switch (f.kind) {
    case 'int': return Math.round(+v || 0);
    case 'number': return +v || 0;
    case 'bool': return v ? 1 : 0;
    case 'json': return JSON.stringify(v);
    default: return String(v);
  }
}

class ContentRepository {
  constructor(type) { this.t = type; }

  rowToDto(row) { const d = {}; for (const f of this.t.fields) d[f.name] = fromCol(f, row[f.col]); return d; }
  dtoToRow(dto) { const r = {}; for (const f of this.t.fields) r[f.col] = toCol(f, dto[f.name]); return r; }
  itemFromRow(l, r) { if (l.scalar) return fromCol(l.scalar, r[l.scalar.col]); const o = {}; for (const f of l.fields) o[f.name] = fromCol(f, r[f.col]); return o; }

  async attach(conn, dtos) {
    if (!dtos.length) return dtos;
    const ids = dtos.map(d => d.id), by = new Map(dtos.map(d => [d.id, d]));
    for (const l of this.t.lists) {
      dtos.forEach(d => { d[l.name] = []; });
      const where = Object.entries(l.where || {});
      const [rows] = await conn.query(`SELECT * FROM \`${l.table}\` WHERE \`${l.fk}\` IN (?)${where.map(([k]) => ` AND \`${k}\`=?`).join('')} ORDER BY \`${l.fk}\`, position`, [ids, ...where.map(([, v]) => v)]);
      rows.forEach(r => { const d = by.get(r[l.fk]); if (d) d[l.name].push(this.itemFromRow(l, r)); });
    }
    for (const o of this.t.ones) {
      dtos.forEach(d => { d[o.name] = null; });
      const [rows] = await conn.query(`SELECT * FROM \`${o.table}\` WHERE \`${o.fk}\` IN (?)`, [ids]);
      rows.forEach(r => { const d = by.get(r[o.fk]); if (d) { const x = {}; o.fields.forEach(f => { x[f.name] = fromCol(f, r[f.col]); }); d[o.name] = x; } });
    }
    return dtos;
  }

  async list({ activeOnly = false } = {}, conn = getPool()) {
    const [rows] = await conn.query(`SELECT * FROM \`${this.t.table}\`${activeOnly ? ' WHERE active=1' : ''} ORDER BY sort_order, id`);
    return this.attach(conn, rows.map(r => this.rowToDto(r)));
  }
  async get(id, conn = getPool()) {
    const [rows] = await conn.query(`SELECT * FROM \`${this.t.table}\` WHERE id=?`, [String(id)]);
    if (!rows.length) return null;
    return (await this.attach(conn, [this.rowToDto(rows[0])]))[0];
  }
  async nextSortOrder(conn) { const [[r]] = await conn.query(`SELECT COALESCE(MAX(sort_order),0)+10 AS n FROM \`${this.t.table}\``); return r.n; }

  async writeParts(conn, id, dto, only) {
    for (const l of this.t.lists) {
      if (only && !(l.name in only)) continue;
      const where = Object.entries(l.where || {});
      await conn.query(`DELETE FROM \`${l.table}\` WHERE \`${l.fk}\`=?${where.map(([k]) => ` AND \`${k}\`=?`).join('')}`, [id, ...where.map(([, v]) => v)]);
      const items = Array.isArray(dto[l.name]) ? dto[l.name] : [];
      for (let i = 0; i < items.length; i++) {
        const row = { [l.fk]: id, position: i, ...(l.where || {}) };
        if (l.scalar) row[l.scalar.col] = toCol(l.scalar, items[i]);
        else l.fields.forEach(f => { row[f.col] = toCol(f, (items[i] || {})[f.name]); });
        await conn.query(`INSERT INTO \`${l.table}\` SET ?`, [row]);
      }
    }
    for (const o of this.t.ones) {
      if (only && !(o.name in only)) continue;
      await conn.query(`DELETE FROM \`${o.table}\` WHERE \`${o.fk}\`=?`, [id]);
      const v = dto[o.name];
      if (v && typeof v === 'object') { const row = { [o.fk]: id }; o.fields.forEach(f => { row[f.col] = toCol(f, v[f.name]); }); await conn.query(`INSERT INTO \`${o.table}\` SET ?`, [row]); }
    }
  }

  async create(dto, conn) {
    if (!conn) return transaction(c => this.create(dto, c));
    const d = { ...dto };
    if (d.sortOrder === undefined || d.sortOrder === null || d.sortOrder === '') d.sortOrder = await this.nextSortOrder(conn);
    if (d.active === undefined) d.active = true;
    await conn.query(`INSERT INTO \`${this.t.table}\` SET ?`, [this.dtoToRow(d)]);
    await this.writeParts(conn, d.id, d);
    return this.get(d.id, conn);
  }
  /* partial update: only the fields / lists present in `patch` change; renaming the id cascades to child tables */
  async update(id, patch, conn) {
    if (!conn) return transaction(c => this.update(id, patch, c));
    const cur = await this.get(id, conn); if (!cur) return null;
    const next = { ...cur, ...patch };
    await conn.query(`UPDATE \`${this.t.table}\` SET ? WHERE id=?`, [this.dtoToRow(next), cur.id]);
    await this.writeParts(conn, next.id, next, patch);
    return this.get(next.id, conn);
  }
  async remove(id, conn = getPool()) { const [r] = await conn.query(`DELETE FROM \`${this.t.table}\` WHERE id=?`, [String(id)]); return r.affectedRows > 0; }
  async count(conn = getPool()) { const [[r]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${this.t.table}\``); return r.n; }
}

const contentRepos = Object.fromEntries(Object.entries(TYPES).map(([k, t]) => [k, new ContentRepository(t)]));
module.exports = { ContentRepository, contentRepos };
