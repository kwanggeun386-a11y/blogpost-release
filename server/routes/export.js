const express = require("express");
const router  = express.Router();
const db      = require("../db");

function sanitizeFilename(name) {
  return (name || "blog-post")
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim()
    .substring(0, 100);
}

// GET /api/export/:postId/markdown
router.get("/:postId/markdown", (req, res) => {
  db.get("SELECT * FROM posts WHERE id = ?", [req.params.postId], (err, post) => {
    if (err)   return res.status(500).json({ error: err.message });
    if (!post) return res.status(404).json({ error: "글을 찾을 수 없습니다." });

    db.all(
      "SELECT * FROM paragraphs WHERE post_id = ? ORDER BY order_index ASC",
      [req.params.postId],
      (err2, paragraphs) => {
        if (err2) return res.status(500).json({ error: err2.message });

        let subKw = post.sub_keywords || "";
        try {
          const p = JSON.parse(post.sub_keywords);
          if (Array.isArray(p)) subKw = p.join(", ");
        } catch (_) {}

        let md = `# ${post.title || post.topic}\n\n`;
        md += `## 기본 정보\n\n| 항목 | 내용 |\n|------|------|\n`;
        md += `| 블로그 종류 | ${post.type || ""} |\n`;
        md += `| 대표 키워드 | ${post.main_keyword || ""} |\n`;
        md += `| 보조 키워드 | ${subKw} |\n`;
        md += `| 대상 독자 | ${post.target_reader || ""} |\n`;
        md += `| 글 목적 | ${post.goal || ""} |\n`;
        md += `| 글쓰기 스타일 | ${post.style || ""} |\n`;
        md += `| 목표 글자 수 | ${post.target_length || 2000}자 |\n\n`;

        md += `## 본문\n\n`;
        (paragraphs || []).forEach((p) => {
          md += `### ${p.title || p.role}\n\n`;
          md += p.content?.trim()
            ? `${p.content.trim()}\n\n`
            : `> *(이 문단은 아직 작성되지 않았습니다.)*\n\n`;
        });

        let analysis = null;
        try { analysis = post.overall_analysis_json ? JSON.parse(post.overall_analysis_json) : null; } catch (_) {}
        if (analysis?.imageSuggestions?.length) {
          md += `## 이미지 추천\n\n`;
          analysis.imageSuggestions.forEach((i) => { md += `- **${i.position}**: ${i.purpose}\n`; });
          md += "\n";
        }
        if (analysis?.publishingChecklist?.length) {
          md += `## 발행 전 체크리스트\n\n`;
          analysis.publishingChecklist.forEach((i) => { md += `- [ ] ${i}\n`; });
          md += "\n";
        }

        md += `---\n*블로그 팩토리로 작성됨 | ${new Date().toLocaleDateString("ko-KR")}*\n`;

        const filename = sanitizeFilename(post.title || post.topic) + ".md";
        res.setHeader("Content-Type", "text/markdown; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.send(md);
      }
    );
  });
});

module.exports = router;
