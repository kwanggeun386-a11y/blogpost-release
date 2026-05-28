const express = require("express");
const router  = express.Router();
const { generateContent } = require("../ai-provider");
const db = require("../db");

function saveLog(postId, paragraphId, type, prompt, response) {
  const fs   = require("fs");
  const path = require("path");
  const settingsPath = path.join(__dirname, "..", "data", "settings.json");
  let provider = "", model = "";
  try {
    const s = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    provider = s.provider || "";
    model    = s.model    || "";
  } catch (_) {}

  db.run(
    `INSERT INTO ai_logs (post_id,paragraph_id,request_type,prompt,response,provider,model,created_at)
     VALUES (?,?,?,?,?,?,?,datetime('now','localtime'))`,
    [postId||null, paragraphId||null, type, prompt, response, provider, model]
  );
}

// ─── POST /api/ai/setup-helper ────────────────────────────────────────
router.post("/setup-helper", async (req, res) => {
  const { topic, core_message, type } = req.body;
  if (!topic) return res.status(400).json({ error: "topic이 필요합니다." });

  const prompt = `당신은 한국어 블로그 SEO 전문가입니다.
아래 정보를 바탕으로 블로그 글 작성에 필요한 기본 정보를 추천해 주세요.

블로그 종류: ${type || "정보성"}
주제: ${topic}
핵심 내용: ${core_message || "(미입력)"}

아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
{
  "refined_topic": "구체화된 주제 (한 문장)",
  "main_keywords": ["대표 키워드1", "대표 키워드2", "대표 키워드3"],
  "sub_keywords": ["보조 키워드1", "보조 키워드2", "보조 키워드3", "보조 키워드4"],
  "target_readers": ["대상 독자1", "대상 독자2"],
  "search_intent": "이 글을 검색하는 독자의 의도 (1-2문장)",
  "goals": ["글 목적1", "글 목적2"],
  "must_include": ["반드시 포함할 내용1", "반드시 포함할 내용2", "반드시 포함할 내용3"],
  "avoid": ["피해야 할 표현 또는 내용1", "피해야 할 표현 또는 내용2"]
}`;

  const result = await generateContent(prompt, true);
  if (result.success) saveLog(null, null, "setup-helper", prompt, result.raw);
  res.json(result);
});

// ─── POST /api/ai/briefing ────────────────────────────────────────────
router.post("/briefing", async (req, res) => {
  const { post } = req.body;
  if (!post) return res.status(400).json({ error: "post 데이터가 필요합니다." });

  const prompt = `당신은 전문 블로그 콘텐츠 코치입니다.
아래 글 정보를 바탕으로 작성 전 브리핑을 작성해 주세요.

블로그 종류: ${post.type}
주제: ${post.topic}
핵심 내용: ${post.core_message || "(없음)"}
대표 키워드: ${post.main_keyword}
보조 키워드: ${post.sub_keywords}
대상 독자: ${post.target_reader}
글 목적: ${post.goal}
글쓰기 스타일: ${post.style}
목표 글자 수: ${post.target_length}자
상품/서비스 정보: ${post.product_info || "(없음)"}
반드시 포함할 내용: ${post.must_include || "(없음)"}
제외할 표현: ${post.exclude_phrases || "(없음)"}

아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
{
  "core_direction": "이 글의 핵심 방향 (2-3문장)",
  "reader_questions": ["독자가 궁금해할 질문1", "독자가 궁금해할 질문2", "독자가 궁금해할 질문3"],
  "must_cover": ["반드시 포함해야 할 내용1", "반드시 포함해야 할 내용2", "반드시 포함해야 할 내용3"],
  "can_omit": ["빼도 되는 내용1", "빼도 되는 내용2"],
  "caution_expressions": ["주의해야 할 표현1", "주의해야 할 표현2"],
  "recommended_flow": ["추천 글 흐름 단계1", "추천 글 흐름 단계2", "추천 글 흐름 단계3", "추천 글 흐름 단계4"],
  "good_examples": ["넣으면 좋은 예시1", "넣으면 좋은 예시2"],
  "image_positions": [
    { "position": "이미지 삽입 위치", "purpose": "이미지 목적" }
  ]
}`;

  const result = await generateContent(prompt, true);
  if (result.success) saveLog(post.id, null, "briefing", prompt, result.raw);
  res.json(result);
});

