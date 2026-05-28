const express = require("express");
const router = express.Router();
const { getProviderModels } = require("../ai-provider");
const {
  loadSettings,
  saveSettings,
  getPublicSettings,
  getApiKey,
  hasApiKey,
  getRegisteredProviders,
  hasMasterPassword,
  setApiKey,
  deleteApiKey,
  unlock,
  lock,
  isLocked,
} = require("../secure-settings");

function modelLabel(provider, value) {
  const models = getProviderModels()[provider] || [];
  return models.find((item) => item.value === value)?.label || value;
}

async function testModel(provider, model, apiKey, ollamaUrl) {
  const testPrompt = '"테스트 성공"이라는 단어만 한국어로 답해주세요. 다른 텍스트는 포함하지 마세요.';
  switch (provider) {
    case "gemini": {
      const { generate } = require("../providers/gemini");
      return generate(testPrompt, apiKey, model);
    }
    case "openai": {
      const { generate } = require("../providers/openai");
      return generate(testPrompt, apiKey, model);
    }
    case "claude": {
      const { generate } = require("../providers/claude");
      return generate(testPrompt, apiKey, model);
    }
    case "ollama": {
      const { generate } = require("../providers/ollama");
      return generate(testPrompt, null, model, ollamaUrl || "http://localhost:11434");
    }
    default:
      throw new Error(`알 수 없는 제공자: ${provider}`);
  }
}

async function verifyModels({ provider, models, defaultModel, apiKey, ollamaUrl }) {
  const uniqueModels = Array.from(new Set((models || []).map((item) => String(item).trim()).filter(Boolean)));
  if (uniqueModels.length === 0) {
    throw new Error("테스트할 모델을 1개 이상 선택해 주세요.");
  }

  const passed = [];
  const failed = [];

  for (const value of uniqueModels) {
    try {
      const text = await testModel(provider, value, apiKey, ollamaUrl);
      passed.push({
        value,
        label: modelLabel(provider, value),
        verifiedAt: new Date().toISOString(),
        sample: String(text || "").trim().substring(0, 80),
      });
    } catch (err) {
      failed.push({
        value,
        label: modelLabel(provider, value),
        error: err.message || "연결 실패",
      });
    }
  }

  if (passed.length === 0) {
    return { passed, failed, defaultModel: "" };
  }

  const selectedDefault = passed.some((item) => item.value === defaultModel)
    ? defaultModel
    : passed[0].value;

  return { passed, failed, defaultModel: selectedDefault };
}

// GET /api/settings — 현재 설정 (API 키는 마스킹해서 반환)
router.get("/", (req, res) => {
  res.json(getPublicSettings());
});

// GET /api/settings/models — 제공자별 모델 목록
router.get("/models", (req, res) => {
  res.json(getProviderModels());
});

// GET /api/settings/status — AI 설정 완료 여부
router.get("/status", (req, res) => {
  const s = loadSettings();
  const provider = s.provider;
  const locked = isLocked();
  const registeredProviders = getRegisteredProviders();
  const hasAnyApiKey = registeredProviders.length > 0;
  if (!provider) {
    return res.json({
      configured: false,
      needsSetup: !hasAnyApiKey,
      provider: "",
      model: s.model || "",
      locked,
      hasMasterPassword: hasMasterPassword(),
      registeredProviders,
    });
  }
  if (provider === "ollama") {
    return res.json({
      configured: true,
      needsSetup: false,
      provider,
      model: s.model || "",
      locked: false,
      hasMasterPassword: hasMasterPassword(),
      registeredProviders,
    });
  }
  res.json({
    configured: hasApiKey(provider),
    needsSetup: !hasAnyApiKey,
    provider,
    model: s.model || "",
    locked,
    hasMasterPassword: hasMasterPassword(),
    registeredProviders,
  });
});

