/* Typed application errors → HTTP responses in the error middleware. */
class AppError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.expose = true; if (extra) this.extra = extra; }
}
const badRequest = (msg, extra) => new AppError(400, msg, extra);
const unauthorized = msg => new AppError(401, msg || 'Please log in again.');
const forbidden = msg => new AppError(403, msg || 'Not allowed.');
const notFound = msg => new AppError(404, msg || 'Not found.');
const conflict = msg => new AppError(409, msg);
const tooMany = msg => new AppError(429, msg || 'Too many requests. Please try again shortly.');

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict, tooMany };