// ─── POST /api/ai/outline ─────────────────────────────────────────────
router.post("/outline", async (req, res) => {
  const { post } = req.body;
  if (!post) return res.status(400).json({ error: "post 데이터가 필요합니다." });

  const styleDesc = {
    "전문가": "해요체, 정보성, 논리적, 실용적, 전문적",
    "쉬운 설명": "초보자용, 쉽게 풀어서, 예시 중심, 친절함",
    "솔직한 후기": "경험담, 자연스러움, 구어체, 리뷰형",
    "위트 있는 전문가": "전문성 유지, 가벼운 유머, 정보성, 친근함",
    "귀엽고 친근한 블로거": "친근함, 쉬운 표현, 감성적, 부드러움",
    "분석가": "객관적, 비교 중심, 근거 중심, 논리적",
  };
  const defaultStructures = {
    "정보성": "도입 → 문제 공감 → 핵심 개념 → 해결 방법 → 주의사항 → 마무리",
    "홍보": "도입 → 필요성 강조 → 상품/서비스 소개 → 장점 설명 → 사용 사례 → CTA",
    "리뷰": "사용 계기 → 첫인상 → 장점 → 아쉬운 점 → 누구에게 맞는지 → 총평",
  };
  const validRoles = [
    "도입","문제 공감","상황 설명","핵심 개념","원인 분석",
    "해결 방법","실무 팁","예시","비교","주의사항",
    "체크리스트","후기/경험","요약","마무리","CTA",
  ];

  const prompt = `당신은 블로그 콘텐츠 전략가입니다.
아래 정보를 바탕으로 블로그 글의 문단 구조를 생성해 주세요.

블로그 종류: ${post.type}
주제: ${post.topic}
핵심 내용: ${post.core_message || "(없음)"}
대표 키워드: ${post.main_keyword}
보조 키워드: ${post.sub_keywords}
대상 독자: ${post.target_reader}
글 목적: ${post.goal}
글쓰기 스타일: ${post.style} (${styleDesc[post.style] || ""})
목표 글자 수: ${post.target_length}자
반드시 포함할 내용: ${post.must_include || "(없음)"}

기본 구조 참고: ${defaultStructures[post.type] || defaultStructures["정보성"]}
문단 역할 선택지: ${validRoles.join(", ")}

아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
[
  {
    "order_index": 0,
    "role": "문단 역할 (위 역할 선택지 중 하나)",
    "title": "문단 제목 (독자에게 보여지는 소제목)",
    "guide": "작성 가이드\\n• 이 문단에서 써야 할 내용 안내 (3-5항목)\\n• AI가 대신 쓰지 않고 방향만 안내"
  }
]`;

  const result = await generateContent(prompt, true);
  if (result.success) saveLog(post.id, null, "outline", prompt, result.raw);
  res.json(result);
});

// ─── POST /api/ai/paragraph-guide ────────────────────────────────────
router.post("/paragraph-guide", async (req, res) => {
  const { post, paragraph, previousParagraph, nextParagraph } = req.body;
  if (!post || !paragraph) return res.status(400).json({ error: "post, paragraph 필요" });

  const prompt = `당신은 블로그 글쓰기 코치입니다.
아래 문단에 대한 구체적인 작성 가이드를 제공해 주세요.
AI가 본문을 대신 써주지 않고, 사용자가 직접 쓸 수 있도록 방향만 안내하세요.

글 정보:
- 주제: ${post.topic}
- 대표 키워드: ${post.main_keyword}
- 보조 키워드: ${post.sub_keywords}
- 대상 독자: ${post.target_reader}
- 글쓰기 스타일: ${post.style}

현재 문단:
- 역할: ${paragraph.role}
- 제목: ${paragraph.title}
${previousParagraph ? `이전 문단: [${previousParagraph.role}] ${previousParagraph.title}` : ""}
${nextParagraph     ? `다음 문단: [${nextParagraph.role}] ${nextParagraph.title}` : ""}

아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
{
  "guide": "작성 가이드 (3-5개 항목을 '• ' 불릿과 줄바꿈으로 구분)",
  "tips": ["추가 팁1", "추가 팁2"],
  "keyword_advice": "이 문단에서 키워드를 자연스럽게 활용하는 방법"
}`;

  const result = await generateContent(prompt, true);
  if (result.success) saveLog(post.id, paragraph.id, "paragraph-guide", prompt, result.raw);
  res.json(result);
});

