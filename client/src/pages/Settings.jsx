import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSettings,
  saveSettings,
  testConnection,
  getModels,
  deleteApiKey,
  unlockSettings,
} from "../api.js";

const PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    logo: "🔵",
    desc: "Google의 최신 AI. 무료 티어 제공.",
    keyPlaceholder: "AIzaSy...",
    keyLink: "https://aistudio.google.com/app/apikey",
    keyLinkText: "Google AI Studio에서 발급",
  },
  {
    id: "openai",
    name: "OpenAI (ChatGPT)",
    logo: "🟢",
    desc: "GPT-4o 등 OpenAI 모델 사용.",
    keyPlaceholder: "sk-...",
    keyLink: "https://platform.openai.com/api-keys",
    keyLinkText: "OpenAI 플랫폼에서 발급",
  },
  {
    id: "claude",
    name: "Anthropic Claude",
    logo: "🟠",
    desc: "Claude Sonnet/Haiku 등 사용.",
    keyPlaceholder: "sk-ant-...",
    keyLink: "https://console.anthropic.com/",
    keyLinkText: "Anthropic Console에서 발급",
  },
  {
    id: "ollama",
    name: "Ollama (로컬 AI)",
    logo: "🦙",
    desc: "내 PC에서 실행하는 무료 AI. API 키 불필요.",
    keyPlaceholder: null,
    keyLink: "https://ollama.com/download",
    keyLinkText: "Ollama 다운로드",
  },
];

const MODEL_GUIDES = {
  gemini: {
    pattern: "gemini-로 시작하는 모델 ID를 그대로 입력하세요.",
    examples: ["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-flash-latest"],
    notes: [
      "Google AI Studio 또는 Gemini API 문서에 표시된 모델 ID를 복사해서 붙여넣는 것이 가장 안전합니다.",
      "Preview 모델은 계정이나 지역에 따라 사용할 수 없을 수 있습니다.",
      "공백, 한글 설명, 괄호 안 설명은 넣지 마세요.",
    ],
    docs: "https://ai.google.dev/gemini-api/docs/models",
  },
  openai: {
    pattern: "gpt-, o 계열 등 OpenAI 모델 ID를 그대로 입력하세요.",
    examples: ["gpt-5.4-mini", "gpt-5.2", "gpt-4.1-mini"],
    notes: [
      "OpenAI 모델 페이지의 model 값만 입력하세요. 표시 이름이나 설명은 제외합니다.",
      "일부 최신 모델은 프로젝트 권한이나 결제 상태에 따라 연결 테스트가 실패할 수 있습니다.",
      "대소문자와 하이픈이 틀리면 호출이 실패합니다.",
    ],
    docs: "https://platform.openai.com/docs/models",
  },
  claude: {
    pattern: "claude-로 시작하는 Anthropic 모델 ID를 그대로 입력하세요.",
    examples: ["claude-sonnet-4-6", "claude-opus-4-7", "claude-haiku-4-5-20251001"],
    notes: [
      "Anthropic Console 또는 공식 모델 문서의 API model 값을 복사하세요.",
      "Claude 모델명은 날짜가 붙은 버전과 alias가 섞여 있으니 오타 확인이 특히 중요합니다.",
      "계정에서 미지원 모델이면 저장 전 연결 테스트에서 실패합니다.",
    ],
    docs: "https://docs.anthropic.com/en/docs/about-claude/models/all-models",
  },
  ollama: {
    pattern: "내 PC에 pull 되어 있는 Ollama 모델 이름을 입력하세요.",
    examples: ["llama3.3", "qwen3", "gemma3"],
    notes: [
      "터미널에서 ollama list로 설치된 모델명을 확인한 뒤 그대로 입력하세요.",
      "모델이 설치되어 있지 않으면 ollama pull 모델명으로 먼저 내려받아야 합니다.",
      "Ollama 앱 또는 서버가 실행 중이어야 연결 테스트가 성공합니다.",
    ],
    docs: "https://ollama.com/library",
  },
};

