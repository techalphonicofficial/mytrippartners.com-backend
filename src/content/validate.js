/* Input validation for content DTOs, driven by the type registry (content/types.js).
   validate(type, input, { partial }) → clean DTO (only known keys) or throws 400 with field errors. */
const { badRequest } = require('../utils/errors');

/* content is plain text: the website adds all markup (defence in depth against stored XSS) */
const NO_HTML = /[<>]/;
const humanize = n => n.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, c => c.toUpperCase()); /* nights → Nights, bestTime → Best time */
const HTML_MSG = 'plain text only — the characters < and > are not allowed';

const RULES = {
  slug: v => /^[a-z0-9][a-z0-9-]{0,63}$/.test(v) || 'use lower-case letters, digits and hyphens',
  image: v => v === '' || /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(v) || 'pick an image name (file in img/ without .jpg)',
  color: v => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) || 'use a #rgb or #rrggbb colour',
  date: v => /^\d{4}-\d{2}-\d{2}$/.test(v) || 'use YYYY-MM-DD',
};

function cleanValue(f, v, errors, path) {
  const label = path || f.label || humanize(f.name);
  const empty = v === undefined || v === null || v === '';
  if (empty) {
    if (f.required) { errors.push(`${label} is required`); return undefined; }
    if (f.nullable || f.kind === 'ref' || f.kind === 'json') return null;
    if (f.kind === 'date') { errors.push(`${label} is required`); return undefined; }
    return { int: 0, number: 0, bool: f.default ?? false, enum: f.values ? f.values[0] : '' }[f.kind] ?? '';
  }
  switch (f.kind) {
    case 'int': case 'number': {
      const n = Number(v); if (!Number.isFinite(n)) { errors.push(`${label} must be a number`); return undefined; }
      const x = f.kind === 'int' ? Math.round(n) : n;
      if (f.min !== undefined && x < f.min) errors.push(`${label} must be at least ${f.min}`);
      if (f.max !== undefined && x > f.max) errors.push(`${label} must be at most ${f.max}`);
      return x;
    }
    case 'bool': return v === true || v === 1 || v === '1' || v === 'true' || v === 'on';
    case 'enum': if (!f.values.includes(String(v))) { errors.push(`${label} must be one of: ${f.values.join(', ')}`); return undefined; } return String(v);
    case 'json': {
      let x = v; if (typeof x === 'string') { try { x = JSON.parse(x); } catch (e) { errors.push(`${label} must be valid JSON`); return undefined; } }
      if (NO_HTML.test(JSON.stringify(x))) errors.push(`${label}: ${HTML_MSG}`);
      return x;
    }
    default: {
      const s = String(v).trim();
      if (f.max && s.length > f.max) errors.push(`${label} is too long (max ${f.max} characters)`);
      if (NO_HTML.test(s)) errors.push(`${label}: ${HTML_MSG}`);
      const rule = RULES[f.kind]; if (rule) { const r = rule(s); if (r !== true) errors.push(`${label}: ${r}`); }
      return s;
    }
  }
}

function validate(type, input, { partial = false } = {}) {
  const errors = [], out = {}, src = input || {};
  for (const f of type.fields) {
    if (partial && !(f.name in src)) continue;
    if (!partial && !(f.name in src) && f.name === 'sortOrder') continue; /* assigned automatically */
    if (!partial && !(f.name in src) && f.name === 'active') { out.active = true; continue; }
    const v = cleanValue(f, src[f.name], errors); if (v !== undefined) out[f.name] = v;
  }
  for (const l of type.lists) {
    if (!(l.name in src)) { if (!partial) out[l.name] = []; continue; }
    let arr = src[l.name]; if (typeof arr === 'string') arr = arr.split('\n').map(s => s.trim()).filter(Boolean);
    if (!Array.isArray(arr)) { errors.push(`${l.label} must be a list`); continue; }
    out[l.name] = arr.map((it, i) => {
      if (l.scalar) return cleanValue({ ...l.scalar, required: true }, it, errors, `${l.label} #${i + 1}`);
      const o = {}; l.fields.forEach(f => { const v = cleanValue(f, (it || {})[f.name], errors, `${l.label} #${i + 1} ${f.label || f.name}`); if (v !== undefined) o[f.name] = v; }); return o;
    });
  }
  for (const o of type.ones) {
    if (!(o.name in src)) { if (!partial) out[o.name] = null; continue; }
    const v = src[o.name];
    if (v === null || v === '' || v === false) { out[o.name] = null; continue; }
    const x = {}; o.fields.forEach(f => { const c = cleanValue(f, v[f.name], errors, `${o.label}: ${f.label || f.name}`); if (c !== undefined) x[f.name] = c; }); out[o.name] = x;
  }
  if (errors.length) throw badRequest(errors.slice(0, 8).join('; '), { fields: errors });
  return out;
}

/* metadata for the admin editor */
const describe = t => ({
  key: t.key, label: t.label, group: t.group, title: t.title,
  fields: t.fields.map(({ col, ...f }) => f),
  lists: t.lists.map(l => ({ name: l.name, label: l.label, scalar: l.scalar ? (({ col, ...f }) => f)(l.scalar) : null, fields: l.fields ? l.fields.map(({ col, ...f }) => f) : null })),
  ones: t.ones.map(o => ({ name: o.name, label: o.label, fields: o.fields.map(({ col, ...f }) => f) })),
});

module.exports = { validate, describe };
