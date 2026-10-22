/* Private file storage for uploads (payment proofs, partner photos / ID documents).
   Files live under DATA_DIR/uploads — outside the web root — and are served only through checked endpoints. */
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { badRequest } = require('../utils/errors');

const ROOT = path.join(config.dataDir, 'uploads');
const AREAS = { partners: path.join(ROOT, 'partners'), payments: path.join(ROOT, 'payments') };
const SAFE = /^[A-Za-z0-9_-]+$/;

const dirOf = (area, owner) => { if (!SAFE.test(String(owner))) throw badRequest('Invalid reference.'); return path.join(AREAS[area], String(owner)); };

/* data:URI → Buffer + extension (only the allowed types) */
function decodeDataUri(uri, { pdf = false, maxBytes = 3e6, typeError, sizeError }) {
  const re = pdf ? /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/ : /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
  const m = re.exec(String(uri || ''));
  if (!m) throw badRequest(typeError);
  const b64 = pdf ? m[3] : m[2], kind = pdf ? m[2] : m[1];
  const buf = Buffer.from(b64, 'base64');
  if (buf.length > maxBytes) throw badRequest(sizeError);
  return { buf, ext: kind ? (kind === 'jpeg' ? 'jpg' : kind) : 'pdf' };
}

const FileStorage = {
  decodeDataUri,
  save(area, owner, file, buf) { const d = dirOf(area, owner); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, file), buf, { mode: 0o600 }); },
  pathOf(area, owner, file) { if (!/^[A-Za-z0-9_.-]+$/.test(String(file))) throw badRequest('Invalid file.'); return path.join(dirOf(area, owner), file); },
  remove(area, owner, file) { try { fs.unlinkSync(this.pathOf(area, owner, file)); } catch (e) { /* already gone */ } },
};

module.exports = FileStorage;