function getCustomModelIssues(provider, value) {
  const raw = value || "";
  const trimmed = raw.trim();
  const issues = [];
  const tips = [];

  if (!trimmed) {
    issues.push("모델 ID를 입력하세요.");
    return { issues, tips };
  }
  if (raw !== trimmed) {
    issues.push("앞뒤 공백이 있습니다. 저장 시 제거되지만 복사한 값이 맞는지 확인하세요.");
  }
  if (/\s/.test(trimmed)) {
    issues.push("모델 ID 중간에는 공백이 들어가면 안 됩니다.");
  }
  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(trimmed)) {
    issues.push("모델 ID에는 한글 설명을 넣지 마세요.");
  }
  if (/[()]/.test(trimmed)) {
    tips.push("괄호 안 설명까지 복사했다면 괄호와 설명을 제거하세요.");
  }
  if (/[A-Z]/.test(trimmed)) {
    tips.push("대부분의 모델 ID는 소문자를 사용합니다. 공식 문서 표기와 정확히 비교하세요.");
  }

  if (provider === "gemini" && !trimmed.startsWith("gemini-")) {
    tips.push("Gemini 모델은 보통 gemini-로 시작합니다.");
  }
  if (provider === "openai" && !/^(gpt-|o[0-9])/.test(trimmed)) {
    tips.push("OpenAI 모델은 보통 gpt- 또는 o 계열 이름으로 시작합니다.");
  }
  if (provider === "claude" && !trimmed.startsWith("claude-")) {
    tips.push("Claude 모델은 보통 claude-로 시작합니다.");
  }

  return { issues, tips };
}

