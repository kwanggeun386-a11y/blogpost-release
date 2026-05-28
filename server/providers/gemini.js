const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Google Gemini API 호출
 * @param {string} prompt
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<string>}
 */
async function generate(prompt, apiKey, model) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({
    model: model || "gemini-3.5-flash",
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  });
  const result = await m.generateContent(prompt);
  return result.response.text();
}

const MODELS = [
  { value: "gemini-3.5-flash",        label: "Gemini 3.5 Flash (추천 / 최신 안정)" },
  { value: "gemini-3.1-pro-preview",  label: "Gemini 3.1 Pro Preview (고성능)" },
  { value: "gemini-3-flash-preview",  label: "Gemini 3 Flash Preview" },
  { value: "gemini-3.1-flash-lite",   label: "Gemini 3.1 Flash-Lite" },
  { value: "gemini-flash-latest",     label: "Gemini Flash Latest (자동 최신)" },
  { value: "gemini-pro-latest",       label: "Gemini Pro Latest (자동 최신)" },
  { value: "gemini-2.5-flash",        label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-flash-lite",   label: "Gemini 2.5 Flash-Lite" },
  { value: "gemini-2.5-pro",          label: "Gemini 2.5 Pro" },
  { value: "custom",                  label: "직접 입력" },
];

module.exports = { generate, MODELS };
