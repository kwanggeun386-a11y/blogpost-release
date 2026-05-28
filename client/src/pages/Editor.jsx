import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getPost, updatePost,
  addParagraph, updateParagraph, deleteParagraph, reorderParagraphs,
  aiBriefing, aiOutline, aiParagraphGuide, aiDraftParagraph,
  aiAnalyzeParagraph, aiAnalyzePost,
  downloadMarkdown,
  getSettings, getModels, saveSettings,
} from "../api.js";
import AdvicePanel from "../components/AdvicePanel.jsx";
import ParagraphCard from "../components/ParagraphCard.jsx";
import LocalStats from "../components/LocalStats.jsx";
import { useTheme } from "../hooks/useTheme.js";

const PROVIDER_LABELS = {
  gemini: "Gemini",
  openai: "OpenAI",
  claude: "Claude",
  ollama: "Ollama",
};

export default function Editor() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  // ── 데이터 상태 ───────────────────────────────────────────────────
  const [post, setPost] = useState(null);
  const [paragraphs, setParagraphs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── 선택된 문단 ───────────────────────────────────────────────────
  const [selectedParaId, setSelectedParaId] = useState(null);

  // ── 저장 상태 ─────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState("saved"); // saved | saving | unsaved
  const saveTimer = useRef(null);

  // ── AI 상태 ───────────────────────────────────────────────────────
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [postAnalysis, setPostAnalysis] = useState(null);
  const [postAnalysisLoading, setPostAnalysisLoading] = useState(false);
  const [paraDraftLoading, setParaDraftLoading] = useState({});
  const [aiSettings, setAiSettings] = useState({
    provider: "",
    model: "",
    hasKey: {},
    verifiedModels: {},
    ollamaUrl: "http://localhost:11434",
  });
  const [aiModels, setAiModels] = useState({});
  const [aiSwitchSaving, setAiSwitchSaving] = useState(false);

  // ── 아웃라인 생성 ─────────────────────────────────────────────────
  const [outlineLoading, setOutlineLoading] = useState(false);

  // ── 제목 편집 ─────────────────────────────────────────────────────
  const [titleValue, setTitleValue] = useState("");

  // ─────────────────────────────────────────────────────────────────
  // 초기 로드
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadPost();
    loadAiSettings();
  }, [postId]);

  async function loadAiSettings() {
    try {
      const [settings, models] = await Promise.all([getSettings(), getModels()]);
      const hk = {};
      Object.keys(settings.apiKeys || {}).forEach((key) => {
        hk[key] = !!settings.apiKeys[key];
      });
      setAiModels(models);
      setAiSettings({
        provider: settings.provider || "",
        model: settings.model || "",
        hasKey: hk,
        verifiedModels: settings.verifiedModels || {},
        ollamaUrl: settings.ollamaUrl || "http://localhost:11434",
      });
    } catch (_) {}
  }

  async function loadPost() {
    try {
      setLoading(true);
      setError(null);
      const data = await getPost(postId);
      setPost(data);
      setTitleValue(data.title || data.topic || "");
      setParagraphs(data.paragraphs || []);

      // 이미 저장된 브리핑 복원
      if (data.briefing_json) {
        try { setBriefing(JSON.parse(data.briefing_json)); } catch (_) {}
      }
      // 이미 저장된 전체 분석 복원
      if (data.overall_analysis_json) {
        try { setPostAnalysis(JSON.parse(data.overall_analysis_json)); } catch (_) {}
      }

      // 문단이 없으면 아웃라인 자동 생성 제안
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // 자동 저장 (제목)
  // ─────────────────────────────────────────────────────────────────
  function handleTitleChange(val) {
    setTitleValue(val);
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveTitle(val), 1200);
  }

  async function saveTitle(val) {
    setSaveStatus("saving");
    try {
      const updated = await updatePost(postId, { title: val });
      setPost(updated);
      setSaveStatus("saved");
    } catch (_) {
      setSaveStatus("unsaved");
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // AI: 작성 전 브리핑
  // ─────────────────────────────────────────────────────────────────
  async function handleBriefing() {
    if (!post) return;
    setBriefingLoading(true);
    try {
      const result = await aiBriefing({ post });
      if (result.success) {
        setBriefing(result.data);
        await updatePost(postId, { briefing_json: JSON.stringify(result.data) });
      } else {
        alert("브리핑 생성 실패: " + (result.error || "알 수 없는 오류") +
          (result.raw ? "\n\n" + result.raw.substring(0, 300) : ""));
      }
    } catch (err) {
      alert("브리핑 오류: " + err.message);
    } finally {
      setBriefingLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // AI: 문단 아웃라인 생성
  // ─────────────────────────────────────────────────────────────────
  async function handleGenerateOutline() {
    if (!post) return;
    if (paragraphs.length > 0) {
      if (!window.confirm("기존 문단 구조를 지우고 새로 생성하시겠습니까?")) return;
    }
    setOutlineLoading(true);
    try {
      const result = await aiOutline({ post });
      if (!result.success) {
        alert("아웃라인 생성 실패: " + (result.error || "") +
          (result.raw ? "\n" + result.raw.substring(0, 300) : ""));
        return;
      }
      const outline = Array.isArray(result.data) ? result.data : [];

      // 기존 문단 전체 삭제 (서버 측 CASCADE)
      for (const p of paragraphs) {
        await deleteParagraph(p.id);
      }

      // 새 문단 일괄 추가
      const newParas = [];
      for (const item of outline) {
        const p = await addParagraph(postId, {
          order_index: item.order_index,
          role: item.role,
          title: item.title,
          guide: item.guide,
          content: "",
        });
        newParas.push(p);
      }
      setParagraphs(newParas.sort((a, b) => a.order_index - b.order_index));
    } catch (err) {
      alert("아웃라인 생성 오류: " + err.message);
    } finally {
      setOutlineLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // 문단 추가 (빈 문단)
  // ─────────────────────────────────────────────────────────────────
  async function handleAddParagraph() {
    try {
      const newP = await addParagraph(postId, {
        role: "도입",
        title: "",
        guide: "",
        content: "",
        order_index: paragraphs.length,
      });
      setParagraphs((prev) => [...prev, newP]);
      setSelectedParaId(newP.id);
    } catch (err) {
      alert("문단 추가 실패: " + err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // 문단 내용 변경 (로컬만, 디바운스 저장)
  // ─────────────────────────────────────────────────────────────────
  const paraTimers = useRef({});

  function handleParagraphChange(id, field, value) {
    setParagraphs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
    setSaveStatus("unsaved");

    if (paraTimers.current[id]) clearTimeout(paraTimers.current[id]);
    paraTimers.current[id] = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const updated = await updateParagraph(id, { [field]: value });
        setSaveStatus("saved");
        // status를 writing으로 전환
        if (field === "content" && value.trim().length > 0) {
          setParagraphs((prev) =>
            prev.map((p) =>
              p.id === id && p.status === "pending"
                ? { ...p, status: "writing" }
                : p
            )
          );
        }
      } catch (_) {
        setSaveStatus("unsaved");
      }
    }, 800);
  }

  // ─────────────────────────────────────────────────────────────────
  // 문단 삭제
  // ─────────────────────────────────────────────────────────────────
  async function handleDeleteParagraph(id) {
    if (!window.confirm("이 문단을 삭제하시겠습니까?")) return;
    try {
      await deleteParagraph(id);
      setParagraphs((prev) => prev.filter((p) => p.id !== id));
      if (selectedParaId === id) setSelectedParaId(null);
    } catch (err) {
      alert("삭제 실패: " + err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // 문단 순서 변경 (위/아래)
  // ─────────────────────────────────────────────────────────────────
  async function handleMoveUp(id) {
    const idx = paragraphs.findIndex((p) => p.id === id);
    if (idx <= 0) return;
    const newParas = [...paragraphs];
    [newParas[idx - 1], newParas[idx]] = [newParas[idx], newParas[idx - 1]];
    const reordered = newParas.map((p, i) => ({ ...p, order_index: i }));
    setParagraphs(reordered);
    try {
      await reorderParagraphs(postId, reordered.map((p) => ({ id: p.id, order_index: p.order_index })));
    } catch (err) {
      alert("순서 변경 실패: " + err.message);
    }
  }

  async function handleMoveDown(id) {
    const idx = paragraphs.findIndex((p) => p.id === id);
    if (idx >= paragraphs.length - 1) return;
    const newParas = [...paragraphs];
    [newParas[idx], newParas[idx + 1]] = [newParas[idx + 1], newParas[idx]];
    const reordered = newParas.map((p, i) => ({ ...p, order_index: i }));
    setParagraphs(reordered);
    try {
      await reorderParagraphs(postId, reordered.map((p) => ({ id: p.id, order_index: p.order_index })));
    } catch (err) {
      alert("순서 변경 실패: " + err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // AI: 문단 가이드 재생성
  // ─────────────────────────────────────────────────────────────────
  async function handleRegenerateGuide(id) {
    if (!post) return;
    const para = paragraphs.find((p) => p.id === id);
    if (!para) return;
    const idx = paragraphs.findIndex((p) => p.id === id);
    const prevP = idx > 0 ? paragraphs[idx - 1] : null;
    const nextP = idx < paragraphs.length - 1 ? paragraphs[idx + 1] : null;

    try {
      const result = await aiParagraphGuide({ post, paragraph: para, previousParagraph: prevP, nextParagraph: nextP });
      if (result.success) {
        const guide = result.data.guide || "";
        await handleParagraphChange(id, "guide", guide);
      } else {
        alert("가이드 재생성 실패: " + (result.error || ""));
      }
    } catch (err) {
      alert("가이드 재생성 오류: " + err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // AI: 문단 초안 작성
  // ─────────────────────────────────────────────────────────────────
  async function handleGenerateDraft(id) {
    if (!post) return;
    const para = paragraphs.find((p) => p.id === id);
    if (!para) return;
    const idx = paragraphs.findIndex((p) => p.id === id);
    const prevP = idx > 0 ? paragraphs[idx - 1] : null;
    const nextP = idx < paragraphs.length - 1 ? paragraphs[idx + 1] : null;

    const existing = (para.content || "").trim();
    if (existing.length > 0) {
      const ok = window.confirm(
        "이미 작성한 내용이 있습니다.\n\nAI 초안을 기존 내용 아래에 덧붙일까요?"
      );
      if (!ok) return;
    }

    setParaDraftLoading((prev) => ({ ...prev, [id]: true }));
    setSelectedParaId(id);

    try {
      const result = await aiDraftParagraph({
        post,
        paragraph: para,
        previousParagraph: prevP,
        nextParagraph: nextP,
      });

      if (!result.success) {
        alert("초안 작성 실패: " + (result.error || "") +
          (result.raw ? "\n\n" + result.raw.substring(0, 300) : ""));
        return;
      }

      const draft = (result.data?.draft || "").trim();
      if (!draft) {
        alert("AI가 초안을 비워서 응답했습니다. 다시 시도해 주세요.");
        return;
      }

      const nextContent = existing ? `${existing}\n\n${draft}` : draft;
      handleParagraphChange(id, "content", nextContent);
    } catch (err) {
      alert("초안 작성 오류: " + err.message);
    } finally {
      setParaDraftLoading((prev) => ({ ...prev, [id]: false }));
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // AI: 문단 분석
  // ─────────────────────────────────────────────────────────────────
  const [paraAnalysisMap, setParaAnalysisMap] = useState({});
  const [paraAnalysisLoading, setParaAnalysisLoading] = useState({});

  async function handleAnalyzeParagraph(id) {
    if (!post) return;
    const para = paragraphs.find((p) => p.id === id);
    if (!para) return;
    const idx = paragraphs.findIndex((p) => p.id === id);

    setParaAnalysisLoading((prev) => ({ ...prev, [id]: true }));
    setSelectedParaId(id);

    try {
      const result = await aiAnalyzeParagraph({
        post,
        paragraph: para,
        previousParagraph: idx > 0 ? paragraphs[idx - 1] : null,
        nextParagraph: idx < paragraphs.length - 1 ? paragraphs[idx + 1] : null,
      });

      if (result.success) {
        setParaAnalysisMap((prev) => ({ ...prev, [id]: result.data }));
        // DB 저장
        const score = result.data.score || 0;
        await updateParagraph(id, {
          analysis_json: JSON.stringify(result.data),
          score,
          status: "done",
        });
        setParagraphs((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, analysis_json: JSON.stringify(result.data), score, status: "done" } : p
          )
        );
      } else {
        alert("문단 분석 실패: " + (result.error || "") +
          (result.raw ? "\n\n" + result.raw.substring(0, 300) : ""));
      }
    } catch (err) {
      alert("분석 오류: " + err.message);
    } finally {
      setParaAnalysisLoading((prev) => ({ ...prev, [id]: false }));
    }
  }

  // 이미 저장된 분석 복원
  useEffect(() => {
    const map = {};
    paragraphs.forEach((p) => {
      if (p.analysis_json) {
        try { map[p.id] = JSON.parse(p.analysis_json); } catch (_) {}
      }
    });
    setParaAnalysisMap(map);
  }, [paragraphs.length]);

  // ─────────────────────────────────────────────────────────────────
  // AI: 전체 글 분석
  // ─────────────────────────────────────────────────────────────────
  async function handleAnalyzePost() {
    if (!post) return;
    setPostAnalysisLoading(true);
    setPostAnalysis(null);
    try {
      const result = await aiAnalyzePost({ post, paragraphs });
      if (result.success) {
        setPostAnalysis(result.data);
        await updatePost(postId, { overall_analysis_json: JSON.stringify(result.data) });
      } else {
        alert("전체 분석 실패: " + (result.error || "") +
          (result.raw ? "\n\n" + result.raw.substring(0, 300) : ""));
      }
    } catch (err) {
      alert("전체 분석 오류: " + err.message);
    } finally {
      setPostAnalysisLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Markdown 내보내기
  // ─────────────────────────────────────────────────────────────────
  async function handleExport() {
    try {
      const blob = await downloadMarkdown(postId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${post?.title || post?.topic || "blog-post"}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Markdown 내보내기 실패: " + err.message);
    }
  }

  async function handleAiProviderChange(nextProvider) {
    const providerModels = aiSettings.verifiedModels?.[nextProvider] || [];
    const nextModel = providerModels[0]?.value || "";
    setAiSettings((prev) => ({ ...prev, provider: nextProvider, model: nextModel }));
    setAiSwitchSaving(true);
    try {
      await saveSettings({
        provider: nextProvider,
        model: nextModel,
        ollamaUrl: aiSettings.ollamaUrl,
      });
    } catch (err) {
      alert("AI 선택 변경 실패: " + err.message);
      await loadAiSettings();
    } finally {
      setAiSwitchSaving(false);
    }
  }

  async function handleAiModelChange(nextModel) {
    setAiSettings((prev) => ({ ...prev, model: nextModel }));
    setAiSwitchSaving(true);
    try {
      await saveSettings({
        provider: aiSettings.provider,
        model: nextModel,
        ollamaUrl: aiSettings.ollamaUrl,
      });
    } catch (err) {
      alert("모델 변경 실패: " + err.message);
      await loadAiSettings();
    } finally {
      setAiSwitchSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // 현재 선택 문단
  // ─────────────────────────────────────────────────────────────────
  const selectedPara = paragraphs.find((p) => p.id === selectedParaId) || null;
  const currentAnalysis = selectedParaId ? paraAnalysisMap[selectedParaId] : null;
  const availableProviders = Object.entries(aiSettings.hasKey || {})
    .filter(([key, ok]) => ok && (aiSettings.verifiedModels?.[key] || []).length > 0)
    .map(([key]) => key);
  if (
    aiSettings.provider === "ollama"
    && (aiSettings.verifiedModels?.ollama || []).length > 0
    && !availableProviders.includes("ollama")
  ) {
    availableProviders.push("ollama");
  }
  const activeProviderModels = aiSettings.verifiedModels?.[aiSettings.provider] || [];

  // ─────────────────────────────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────────────────────────────
  if (loading) return <div className="loading" style={{ height: "100vh" }}>불러오는 중...</div>;
  if (error) return (
    <div style={{ padding: 40, color: "var(--red)" }}>
      오류: {error}
      <br /><button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate("/")}>← 대시보드로</button>
    </div>
  );
  if (!post) return null;

  return (
    <div className="editor-layout">
      {/* ── 상단 바 ── */}
      <div className="editor-topbar">
        <div className="editor-topbar-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/")}>← 목록</button>
          <div className="editor-title-display">
            {titleValue || post.topic || "제목 없음"}
          </div>
          <span className={`save-status ${saveStatus}`}>
            {saveStatus === "saving" ? "⟳ 저장 중..." : saveStatus === "unsaved" ? "● 미저장" : "✓ 저장됨"}
          </span>
        </div>
        <div className="editor-topbar-right">
          {availableProviders.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "var(--card2)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "4px 6px",
            }}>
              <select
                value={aiSettings.provider}
                onChange={(e) => handleAiProviderChange(e.target.value)}
                disabled={aiSwitchSaving}
                title="이번 작업에서 사용할 AI"
                style={{
                  background: "transparent", border: "none", color: "var(--text2)",
                  fontSize: "0.78rem", outline: "none", maxWidth: "110px",
                }}
              >
                {availableProviders.map((p) => (
                  <option key={p} value={p}>{PROVIDER_LABELS[p] || p}</option>
                ))}
              </select>
              <select
                value={aiSettings.model}
                onChange={(e) => handleAiModelChange(e.target.value)}
                disabled={aiSwitchSaving || !aiSettings.provider}
                title="이번 작업에서 사용할 모델"
                style={{
                  background: "transparent", border: "none", color: "var(--text2)",
                  fontSize: "0.78rem", outline: "none", maxWidth: "160px",
                }}
              >
                {activeProviderModels.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          )}
          {briefing ? (
            <button className="btn btn-ghost btn-sm" onClick={handleBriefing} disabled={briefingLoading}>
              {briefingLoading ? "분석 중..." : "🔄 브리핑 재생성"}
            </button>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={handleBriefing} disabled={briefingLoading}>
              {briefingLoading ? <><span className="spinning">⟳</span> 분석 중...</> : "🤖 작성 전 브리핑"}
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleAnalyzePost}
            disabled={postAnalysisLoading}
          >
            {postAnalysisLoading ? <><span className="spinning">⟳</span> 분석 중...</> : "📊 전체 분석"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleExport}>
            📥 MD 내보내기
          </button>
          {/* 테마 토글 */}
          <div className="theme-toggle" onClick={toggle} title="테마 전환">
            <span className="theme-toggle-icon" style={{ opacity: theme === "warm" ? 1 : 0.35 }}>🌙</span>
            <div className={`theme-toggle-track${theme === "light" ? " on" : ""}`}>
              <div className="theme-toggle-thumb"></div>
            </div>
            <span className="theme-toggle-icon" style={{ opacity: theme === "light" ? 1 : 0.35 }}>☀️</span>
          </div>
        </div>
      </div>

      {/* ── 에디터 바디 ── */}
      <div className="editor-body">
        {/* 좌측: AI 어드바이스 패널 */}
        <AdvicePanel
          post={post}
          briefing={briefing}
          briefingLoading={briefingLoading}
          selectedParagraph={selectedPara}
          currentAnalysis={currentAnalysis}
          postAnalysis={postAnalysis}
          postAnalysisLoading={postAnalysisLoading}
        />

        {/* 우측: 문단 작성 영역 */}
        <div className="editor-main">
          {/* 제목 입력 */}
          <div className="editor-post-title-wrap">
            <label>글 제목</label>
            <input
              className="editor-post-title-input"
              value={titleValue}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="글 제목을 입력하세요"
            />
          </div>

          {/* 전체 통계 */}
          <LocalStats
            paragraphs={paragraphs}
            mainKeyword={post.main_keyword}
            subKeywords={post.sub_keywords}
            targetLength={post.target_length}
            title={titleValue}
          />

          {/* 문단 섹션 헤더 */}
          <div className="editor-section-label">
            <span>문단 ({paragraphs.length}개)</span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleGenerateOutline}
                disabled={outlineLoading}
              >
                {outlineLoading ? <><span className="spinning">⟳</span> 생성 중...</> : "🤖 AI 문단 구조 생성"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleAddParagraph}>
                + 문단 추가
              </button>
            </div>
          </div>

          {/* 문단 카드 목록 */}
          {paragraphs.length === 0 && (
            <div style={{
              textAlign: "center", padding: "48px 24px",
              color: "var(--text2)", background: "var(--card)",
              border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)"
            }}>
              <p style={{ marginBottom: "16px" }}>아직 문단이 없습니다.</p>
              <p style={{ fontSize: "0.85rem", marginBottom: "20px", color: "var(--text3)" }}>
                AI가 블로그 종류에 맞는 문단 구조를 자동으로 생성해 드립니다.
              </p>
              <button
                className="btn btn-primary"
                onClick={handleGenerateOutline}
                disabled={outlineLoading}
              >
                {outlineLoading ? "생성 중..." : "🤖 AI 문단 구조 자동 생성"}
              </button>
            </div>
          )}

          {paragraphs.map((para, idx) => (
            <ParagraphCard
              key={para.id}
              paragraph={para}
              index={idx}
              total={paragraphs.length}
              isSelected={selectedParaId === para.id}
              analysis={paraAnalysisMap[para.id]}
              analysisLoading={!!paraAnalysisLoading[para.id]}
              draftLoading={!!paraDraftLoading[para.id]}
              mainKeyword={post.main_keyword}
              subKeywords={post.sub_keywords}
              onSelect={() => setSelectedParaId(para.id)}
              onChange={(field, value) => handleParagraphChange(para.id, field, value)}
              onDelete={() => handleDeleteParagraph(para.id)}
              onMoveUp={() => handleMoveUp(para.id)}
              onMoveDown={() => handleMoveDown(para.id)}
              onRegenerateGuide={() => handleRegenerateGuide(para.id)}
              onGenerateDraft={() => handleGenerateDraft(para.id)}
              onAnalyze={() => handleAnalyzeParagraph(para.id)}
            />
          ))}

          {paragraphs.length > 0 && (
            <div style={{ textAlign: "center", paddingTop: "8px" }}>
              <button className="btn btn-ghost btn-sm" onClick={handleAddParagraph}>
                + 문단 추가
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
