function extractResponsesText(data) {
  if (data.output_text) return data.output_text;

  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

/**
 * OpenAI API 호출
 * @param {string} prompt
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<string>}
 */
async function generate(prompt, apiKey, model) {
  const selectedModel = model || "gpt-5.4-mini";
  const isReasoningFamily = /^(gpt-5|o[134])/.test(selectedModel);

  if (isReasoningFamily) {
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        input: prompt,
        max_output_tokens: 8192,
      }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const message = data.error?.message || JSON.stringify(data);
      throw new Error(`OpenAI 응답 오류 (${resp.status}): ${message}`);
    }

    const text = extractResponsesText(data);
    if (!text) throw new Error("OpenAI 응답이 비어 있습니다.");
    return text;
  }

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const message = data.error?.message || JSON.stringify(data);
    throw new Error(`OpenAI 응답 오류 (${resp.status}): ${message}`);
  }

  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI 응답이 비어 있습니다.");
  return text;
}

const MODELS = [
  { value: "gpt-5.5",          label: "GPT-5.5 (최신 / 고성능)" },
  { value: "gpt-5.4",          label: "GPT-5.4" },
  { value: "gpt-5.4-mini",     label: "GPT-5.4 Mini (추천)" },
  { value: "gpt-5.4-nano",     label: "GPT-5.4 Nano (저비용)" },
  { value: "gpt-5.2",          label: "GPT-5.2" },
  { value: "gpt-5.2-pro",      label: "GPT-5.2 Pro" },
  { value: "gpt-5.2-chat-latest", label: "GPT-5.2 Chat Latest" },
  { value: "gpt-5.1",          label: "GPT-5.1" },
  { value: "gpt-5",            label: "GPT-5" },
  { value: "gpt-5-mini",       label: "GPT-5 Mini" },
  { value: "gpt-5-nano",       label: "GPT-5 Nano" },
  { value: "gpt-4.1",          label: "GPT-4.1" },
  { value: "gpt-4.1-mini",     label: "GPT-4.1 Mini" },
  { value: "gpt-4.1-nano",     label: "GPT-4.1 Nano" },
  { value: "gpt-4o",           label: "GPT-4o (레거시)" },
  { value: "gpt-4o-mini",      label: "GPT-4o Mini (레거시)" },
  { value: "custom",           label: "직접 입력" },
];

module.exports = { generate, MODELS };
