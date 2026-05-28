const express = require("express");
const router  = express.Router();
const db      = require("../db");

function now() { return new Date().toISOString(); }

// GET /api/posts
router.get("/", (req, res) => {
  db.all(
    `SELECT p.*,
       (SELECT COUNT(*) FROM paragraphs WHERE post_id = p.id) AS paragraph_count,
       (SELECT AVG(score) FROM paragraphs WHERE post_id = p.id AND score > 0) AS avg_score
     FROM posts p ORDER BY p.updated_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// GET /api/posts/:id
router.get("/:id", (req, res) => {
  db.get("SELECT * FROM posts WHERE id = ?", [req.params.id], (err, post) => {
    if (err)   return res.status(500).json({ error: err.message });
    if (!post) return res.status(404).json({ error: "글을 찾을 수 없습니다." });
    db.all(
      "SELECT * FROM paragraphs WHERE post_id = ? ORDER BY order_index ASC",
      [req.params.id],
      (err2, paragraphs) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ ...post, paragraphs: paragraphs || [] });
      }
    );
  });
});

// POST /api/posts
router.post("/", (req, res) => {
  const {
    title, type, topic, core_message, main_keyword, sub_keywords,
    target_reader, goal, style, target_length,
    product_info, must_include, exclude_phrases,
  } = req.body;
  const ts = now();
  db.run(
    `INSERT INTO posts
       (title,type,topic,core_message,main_keyword,sub_keywords,
        target_reader,goal,style,target_length,
        product_info,must_include,exclude_phrases,
        status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?)`,
    [title||topic, type, topic, core_message, main_keyword, sub_keywords,
     target_reader, goal, style||"전문가", target_length||2000,
     product_info, must_include, exclude_phrases, ts, ts],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM posts WHERE id = ?", [this.lastID], (e, row) => {
        if (e) return res.status(500).json({ error: e.message });
        res.status(201).json(row);
      });
    }
  );
});

// PUT /api/posts/:id
router.put("/:id", (req, res) => {
  const allowed = [
    "title","type","topic","core_message","main_keyword","sub_keywords",
    "target_reader","goal","style","target_length",
    "product_info","must_include","exclude_phrases",
    "briefing_json","overall_analysis_json","status",
  ];
  const updates = [], values = [];
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
  });
  if (!updates.length) return res.json({ message: "변경 없음" });
  updates.push("updated_at = ?");
  values.push(now(), req.params.id);
  db.run(`UPDATE posts SET ${updates.join(", ")} WHERE id = ?`, values, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get("SELECT * FROM posts WHERE id = ?", [req.params.id], (e, row) => {
      if (e)    return res.status(500).json({ error: e.message });
      if (!row) return res.status(404).json({ error: "글을 찾을 수 없습니다." });
      res.json(row);
    });
  });
});

// DELETE /api/posts/:id
router.delete("/:id", (req, res) => {
  db.run("DELETE FROM posts WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "삭제 완료", changes: this.changes });
  });
});

// POST /api/posts/:id/paragraphs
router.post("/:id/paragraphs", (req, res) => {
  const { id } = req.params;
  const { role, title, guide, content, order_index } = req.body;
  const ts = now();
  db.get(
    "SELECT COALESCE(MAX(order_index),-1) AS maxIdx FROM paragraphs WHERE post_id = ?",
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      const idx = order_index !== undefined ? order_index : row.maxIdx + 1;
      db.run(
        `INSERT INTO paragraphs
           (post_id,order_index,role,title,guide,content,status,created_at,updated_at)
         VALUES (?,?,?,?,?,?,'pending',?,?)`,
        [id, idx, role||"도입", title||"", guide||"", content||"", ts, ts],
        function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          db.get("SELECT * FROM paragraphs WHERE id = ?", [this.lastID], (e, p) => {
            if (e) return res.status(500).json({ error: e.message });
            db.run("UPDATE posts SET updated_at = ? WHERE id = ?", [ts, id]);
            res.status(201).json(p);
          });
        }
      );
    }
  );
});

// PUT /api/posts/:id/paragraphs/reorder
router.put("/:id/paragraphs/reorder", (req, res) => {
  const { id } = req.params;
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: "order 배열 필요" });
  const ts   = now();
  const stmt = db.prepare(
    "UPDATE paragraphs SET order_index = ?, updated_at = ? WHERE id = ? AND post_id = ?"
  );
  let error = null;
  order.forEach(({ id: pId, order_index }) => {
    stmt.run([order_index, ts, pId, id], (e) => { if (e) error = e; });
  });
  stmt.finalize((err) => {
    if (err || error) return res.status(500).json({ error: (err||error).message });
    db.run("UPDATE posts SET updated_at = ? WHERE id = ?", [ts, id]);
    db.all(
      "SELECT * FROM paragraphs WHERE post_id = ? ORDER BY order_index ASC",
      [id],
      (e, rows) => {
        if (e) return res.status(500).json({ error: e.message });
        res.json(rows);
      }
    );
  });
});

module.exports = router;
