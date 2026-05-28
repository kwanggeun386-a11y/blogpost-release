const crypto = require("crypto");

const SESSION_TOKEN = crypto.randomBytes(32).toString("hex");
const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function normalizeHost(value) {
  const host = String(value || "").toLowerCase();
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end >= 0 ? host.slice(0, end + 1) : host;
  }
  return host.split(":")[0];
}

function isAllowedHost(value) {
  return ALLOWED_HOSTS.has(normalizeHost(value));
}

function isLocalAddress(value) {
  const address = String(value || "");
  return (
    address === "127.0.0.1" ||
    address === "::1" ||
    address === "::ffff:127.0.0.1" ||
    address === "localhost"
  );
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return isAllowedHost(url.hostname);
  } catch (_) {
    return false;
  }
}

function corsOptions(req, callback) {
  const origin = req.get("origin");
  if (!isAllowedOrigin(origin)) {
    return callback(null, { origin: false });
  }
  callback(null, {
    origin: origin || false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-BlogFactory-Session"],
    maxAge: 600,
  });
}

function requireLocalRequest(req, res, next) {
  if (!isAllowedHost(req.hostname) || !isLocalAddress(req.ip)) {
    return res.status(403).json({ error: "Local requests only." });
  }
  next();
}

function sessionRoute(_req, res) {
  res.json({ token: SESSION_TOKEN });
}

function requireSession(req, res, next) {
  const token = req.get("X-BlogFactory-Session") || req.query.session;
  if (token !== SESSION_TOKEN) {
    return res.status(403).json({ error: "Invalid local session." });
  }
  next();
}

module.exports = {
  SESSION_TOKEN,
  corsOptions,
  isAllowedHost,
  isAllowedOrigin,
  isLocalAddress,
  requireLocalRequest,
  requireSession,
  sessionRoute,
};