export default function Settings() {
  const navigate = useNavigate();

  const [models,      setModels]      = useState({});
  const [provider,    setProvider]    = useState("");
  const [model,       setModel]       = useState("");
  const [apiKey,      setApiKey]      = useState("");
  const [showKey,     setShowKey]     = useState(false);
  const [ollamaUrl,   setOllamaUrl]   = useState("http://localhost:11434");
  const [customModel, setCustomModel] = useState("");
  const [selectedModels, setSelectedModels] = useState([]);

  const [hasKey,      setHasKey]      = useState({});  // { gemini: true, openai: false, ... }
  const [locked,      setLocked]      = useState(false);
  const [hasCrypto,   setHasCrypto]   = useState(false);
  const [passwordModal, setPasswordModal] = useState(null); // null | setup | unlock
  const [modalPassword, setModalPassword] = useState("");
  const [modalPasswordConfirm, setModalPasswordConfirm] = useState("");
  const [modalError, setModalError] = useState("");
  const [pendingSave, setPendingSave] = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [testing,     setTesting]     = useState(false);
  const [testResult,  setTestResult]  = useState(null); // { ok: bool, msg: string }
  const [verificationResult, setVerificationResult] = useState(null);
  const [saveMsg,     setSaveMsg]     = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [s, m] = await Promise.all([getSettings(), getModels()]);
      setModels(m);
      setProvider(s.provider || "");
      const providerModels = m[s.provider] || [];
      const savedModel = s.model || "";
      const verifiedValues = (s.verifiedModels?.[s.provider] || []).map((item) => item.value);
      setSelectedModels(verifiedValues.length > 0 ? verifiedValues : savedModel ? [savedModel] : []);
      if (savedModel && providerModels.length > 0 && !providerModels.some((item) => item.value === savedModel)) {
        setModel("custom");
        setCustomModel(savedModel);
      } else {
        setModel(savedModel);
        setCustomModel("");
      }
      setOllamaUrl(s.ollamaUrl || "http://localhost:11434");
      setLocked(!!s.locked);
      setHasCrypto(!!s.crypto);
      // 마스킹된 키 상태로 has 여부 파악
      const hk = {};
      Object.keys(s.apiKeys || {}).forEach((k) => {
        hk[k] = !!s.apiKeys[k];
      });
      setHasKey(hk);
    } catch (err) {
      console.error("설정 로드 실패:", err.message);
    }
  }

  function handleProviderChange(p) {
    setProvider(p);
    setApiKey("");
    setCustomModel("");
    setVerificationResult(null);
    setTestResult(null);
    setSaveMsg(null);
    // 해당 제공자의 첫 번째 모델로 자동 선택
    const ms = models[p] || [];
    const first = ms[0]?.value || "";
    setSelectedModels(first ? [first] : []);
    setModel(first);
  }

  function toggleModel(value) {
    setVerificationResult(null);
    setTestResult(null);
    setSelectedModels((prev) => {
      const exists = prev.includes(value);
      const next = exists ? prev.filter((item) => item !== value) : [...prev, value];
      if (!exists && !model) setModel(value);
      if (exists && model === value) setModel(next[0] || "");
      return next;
    });
  }

  function addCustomModel() {
    const value = customModel.trim();
    if (!value || hasBlockingCustomIssue) return;
    setSelectedModels((prev) => prev.includes(value) ? prev : [...prev, value]);
    setModel(value);
    setCustomModel("");
    setVerificationResult(null);
    setTestResult(null);
  }

  async function handleSave() {
    setSaveMsg(null); setTestResult(null);
    try {
      const effectiveModel = model === "custom" ? customModel.trim() : model;
      if (!effectiveModel) {
        throw new Error("기본값으로 사용할 모델을 선택하세요.");
      }
      if (selectedModels.length === 0) {
        throw new Error("테스트할 모델을 1개 이상 체크하세요.");
      }
      const payload = {
        provider,
        model: effectiveModel,
        selectedModels,
        defaultModel: effectiveModel,
        apiKey: apiKey.trim() || undefined,
        ollamaUrl,
      };
      const needsPassword = !isOllama && (
        !!apiKey.trim()
        || (selectedModels.length > 0 && locked)
        || (selectedModels.length > 0 && !hasCrypto)
      );
      if (needsPassword) {
        setPendingSave(payload);
        setModalPassword("");
        setModalPasswordConfirm("");
        setModalError("");
        setPasswordModal(hasCrypto ? "unlock" : "setup");
        return;
      }
      await commitSettings(payload);
    } catch (err) {
      setSaveMsg({ ok: false, text: err.message });
    }
  }

  async function commitSettings(payload, masterPassword) {
    setSaving(true);
    try {
      const result = await saveSettings({
        ...payload,
        masterPassword: masterPassword || undefined,
      });
      setSaveMsg({ ok: true, text: result.message || "설정이 저장되었습니다." });
      setVerificationResult(result.verification || null);
      if (payload.apiKey) {
        setHasKey((prev) => ({ ...prev, [payload.provider]: true }));
        setApiKey("");
        setLocked(false);
        setHasCrypto(true);
      }
      await loadAll();
      return result;
    } catch (err) {
      if (err.data?.verification) setVerificationResult(err.data.verification);
      setSaveMsg({ ok: false, text: err.message });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function submitPasswordModal() {
    setModalError("");
    if (!modalPassword || modalPassword.length < 4) {
      setModalError("마스터 비밀번호를 4자 이상 입력하세요.");
      return;
    }
    if (passwordModal === "setup" && modalPassword !== modalPasswordConfirm) {
      setModalError("마스터 비밀번호가 서로 다릅니다.");
      return;
    }
    try {
      if (passwordModal === "unlock") {
        await unlockSettings(modalPassword);
      }
      const result = await commitSettings(pendingSave, modalPassword);
      if (!result) {
        setModalError("모델 테스트 또는 저장에 실패했습니다. 결과를 확인해 주세요.");
        return;
      }
      const wasSetup = passwordModal === "setup";
      setPasswordModal(null);
      setPendingSave(null);
      setModalPassword("");
      setModalPasswordConfirm("");
      const hasVerifiedModel = (result.verification?.passed || []).length > 0;
      if (wasSetup && hasVerifiedModel) navigate("/");
    } catch (err) {
      setModalError(err.message);
    }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null);
    try {
      const effectiveModel = model;
      if (!effectiveModel) {
        throw new Error("테스트할 모델을 선택하거나 직접 입력하세요.");
      }
      // 테스트 시 입력 중인 키 우선, 없으면 저장된 키 사용
      const result = await testConnection({
        provider,
        model: effectiveModel,
        apiKey: apiKey.trim() || undefined,
        ollamaUrl,
      });
      setTestResult({ ok: result.success, msg: result.success ? result.message : result.error });
    } catch (err) {
      setTestResult({ ok: false, msg: err.message });
    } finally {
      setTesting(false);
    }
  }

  async function handleDeleteKey(p) {
    if (!window.confirm(`${PROVIDERS.find(x=>x.id===p)?.name} API 키를 삭제하시겠습니까?`)) return;
    try {
      await deleteApiKey(p);
      setHasKey((prev) => ({ ...prev, [p]: false }));
      setSaveMsg({ ok: true, text: "API 키가 삭제되었습니다." });
    } catch (err) {
      setSaveMsg({ ok: false, text: err.message });
    }
  }

  const currentProvider = PROVIDERS.find((p) => p.id === provider);
  const providerModels  = models[provider] || [];
  const isOllama        = provider === "ollama";
  const effectiveModel  = model;
  const customGuide     = MODEL_GUIDES[provider];
  const customModelCheck = customModel.trim()
    ? getCustomModelIssues(provider, customModel)
    : { issues: [], tips: [] };
  const customTrimmed = customModel.trim();
  const hasBlockingCustomIssue = !!customTrimmed
    && (/[\s]/.test(customTrimmed) || /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(customTrimmed));
  const hasUsableKeyForProvider = isOllama || apiKey.trim() || hasKey[provider];
  const canSave         = !!provider && hasUsableKeyForProvider && !!effectiveModel && selectedModels.length > 0 && selectedModels.includes(effectiveModel) && !hasBlockingCustomIssue;
  const canTest         = !!provider && !!effectiveModel && (isOllama || apiKey.trim() || hasKey[provider]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* 헤더 */}
      <header style={{
        background: "var(--card)", borderBottom: "1px solid var(--border)",
        padding: "0 24px", height: "56px",
        display: "flex", alignItems: "center", gap: "12px",
      }}>
        <button
          onClick={() => navigate("/")}
          style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "1.1rem", padding: "4px 8px" }}
        >←</button>
        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>AI 설정</span>
      </header>

      <div style={{ maxWidth: "600px", margin: "32px auto", padding: "0 20px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 20px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text2)", marginBottom: "4px" }}>
                API 키 보안
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--text3)", lineHeight: 1.6 }}>
                API 키는 이 PC의 <code>data/settings.json</code>에 암호화 저장됩니다. 마스터 비밀번호 입력은 첫 저장 또는 잠금 해제 때만 표시됩니다.
              </div>
            </div>
            <span style={{ color: locked ? "var(--yellow)" : "var(--green)", fontSize: "0.74rem", whiteSpace: "nowrap" }}>
              {locked ? "잠김" : hasCrypto ? "해제됨" : "첫 설정 전"}
            </span>
          </div>
        </div>

        {/* 1. AI 제공자 선택 */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 24px", marginBottom: "16px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text3)", marginBottom: "14px" }}>
            1. 사용할 AI 선택
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                style={{
                  background: provider === p.id ? "var(--accent-bg)" : "var(--card2)",
                  border: `1.5px solid ${provider === p.id ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "var(--radius)", padding: "12px 14px",
                  cursor: "pointer", textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: "1.1rem", marginBottom: "4px" }}>{p.logo}</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", marginBottom: "2px" }}>{p.name}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text3)", lineHeight: "1.4" }}>{p.desc}</div>
                {hasKey[p.id] && p.id !== "ollama" && (
                  <div style={{ marginTop: "6px", fontSize: "0.7rem", color: "var(--green)" }}>✓ 키 등록됨</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 2. 모델 및 API 키 설정 */}
        {provider && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 24px", marginBottom: "16px" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text3)", marginBottom: "14px" }}>
              2. {currentProvider?.name} 설정
            </div>

            {/* 모델 선택 */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--text3)" }}>
                  테스트할 모델 선택
                </label>
                <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
                  {selectedModels.length}개 선택 / 기본값 {model || "미선택"}
                </span>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "8px",
                maxHeight: "260px",
                overflowY: "auto",
                paddingRight: "4px",
              }}>
                {providerModels.filter((m) => m.value !== "custom").map((m) => {
                  const checked = selectedModels.includes(m.value);
                  const isDefault = model === m.value;
                  return (
                    <div
                      key={m.value}
                      style={{
                        background: checked ? "var(--accent-bg)" : "var(--card2)",
                        border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                        borderRadius: "var(--radius)",
                        padding: "9px 10px",
                        display: "grid",
                        gridTemplateColumns: "24px 1fr 72px",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModel(m.value)}
                      />
                      <div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text)", fontWeight: 700 }}>
                          {m.label}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text3)", marginTop: "2px" }}>
                          {m.value}
                        </div>
                      </div>
                      <label style={{
                        fontSize: "0.72rem",
                        color: checked ? "var(--text2)" : "var(--text3)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        justifyContent: "flex-end",
                      }}>
                        <input
                          type="radio"
                          name="defaultModel"
                          checked={isDefault}
                          disabled={!checked}
                          onChange={() => setModel(m.value)}
                        />
                        기본
                      </label>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: "12px" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--text3)", display: "block", marginBottom: "6px" }}>
                  직접 모델 추가
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder={
                      isOllama
                        ? "모델명 직접 입력 (예: llama3.3, qwen3)"
                        : "모델명 직접 입력 (예: 새로 공개된 모델 ID)"
                    }
                    value={customModel}
                    onChange={(e) => {
                      setCustomModel(e.target.value);
                      setTestResult(null);
                      setVerificationResult(null);
                    }}
                    style={{
                      flex: 1,
                      background: "var(--card2)",
                      border: `1px solid ${customModelCheck.issues.length ? "var(--yellow)" : "var(--border)"}`,
                      borderRadius: "var(--radius)", padding: "9px 12px",
                      color: "var(--text)", fontSize: "0.88rem", outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={addCustomModel}
                    disabled={!customModel.trim() || hasBlockingCustomIssue}
                  >
                    추가
                  </button>
                </div>

                {selectedModels
                  .filter((value) => !providerModels.some((item) => item.value === value))
                  .map((value) => (
                    <div
                      key={value}
                      style={{
                        background: "var(--accent-bg)",
                        border: "1px solid var(--accent)",
                        borderRadius: "var(--radius)",
                        padding: "9px 10px",
                        marginTop: "8px",
                        display: "grid",
                        gridTemplateColumns: "24px 1fr 72px",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked
                        onChange={() => toggleModel(value)}
                      />
                      <div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text)", fontWeight: 700 }}>{value}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text3)", marginTop: "2px" }}>직접 입력 모델</div>
                      </div>
                      <label style={{
                        fontSize: "0.72rem", color: "var(--text2)",
                        display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end",
                      }}>
                        <input
                          type="radio"
                          name="defaultModel"
                          checked={model === value}
                          onChange={() => setModel(value)}
                        />
                        기본
                      </label>
                    </div>
                  ))}

                <div style={{
                  marginTop: "10px",
                  background: "var(--accent-bg)",
                  border: "1px solid color-mix(in srgb, var(--accent) 38%, var(--border))",
                  borderRadius: "var(--radius)",
                  padding: "12px",
                }}>
                  <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text2)", marginBottom: "6px" }}>
                    모델 검증 방식
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text3)", lineHeight: 1.65 }}>
                    저장 시 체크한 모델을 백엔드가 현재 API 키로 모두 테스트합니다. 테스트를 통과한 모델만 글쓰기 화면의 모델 선택기에 표시됩니다.
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text3)", lineHeight: 1.65, marginTop: "6px" }}>
                    {customGuide?.pattern}
                  </div>
                  {customGuide?.docs && (
                    <a
                      href={customGuide.docs}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "inline-block", marginTop: "8px", color: "var(--accent)", fontSize: "0.72rem" }}
                    >
                      공식 모델 목록 확인
                    </a>
                  )}
                </div>

                {(customModelCheck.issues.length > 0 || customModelCheck.tips.length > 0) && (
                  <div style={{
                    marginTop: "8px",
                    padding: "9px 11px",
                    borderRadius: "var(--radius)",
                    border: "1px solid color-mix(in srgb, var(--yellow) 38%, var(--border))",
                    background: "var(--yellow-bg)",
                    color: "var(--yellow)",
                    fontSize: "0.72rem",
                    lineHeight: 1.6,
                  }}>
                    {[...customModelCheck.issues, ...customModelCheck.tips].map((item) => (
                      <div key={item}>- {item}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Ollama URL */}
            {isOllama && (
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--text3)", display: "block", marginBottom: "5px" }}>
                  Ollama 주소
                </label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  style={{
                    width: "100%", background: "var(--card2)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius)", padding: "9px 12px",
                    color: "var(--text)", fontSize: "0.88rem", outline: "none", boxSizing: "border-box",
                  }}
                />
                <p style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "4px" }}>
                  Ollama가 설치·실행 중이어야 합니다.{" "}
                  <a href={currentProvider.keyLink} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                    {currentProvider.keyLinkText}
                  </a>
                </p>
              </div>
            )}

            {/* API 키 입력 (Ollama 제외) */}
            {!isOllama && (
              <div style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                  <label style={{ fontSize: "0.78rem", color: "var(--text3)" }}>
                    API 키 {hasKey[provider] && <span style={{ color: "var(--green)" }}>✓ 등록됨</span>}
                  </label>
                  {hasKey[provider] && (
                    <button
                      onClick={() => handleDeleteKey(provider)}
                      style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "0.72rem" }}
                    >
                      키 삭제
                    </button>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showKey ? "text" : "password"}
                    placeholder={hasKey[provider] ? "새 키로 교체하려면 입력 (그대로면 비워두세요)" : currentProvider?.keyPlaceholder}
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                    autoComplete="off"
                    style={{
                      width: "100%", background: "var(--card2)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius)", padding: "9px 40px 9px 12px",
                      color: "var(--text)", fontSize: "0.88rem", outline: "none", boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    style={{
                      position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "0.85rem",
                    }}
                  >
                    {showKey ? "🙈" : "👁"}
                  </button>
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "4px" }}>
                  <a href={currentProvider?.keyLink} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                    {currentProvider?.keyLinkText}
                  </a>
                  <br />
                  새 API 키를 저장하면 마스터 비밀번호 입력 창이 열립니다. 비밀번호를 잊으면 저장된 API 키는 복구할 수 없습니다.
                </p>
              </div>
            )}

            {/* 테스트 결과 */}
            {testResult && (
              <div style={{
                padding: "8px 12px", borderRadius: "var(--radius)", marginBottom: "12px",
                background: testResult.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${testResult.ok ? "var(--green)" : "var(--red)"}`,
                fontSize: "0.82rem", color: testResult.ok ? "var(--green)" : "var(--red)",
              }}>
                {testResult.msg}
              </div>
            )}

            {/* 저장 결과 */}
            {saveMsg && (
              <div style={{
                padding: "8px 12px", borderRadius: "var(--radius)", marginBottom: "12px",
                background: saveMsg.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${saveMsg.ok ? "var(--green)" : "var(--red)"}`,
                fontSize: "0.82rem", color: saveMsg.ok ? "var(--green)" : "var(--red)",
              }}>
                {saveMsg.text}
              </div>
            )}

            {verificationResult && (
              <div style={{
                padding: "10px 12px", borderRadius: "var(--radius)", marginBottom: "12px",
                background: "var(--card2)", border: "1px solid var(--border)",
                fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.65,
              }}>
                <strong style={{ color: "var(--green)" }}>통과 모델 {verificationResult.passed?.length || 0}개</strong>
                {verificationResult.defaultModel && (
                  <span> / 기본값: {verificationResult.defaultModel}</span>
                )}
                {(verificationResult.passed || []).map((item) => (
                  <div key={item.value} style={{ color: "var(--green)" }}>✓ {item.label || item.value}</div>
                ))}
                {(verificationResult.failed || []).length > 0 && (
                  <>
                    <strong style={{ color: "var(--yellow)", display: "block", marginTop: "6px" }}>
                      실패 모델 {verificationResult.failed.length}개
                    </strong>
                    {verificationResult.failed.map((item) => (
                      <div key={item.value} style={{ color: "var(--yellow)" }}>
                        - {item.label || item.value}: {String(item.error || "").substring(0, 120)}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* 버튼 */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleTest}
                disabled={testing || !canTest || hasBlockingCustomIssue}
                style={{
                  background: "none", border: "1px solid var(--border)",
                  color: "var(--text2)", borderRadius: "var(--radius)",
                  padding: "8px 18px", cursor: "pointer", fontSize: "0.85rem",
                  opacity: testing || !canTest || hasBlockingCustomIssue ? 0.5 : 1,
                }}
              >
                {testing ? "테스트 중..." : "🔌 연결 테스트"}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !canSave}
                style={{
                  background: "var(--accent)", border: "none", color: "var(--accent-on)",
                  borderRadius: "var(--radius)", padding: "8px 24px",
                  cursor: "pointer", fontSize: "0.85rem", fontWeight: 700,
                  opacity: saving || !canSave ? 0.5 : 1,
                }}
              >
                {saving ? "모델 테스트 중..." : "모델 테스트 후 저장"}
              </button>
            </div>
          </div>
        )}

        {/* 현재 저장된 설정 요약 */}
        <div style={{
          background: "var(--card2)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "14px 18px",
          fontSize: "0.78rem", color: "var(--text3)", lineHeight: "1.7",
        }}>
          <strong style={{ color: "var(--text2)" }}>등록된 API 키:</strong>
          {PROVIDERS.filter((p) => p.id !== "ollama").map((p) => (
            <span key={p.id} style={{ marginLeft: "10px" }}>
              {p.logo} {p.name}: {hasKey[p.id] ? <span style={{ color: "var(--green)" }}>✓</span> : <span style={{ color: "var(--text3)" }}>✗</span>}
            </span>
          ))}
          <br />
          <strong style={{ color: "var(--text2)" }}>현재 사용 중:</strong>{" "}
          {provider ? `${PROVIDERS.find((p) => p.id === provider)?.name} / ${effectiveModel || "모델 미선택"}` : "미설정"}
        </div>
      </div>

      {passwordModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(2,6,23,0.72)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px", zIndex: 50,
        }}>
          <div style={{
            width: "100%", maxWidth: "420px", background: "var(--card)",
            border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
            padding: "22px", boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>
              {passwordModal === "setup" ? "마스터 비밀번호 설정" : "마스터 비밀번호 확인"}
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text3)", lineHeight: 1.7, marginBottom: "14px" }}>
              {passwordModal === "setup"
                ? "API 키를 암호화할 앱 전용 비밀번호를 설정합니다. 실수 방지를 위해 두 번 입력해 주세요."
                : "저장된 API 키를 교체하려면 기존 마스터 비밀번호로 잠금 해제가 필요합니다."}
            </p>
            <input
              type="password"
              placeholder="마스터 비밀번호"
              value={modalPassword}
              onChange={(e) => { setModalPassword(e.target.value); setModalError(""); }}
              autoFocus
              style={{
                width: "100%", background: "var(--card2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", padding: "10px 12px",
                color: "var(--text)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
                marginBottom: "8px",
              }}
            />
            {passwordModal === "setup" && (
              <input
                type="password"
                placeholder="마스터 비밀번호 다시 입력"
                value={modalPasswordConfirm}
                onChange={(e) => { setModalPasswordConfirm(e.target.value); setModalError(""); }}
                style={{
                  width: "100%", background: "var(--card2)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius)", padding: "10px 12px",
                  color: "var(--text)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
                  marginBottom: "8px",
                }}
              />
            )}
            {modalError && (
              <div style={{ color: "var(--red)", fontSize: "0.78rem", margin: "6px 0 10px" }}>
                {modalError}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setPasswordModal(null);
                  setPendingSave(null);
                  setModalPassword("");
                  setModalPasswordConfirm("");
                  setModalError("");
                }}
              >
                취소
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={submitPasswordModal}
                disabled={saving || modalPassword.length < 4 || (passwordModal === "setup" && modalPassword !== modalPasswordConfirm)}
              >
                {saving ? "저장 중..." : passwordModal === "setup" ? "설정하고 저장" : "확인하고 저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
