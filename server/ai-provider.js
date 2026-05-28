const { getRuntimeSettings } = require("./secure-settings");

/**
 * 선택된 AI 제공자로 콘텐츠 생성
 * @param {string} prompt
 * @param {boolean} expectJson
 * @returns {{ success: boolean, data: any, raw: string, error?: string }}
 */
async function generateContent(prompt, expectJson = true) {
  let settings = {};
  try {
    settings = getRuntimeSettings();
  } catch (err) {
    return { success: false, error: err.message, raw: "" };
  }
  const provider  = settings.provider  || "";
  const model     = settings.model     || "";
  const apiKeys   = settings.apiKeys   || {};
  const apiKey    = apiKeys[provider]  || "";
  const ollamaUrl = settings.ollamaUrl || "http://localhost:11434";

  // 설정 미완료
  if (!provider) {
    return {
      success: false,
      error: "AI 제공자가 설정되지 않았습니다. 우측 상단 ⚙ 설정에서 AI를 선택해 주세요.",
      raw: "",
    };
  }

  if (provider !== "ollama" && !apiKey) {
    return {
      success: false,
      error: `API 키가 등록되지 않았습니다. ⚙ 설정에서 ${providerName(provider)} API 키를 입력해 주세요.`,
      raw: "",
    };
  }

  let text = "";
  try {
    switch (provider) {
      case "gemini": {
        const { generate } = require("./providers/gemini");
        text = await generate(prompt, apiKey, model);
        break;
      }
      case "openai": {
        const { generate } = require("./providers/openai");
        text = await generate(prompt, apiKey, model);
        break;
      }
      case "claude": {
        const { generate } = require("./providers/claude");
        text = await generate(prompt, apiKey, model);
        break;
      }
      case "ollama": {
        const { generate } = require("./providers/ollama");
        text = await generate(prompt, null, model, ollamaUrl);
        break;
      }
      default:
        return { success: false, error: `알 수 없는 AI 제공자: ${provider}`, raw: "" };
    }
  } catch (err) {
    const msg = err.message || "AI 호출 중 오류가 발생했습니다.";
    console.error(`[${provider}] AI 오류:`, msg);
    return { success: false, error: msg, raw: "" };
  }

  if (!text || text.trim() === "") {
    return { success: false, error: "AI 응답이 비어 있습니다.", raw: "" };
  }

  if (expectJson) {
    try {
      const cleaned = text
        .replace(/^```json\s*/m, "")
        .replace(/^```\s*/m, "")
        .replace(/\s*```$/m, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      return { success: true, data: parsed, raw: text };
    } catch (_) {
      return {
        success: false,
        error: "AI 응답을 JSON으로 파싱하는 데 실패했습니다. 다시 시도해 주세요.",
        raw: text,
      };
    }
  }

  return { success: true, data: text, raw: text };
}

function providerName(p) {
  const names = {
    gemini: "Google Gemini",
    openai: "OpenAI",
    claude: "Anthropic Claude",
    ollama: "Ollama",
  };
  return names[p] || p;
}

/**
 * 모든 제공자의 모델 목록 반환
 */
function getProviderModels() {
  return {
    gemini: require("./providers/gemini").MODELS,
    openai: require("./providers/openai").MODELS,
    claude: require("./providers/claude").MODELS,
    ollama: require("./providers/ollama").MODELS,
  };
}

module.exports = { generateContent, getProviderModels };
