/**
 * Anthropic Claude API 호출
 * @param {string} prompt
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<string>}
 */
async function generate(prompt, apiKey, model) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const message = data.error?.message || JSON.stringify(data);
    throw new Error(`Claude 응답 오류 (${resp.status}): ${message}`);
  }

  const text = (data.content || [])
    .filter((item) => item.type === "text" && item.text)
    .map((item) => item.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("Claude 응답이 비어 있습니다.");
  return text;
}

// 2026-05 기준 Anthropic 공식 문서 확인된 현재 유효 모델만 포함
// claude-3.x / claude-3.5 / claude-3.7 / claude-opus-4-1 계열은 모두 폐기(retired)됨
const MODELS = [
  { value: "claude-opus-4-7",           label: "Claude Opus 4.7 (최신 / 고성능)" },
  { value: "claude-sonnet-4-6",         label: "Claude Sonnet 4.6 (추천)" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (빠름)" },
  { value: "custom",                    label: "직접 입력" },
];

module.exports = { generate, MODELS };