// ─── POST /api/ai/draft-paragraph ────────────────────────────────────
router.post("/draft-paragraph", async (req, res) => {
  const { post, paragraph, previousParagraph, nextParagraph } = req.body;
  if (!post || !paragraph) return res.status(400).json({ error: "post, paragraph 필요" });

  const previousText = previousParagraph?.content
    ? previousParagraph.content.substring(0, 600)
    : "";
  const nextInfo = nextParagraph
    ? `[${nextParagraph.role}] ${nextParagraph.title || ""}`
    : "";

  const prompt = `당신은 한국어 블로그 초안 작성 도우미입니다.
사용자가 직접 수정할 수 있는 "문단 초안"을 작성해 주세요.
전체 글을 완성하지 말고, 아래 현재 문단 하나만 작성하세요.

중요 원칙:
- 문단 하나의 초안만 작성합니다.
- 과장 광고, 허위 단정, 출처 없는 수치는 피합니다.
- 사용자가 그대로 발행하기보다 다듬어 쓸 수 있는 자연스러운 초안으로 씁니다.
- 선택한 글쓰기 스타일을 반영하되, 너무 과장하지 않습니다.
- 대표 키워드는 가능하면 자연스럽게 1회 포함합니다.
- 보조 키워드는 억지로 넣지 말고 자연스러울 때만 포함합니다.
- 작성 가이드가 있으면 반드시 반영합니다.

글 정보:
- 블로그 종류: ${post.type}
- 주제: ${post.topic}
- 핵심 내용: ${post.core_message || "(없음)"}
- 대표 키워드: ${post.main_keyword || "(없음)"}
- 보조 키워드: ${post.sub_keywords || "(없음)"}
- 대상 독자: ${post.target_reader || "(없음)"}
- 글 목적: ${post.goal || "(없음)"}
- 글쓰기 스타일: ${post.style || "전문가"}
- 상품/서비스 정보: ${post.product_info || "(없음)"}
- 반드시 포함할 내용: ${post.must_include || "(없음)"}
- 제외할 표현: ${post.exclude_phrases || "(없음)"}

현재 문단:
- 역할: ${paragraph.role}
- 제목: ${paragraph.title || "(제목 없음)"}
- 작성 가이드:
${paragraph.guide || "(없음)"}

흐름 참고:
${previousText ? `이전 문단 내용 일부:\n"""${previousText}"""` : "이전 문단 없음"}
${nextInfo ? `다음 문단: ${nextInfo}` : "다음 문단 없음"}

아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
{
  "draft": "현재 문단에 들어갈 초안 본문. 줄바꿈은 자연스럽게 사용. 500-900자 내외.",
  "intent": "이 초안이 문단 역할에서 담당하는 목적을 1문장으로 설명",
  "usedKeywords": ["자연스럽게 반영한 키워드"],
  "userEditNotes": ["사용자가 직접 확인하고 고치면 좋은 점1", "사용자가 직접 확인하고 고치면 좋은 점2"]
}`;

  const result = await generateContent(prompt, true);
  if (result.success) saveLog(post.id, paragraph.id, "draft-paragraph", prompt, result.raw);
  res.json(result);
});

