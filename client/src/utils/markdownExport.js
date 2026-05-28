/**
 * Markdown 내보내기 유틸리티
 * 실제 파일 다운로드는 서버 API (GET /api/export/:postId/markdown)를 사용
 * 이 파일은 클라이언트 측 미리보기용
 */

import { sanitizeFilename } from "./textStats.js";

/**
 * 글 데이터를 Markdown 문자열로 변환 (미리보기용)
 */
export function generateMarkdown(post, paragraphs) {
  let subKw = post.sub_keywords || "";
  try {
    const parsed = JSON.parse(post.sub_keywords);
    if (Array.isArray(parsed)) subKw = parsed.join(", ");
  } catch (_) {}

  let md = "";

  md += `# ${post.title || post.topic}\n\n`;

  md += `## 기본 정보\n\n`;
  md += `| 항목 | 내용 |\n|------|------|\n`;
  md += `| 블로그 종류 | ${post.type || ""} |\n`;
  md += `| 대표 키워드 | ${post.main_keyword || ""} |\n`;
  md += `| 보조 키워드 | ${subKw} |\n`;
  md += `| 대상 독자 | ${post.target_reader || ""} |\n`;
  md += `| 글 목적 | ${post.goal || ""} |\n`;
  md += `| 글쓰기 스타일 | ${post.style || ""} |\n\n`;

  md += `## 본문\n\n`;
  (paragraphs || []).forEach((p) => {
    md += `### ${p.title || p.role}\n\n`;
    if (p.content && p.content.trim()) {
      md += `${p.content.trim()}\n\n`;
    } else {
      md += `> *(이 문단은 아직 작성되지 않았습니다.)*\n\n`;
    }
  });

  md += `---\n*블로그 팩토리로 작성됨*\n`;

  return { markdown: md, filename: sanitizeFilename(post.title || post.topic) + ".md" };
}
