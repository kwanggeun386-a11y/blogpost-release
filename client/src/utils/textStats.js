/**
 * 텍스트 통계 유틸리티 (로컬 체크, AI 불필요)
 * Windows 호환 — 브라우저에서만 실행
 */

// 형태소 분석 없이 단순 빈도 계산 (초기 MVP)
// 조사, 접속사, 일반적인 단어 제외 목록
const STOP_WORDS = new Set([
  "이", "가", "을", "를", "은", "는", "의", "에", "와", "과", "로", "으로",
  "에서", "에게", "이나", "이라", "이고", "이며", "이면", "이라면",
  "그", "그리고", "하지만", "또한", "때문에", "그래서", "하지만", "그러나",
  "않다", "있다", "없다", "하다", "되다", "이다", "아니다", "같다",
  "있는", "없는", "하는", "되는", "인", "한", "할", "된", "하고",
  "수", "것", "때", "더", "이", "저", "그", "어", "나", "우리",
  "모든", "어떤", "이런", "저런", "그런", "또", "및", "등", "즉",
  "위해", "통해", "따라", "대해", "관해", "대한", "관한",
]);

/**
 * 텍스트에서 단어 빈도를 계산
 * @param {string} text
 * @param {number} topN - 상위 N개 반환
 * @returns {{ topRepeated: {word: string, count: number}[] }}
 */
export function countWords(text, topN = 5) {
  if (!text || text.trim().length === 0) {
    return { topRepeated: [] };
  }

  // 특수문자 제거, 공백으로 분리
  const words = text
    .replace(/[^\w\s가-힣]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2); // 2글자 이상만

  const freq = {};
  words.forEach((word) => {
    if (!STOP_WORDS.has(word)) {
      freq[word] = (freq[word] || 0) + 1;
    }
  });

  // 빈도 기준 내림차순 정렬, 2회 이상만
  const sorted = Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));

  return { topRepeated: sorted };
}

/**
 * 특정 키워드가 텍스트에 포함되었는지 체크
 * @param {string} text
 * @param {string} keyword
 * @returns {boolean}
 */
export function hasKeyword(text, keyword) {
  if (!text || !keyword) return false;
  return text.toLowerCase().includes(keyword.toLowerCase());
}

/**
 * 키워드 등장 횟수 계산
 * @param {string} text
 * @param {string} keyword
 * @returns {number}
 */
export function countKeyword(text, keyword) {
  if (!text || !keyword) return 0;
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = text.toLowerCase().match(new RegExp(escaped, "g"));
  return matches ? matches.length : 0;
}

/**
 * 공백 제외 글자 수
 */
export function charCountNoSpace(text) {
  return (text || "").replace(/\s/g, "").length;
}

/**
 * Windows 파일명 금지문자 제거
 */
export function sanitizeFilename(name) {
  return (name || "blog-post")
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim()
    .substring(0, 100);
}