// ─── POST /api/ai/analyze-paragraph ──────────────────────────────────
router.post("/analyze-paragraph", async (req, res) => {
  const { post, paragraph, previousParagraph, nextParagraph } = req.body;
  if (!post || !paragraph) return res.status(400).json({ error: "post, paragraph 필요" });
  if (!paragraph.content || paragraph.content.trim().length < 10) {
    return res.status(400).json({ error: "분석할 내용이 너무 짧습니다." });
  }

  const styleCriteria = {
    "전문가": "논리성, 근거, 전문성, 실무성, 신뢰도 중심 분석",
    "쉬운 설명": "어려운 표현, 문장 길이, 초보자 이해도, 예시 부족 중심 분석",
    "솔직한 후기": "경험담 진정성, 구어체 적절성, 자연스러움, 공감 요소 중심 분석",
    "위트 있는 전문가": "전문성과 유머 균형, 정보 정확성, 친근감 중심 분석",
    "귀엽고 친근한 블로거": "친근감, 부드러움, 감성적 요소, 독자 친화성 중심 분석",
    "분석가": "객관성, 비교 공정성, 근거 타당성, 논리 구조 중심 분석",
  };
  const subKwList = post.sub_keywords
    ? post.sub_keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [];

  const prompt = `당신은 한국어 블로그 글쓰기 전문 편집자입니다.
아래 블로그 문단을 분석해 주세요.

글 정보:
- 주제: ${post.topic}
- 대표 키워드: ${post.main_keyword}
- 보조 키워드: ${subKwList.join(", ")}
- 대상 독자: ${post.target_reader}
- 글쓰기 스타일: ${post.style}
- 분석 기준: ${styleCriteria[post.style] || "전반적인 글 품질"}

문단 정보:
- 역할: ${paragraph.role}
- 제목: ${paragraph.title}
${previousParagraph?.content ? `이전 문단 일부: "${previousParagraph.content.substring(0,100)}..."` : ""}
${nextParagraph ? `다음 문단 역할: ${nextParagraph.role}` : ""}

분석할 문단 내용:
"""
${paragraph.content}
"""

아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
{
  "score": 0에서 100 사이 정수,
  "roleFit": "'${paragraph.role}' 역할 적합도 평가 (1-2문장)",
  "strengths": ["잘된 점1", "잘된 점2"],
  "weaknesses": ["아쉬운 점1", "아쉬운 점2"],
  "typos": [{ "original": "오탈자", "suggested": "수정안", "reason": "이유" }],
  "awkwardExpressions": [{ "original": "어색한 표현", "suggested": "개선 표현", "reason": "이유" }],
  "repeatedWords": [{ "word": "반복 단어", "count": 횟수, "comment": "설명" }],
  "keywordCheck": {
    "mainKeywordIncluded": true,
    "subKeywordsIncluded": ["포함된 보조 키워드"],
    "missingSubKeywords": ["누락된 보조 키워드"],
    "keywordNaturalness": "자연스러움 평가 (1문장)"
  },
  "readerFriction": ["독자 불편 요소"],
  "flow": "이전/다음 문단과의 연결성 (1-2문장)",
  "suggestions": ["보완 제안1", "보완 제안2", "보완 제안3"],
  "rewriteExample": "가장 아쉬운 문장의 수정 예시 (1-2문장)"
}`;

  const result = await generateContent(prompt, true);
  if (result.success) saveLog(post.id, paragraph.id, "analyze-paragraph", prompt, result.raw);
  res.json(result);
});

// ─── POST /api/ai/analyze-post ────────────────────────────────────────
router.post("/analyze-post", async (req, res) => {
  const { post, paragraphs } = req.body;
  if (!post || !Array.isArray(paragraphs)) return res.status(400).json({ error: "post, paragraphs 필요" });
  if (!paragraphs.some((p) => p.content?.trim().length > 0)) {
    return res.status(400).json({ error: "작성된 문단이 없습니다." });
  }

  const fullContent = paragraphs
    .map((p) => `[${p.role}] ${p.title}\n${p.content || "(미작성)"}`)
    .join("\n\n---\n\n");

  const prompt = `당신은 한국어 블로그 콘텐츠 전문 편집장입니다.
아래 블로그 글 전체를 분석해 주세요.

글 정보:
- 제목: ${post.title || post.topic}
- 블로그 종류: ${post.type}
- 주제: ${post.topic}
- 대표 키워드: ${post.main_keyword}
- 보조 키워드: ${post.sub_keywords}
- 대상 독자: ${post.target_reader}
- 글쓰기 스타일: ${post.style}
- 목표 글자 수: ${post.target_length}자

전체 글 내용:
"""
${fullContent}
"""

아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
{
  "score": 0에서 100 사이 정수,
  "flow": "글 전체 흐름 평가 (2-3문장)",
  "paragraphOrder": "문단 순서 적절성 (1-2문장)",
  "duplicatedContent": ["중복 내용 설명"],
  "missingContent": ["빠진 내용 설명"],
  "keywordDistribution": {
    "mainKeyword": "${post.main_keyword}",
    "count": 키워드 등장 횟수,
    "comment": "분포 및 자연스러움 평가"
  },
  "titleBodyMatch": "제목과 본문 일치도 평가",
  "readerDropRisk": ["독자 이탈 위험 구간"],
  "imageSuggestions": [{ "position": "삽입 위치", "purpose": "목적" }],
  "publishingChecklist": ["체크항목1", "체크항목2", "체크항목3", "체크항목4"]
}`;

  const result = await generateContent(prompt, true);
  if (result.success) saveLog(post.id, null, "analyze-post", prompt, result.raw);
  res.json(result);
});

module.exports = router;
