const express = require("express");
const router  = express.Router();
const db      = require("../db");

function now() { return new Date().toISOString(); }

// PUT /api/paragraphs/:id
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const allowed = ["role","title","guide","content","analysis_json","score","status","order_index"];
  const updates = [], values = [];
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
  });
  if (!updates.length) return res.json({ message: "변경 없음" });
  updates.push("updated_at = ?");
  values.push(now(), id);
  db.run(`UPDATE paragraphs SET ${updates.join(", ")} WHERE id = ?`, values, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get("SELECT * FROM paragraphs WHERE id = ?", [id], (e, row) => {
      if (e)    return res.status(500).json({ error: e.message });
      if (!row) return res.status(404).json({ error: "문단을 찾을 수 없습니다." });
      db.run("UPDATE posts SET updated_at = ? WHERE id = ?", [now(), row.post_id]);
      res.json(row);
    });
  });
});

// DELETE /api/paragraphs/:id
router.delete("/:id", (req, res) => {
  db.get("SELECT * FROM paragraphs WHERE id = ?", [req.params.id], (err, row) => {
    if (err)   return res.status(500).json({ error: err.message });
    if (!row)  return res.status(404).json({ error: "문단을 찾을 수 없습니다." });
    db.run("DELETE FROM paragraphs WHERE id = ?", [req.params.id], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      db.run("UPDATE posts SET updated_at = ? WHERE id = ?", [now(), row.post_id]);
      res.json({ message: "삭제 완료", id: parseInt(req.params.id) });
    });
  });
});

module.exports = router;
