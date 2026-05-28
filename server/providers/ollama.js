/**
 * Ollama 로컬 AI 호출 (API 키 불필요)
 * https://ollama.com
 * @param {string} prompt
 * @param {string|null} _apiKey  사용 안 함
 * @param {string} model
 * @param {string} baseUrl  기본값: http://localhost:11434
 * @returns {Promise<string>}
 */
async function generate(prompt, _apiKey, model, baseUrl) {
  const url = (baseUrl || "http://localhost:11434") + "/api/generate";

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "llama3.3",
      prompt,
      stream: false,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Ollama 응답 오류 (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  return data.response;
}

const MODELS = [
  { value: "llama3.3",     label: "Llama 3.3 (추천)" },
  { value: "llama3.2",     label: "Llama 3.2" },
  { value: "qwen3",        label: "Qwen 3" },
  { value: "qwen2.5",      label: "Qwen 2.5" },
  { value: "gemma3",       label: "Gemma 3" },
  { value: "gemma2",       label: "Gemma 2" },
  { value: "deepseek-r1",  label: "DeepSeek R1" },
  { value: "mistral",      label: "Mistral" },
  { value: "phi4",         label: "Phi 4" },
  { value: "custom",       label: "직접 입력" },
];

module.exports = { generate, MODELS };