// POST /api/settings/unlock — 마스터 비밀번호로 API 키 잠금 해제
router.post("/unlock", (req, res) => {
  try {
    unlock(req.body.masterPassword || "");
    res.json({ success: true, message: "API 키 잠금이 해제되었습니다." });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/settings/lock — 메모리의 복호화 키 제거
router.post("/lock", (_req, res) => {
  lock();
  res.json({ success: true, message: "API 키가 잠겼습니다." });
});

// PUT /api/settings — 설정 저장
router.put("/", async (req, res) => {
  const current = loadSettings();
  const { provider, model, apiKey, ollamaUrl, masterPassword, selectedModels, defaultModel } = req.body;

  const updated = { ...current };
  if (provider  !== undefined) updated.provider  = provider;
  if (model     !== undefined) updated.model      = model;
  if (ollamaUrl !== undefined) updated.ollamaUrl  = ollamaUrl;

  try {
    let verification = null;
    const hasNewApiKey = apiKey !== undefined && provider && apiKey.trim() !== "";

    if (hasNewApiKey) {
      setApiKey(provider, apiKey.trim(), masterPassword);
    }

    if (selectedModels !== undefined && provider) {
      let effectiveApiKey = apiKey?.trim();
      if (provider !== "ollama" && !effectiveApiKey) {
        effectiveApiKey = getApiKey(provider);
      }
      verification = await verifyModels({
        provider,
        models: selectedModels,
        defaultModel: defaultModel || model,
        apiKey: effectiveApiKey,
        ollamaUrl: updated.ollamaUrl,
      });
      updated.verifiedModels = {
        ...(loadSettings().verifiedModels || {}),
        [provider]: verification.passed,
      };
      if (verification.defaultModel) {
        updated.model = verification.defaultModel;
      } else {
        updated.model = "";
      }
    }
    // apiKeys와 crypto는 setApiKey()가 이미 파일에 암호화 저장했으므로
    // updated에서 제외하고 최신 파일 값을 그대로 유지한다.
    // (updated를 그대로 spread하면 요청 시작 시점의 빈 apiKeys로 덮어써지는 버그 방지)
    const { apiKeys: _k, crypto: _c, ...safeUpdated } = updated;
    saveSettings({ ...loadSettings(), ...safeUpdated });
    const message = verification && verification.passed.length === 0
      ? "API 키는 저장되었지만 통과한 모델이 없습니다. 모델 선택을 바꿔 다시 테스트해 주세요."
      : "설정이 저장되었습니다.";
    res.json({ success: true, message, verification });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message, verification: err.verification || null });
  }
});

// DELETE /api/settings/api-key/:provider — 특정 제공자 API 키 삭제
router.delete("/api-key/:provider", (req, res) => {
  const { provider } = req.params;
  deleteApiKey(provider);
  res.json({ success: true, message: `${provider} API 키가 삭제되었습니다.` });
});

// POST /api/settings/test — 연결 테스트
router.post("/test", async (req, res) => {
  const { provider, model, apiKey, ollamaUrl } = req.body;

  if (!provider) {
    return res.status(400).json({ success: false, error: "제공자를 선택해 주세요." });
  }
  let effectiveApiKey = apiKey;
  if (provider !== "ollama" && !effectiveApiKey) {
    try {
      effectiveApiKey = getApiKey(provider);
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
  if (provider !== "ollama" && !effectiveApiKey) {
    return res.status(400).json({ success: false, error: "API 키를 입력해 주세요." });
  }

  const testPrompt = '"테스트 성공"이라는 단어만 한국어로 답해주세요. 다른 텍스트는 포함하지 마세요.';

  try {
    let text = "";
    switch (provider) {
      case "gemini": {
        const { generate } = require("../providers/gemini");
        text = await generate(testPrompt, effectiveApiKey, model);
        break;
      }
      case "openai": {
        const { generate } = require("../providers/openai");
        text = await generate(testPrompt, effectiveApiKey, model);
        break;
      }
      case "claude": {
        const { generate } = require("../providers/claude");
        text = await generate(testPrompt, effectiveApiKey, model);
        break;
      }
      case "ollama": {
        const { generate } = require("../providers/ollama");
        text = await generate(testPrompt, null, model, ollamaUrl || "http://localhost:11434");
        break;
      }
      default:
        return res.json({ success: false, error: `알 수 없는 제공자: ${provider}` });
    }
    res.json({ success: true, message: `✅ 연결 성공! 응답: "${text.trim().substring(0, 40)}"` });
  } catch (err) {
    res.json({ success: false, error: err.message || "연결 실패" });
  }
});

module.exports = router;
