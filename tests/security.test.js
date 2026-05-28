const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isAllowedHost,
  isAllowedOrigin,
  isLocalAddress,
} = require("../server/security");

test("local hosts are accepted", () => {
  assert.equal(isAllowedHost("localhost:3001"), true);
  assert.equal(isAllowedHost("127.0.0.1:3001"), true);
  assert.equal(isAllowedHost("[::1]:3001"), true);
});

test("non-local hosts are rejected", () => {
  assert.equal(isAllowedHost("example.com"), false);
  assert.equal(isAllowedHost("192.168.0.10:3001"), false);
});

test("browser origins are limited to localhost-style origins", () => {
  assert.equal(isAllowedOrigin("http://localhost:5173"), true);
  assert.equal(isAllowedOrigin("http://127.0.0.1:3001"), true);
  assert.equal(isAllowedOrigin("https://evil.example"), false);
});

test("remote addresses are limited to loopback", () => {
  assert.equal(isLocalAddress("127.0.0.1"), true);
  assert.equal(isLocalAddress("::1"), true);
  assert.equal(isLocalAddress("::ffff:127.0.0.1"), true);
  assert.equal(isLocalAddress("10.0.0.5"), false);
});
