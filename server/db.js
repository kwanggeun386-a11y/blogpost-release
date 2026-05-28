const sqlite3 = require("sqlite3").verbose();
const { DB_PATH } = require("./paths");

// paths.js에서 DB 경로 가져옴 (pkg 환경 자동 대응, data/ 폴더 생성도 paths.js에서 처리)
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error("❌ SQLite DB 연결 오류:", err.message);
  else     console.log("✅ SQLite DB 연결:", DB_PATH);
});

db.run("PRAGMA foreign_keys = ON");

db.serialize(() => {
  // posts 테이블 (단일 사용자 — user_id 없음)
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      title                TEXT,
      type                 TEXT    DEFAULT '정보성',
      topic                TEXT,
      core_message         TEXT,
      main_keyword         TEXT,
      sub_keywords         TEXT,
      target_reader        TEXT,
      goal                 TEXT,
      style                TEXT    DEFAULT '전문가',
      target_length        INTEGER DEFAULT 2000,
      product_info         TEXT,
      must_include         TEXT,
      exclude_phrases      TEXT,
      briefing_json        TEXT,
      overall_analysis_json TEXT,
      status               TEXT    DEFAULT 'draft',
      created_at           TEXT    DEFAULT (datetime('now','localtime')),
      updated_at           TEXT    DEFAULT (datetime('now','localtime'))
    )
  `, (err) => {
    if (err) console.error("posts 테이블 오류:", err.message);
    else     console.log("✅ posts 테이블 준비");
  });

  // paragraphs 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS paragraphs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id      INTEGER NOT NULL,
      order_index  INTEGER DEFAULT 0,
      role         TEXT    DEFAULT '도입',
      title        TEXT,
      guide        TEXT,
      content      TEXT    DEFAULT '',
      analysis_json TEXT,
      score        INTEGER DEFAULT 0,
      status       TEXT    DEFAULT 'pending',
      created_at   TEXT    DEFAULT (datetime('now','localtime')),
      updated_at   TEXT    DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error("paragraphs 테이블 오류:", err.message);
    else     console.log("✅ paragraphs 테이블 준비");
  });

  // ai_logs 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_logs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id       INTEGER,
      paragraph_id  INTEGER,
      request_type  TEXT,
      prompt        TEXT,
      response      TEXT,
      provider      TEXT,
      model         TEXT,
      created_at    TEXT DEFAULT (datetime('now','localtime'))
    )
  `, (err) => {
    if (err) console.error("ai_logs 테이블 오류:", err.message);
    else     console.log("✅ ai_logs 테이블 준비");
  });
});

module.exports = db;
