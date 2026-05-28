import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPost, aiSetupHelper } from "../api.js";

const BLOG_TYPES = ["정보성", "홍보", "리뷰"];
const LENGTH_OPTIONS = [1000, 1500, 2000, 2500, 3000, 4000, 5000];

const INIT_FORM = {
  type: "정보성",
  topic: "",
  core_message: "",
  main_keyword: "",
  sub_keywords: "",
  target_reader: "",
  goal: "",
  target_length: 2000,
  product_info: "",
  must_include: "",
  exclude_phrases: "",
};

export default function NewPost() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INIT_FORM);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAiSuggest() {
    if (!form.topic.trim()) {
      alert("주제를 먼저 입력해주세요.");
      return;
    }
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const result = await aiSetupHelper({
        topic: form.topic,
        core_message: form.core_message,
        type: form.type,
      });
      if (result.success) {
        setAiSuggestion(result.data);
      } else {
        alert("AI 추천 실패\n" + (result.error || "알 수 없는 오류") +
          (result.raw ? "\n\n[원문]\n" + result.raw.substring(0, 200) : ""));
      }
    } catch (err) {
      alert("AI 추천 요청 오류: " + err.message);
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiSuggestion() {
    if (!aiSuggestion) return;
    setForm((prev) => ({
      ...prev,
      topic: aiSuggestion.refined_topic || prev.topic,
      main_keyword: aiSuggestion.main_keywords?.[0] || prev.main_keyword,
      sub_keywords: Array.isArray(aiSuggestion.sub_keywords)
        ? aiSuggestion.sub_keywords.join(", ")
        : prev.sub_keywords,
      target_reader: aiSuggestion.target_readers?.[0] || prev.target_reader,
      goal: Array.isArray(aiSuggestion.goals)
        ? aiSuggestion.goals[0]
        : prev.goal,
      must_include: Array.isArray(aiSuggestion.must_include)
        ? aiSuggestion.must_include.join("\n")
        : prev.must_include,
      exclude_phrases: Array.isArray(aiSuggestion.avoid)
        ? aiSuggestion.avoid.join("\n")
        : prev.exclude_phrases,
    }));
    setAiSuggestion(null);
  }

  async function handleSubmit() {
    if (!form.topic.trim()) {
      alert("주제를 입력해주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const post = await createPost({ ...form, title: form.topic });
      navigate(`/style/${post.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate("/")}>
          ← 뒤로
        </button>
        <h2>새 블로그 만들기</h2>
      </div>

      <div className="form-container">
        {/* 블로그 종류 */}
        <div className="form-group">
          <label>블로그 종류 *</label>
          <div className="type-buttons">
            {BLOG_TYPES.map((t) => (
              <button
                key={t}
                className={`type-btn ${form.type === t ? "active" : ""}`}
                onClick={() => set("type", t)}
              >
                {t === "정보성" ? "📋 " : t === "홍보" ? "📢 " : "⭐ "}
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 주제 */}
        <div className="form-group">
          <label>주제 *</label>
          <input
            className="input"
            value={form.topic}
            onChange={(e) => set("topic", e.target.value)}
            placeholder="예: 네이버 블로그 글쓰기 노하우"
          />
        </div>

        {/* 핵심 내용 */}
        <div className="form-group">
          <label>핵심 내용</label>
          <textarea
            className="textarea"
            value={form.core_message}
            onChange={(e) => set("core_message", e.target.value)}
            placeholder="독자에게 전달하고 싶은 핵심 메시지를 입력하세요."
            rows={3}
          />
        </div>

        {/* AI 추천 버튼 */}
        <div className="ai-helper-section">
          <button
            className="btn btn-secondary"
            onClick={handleAiSuggest}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <>
                <span className="spinning">⟳</span> AI 분석 중...
              </>
            ) : (
              "🤖 AI로 기본 정보 추천"
            )}
          </button>
          <span className="help-text">
            주제와 핵심 내용만 입력해도 AI가 키워드·독자·목적을 추천해 드립니다.
          </span>
        </div>

        {/* AI 추천 결과 */}
        {aiSuggestion && (
          <div className="ai-suggestion-box fade-in">
            <h3>🤖 AI 추천 결과</h3>
            <div className="suggestion-grid">
              <div>
                <strong>구체화된 주제:</strong> {aiSuggestion.refined_topic}
              </div>
              <div>
                <strong>대표 키워드:</strong>{" "}
                {aiSuggestion.main_keywords?.join(", ")}
              </div>
              <div>
                <strong>보조 키워드:</strong>{" "}
                {aiSuggestion.sub_keywords?.join(", ")}
              </div>
              <div>
                <strong>대상 독자:</strong>{" "}
                {aiSuggestion.target_readers?.join(", ")}
              </div>
              <div>
                <strong>검색 의도:</strong> {aiSuggestion.search_intent}
              </div>
              <div>
                <strong>글 목적:</strong> {aiSuggestion.goals?.join(", ")}
              </div>
              <div>
                <strong>반드시 포함:</strong>{" "}
                {aiSuggestion.must_include?.join(", ")}
              </div>
              <div>
                <strong>피해야 할 내용:</strong>{" "}
                {aiSuggestion.avoid?.join(", ")}
              </div>
            </div>
            <div className="suggestion-actions">
              <button className="btn btn-primary" onClick={applyAiSuggestion}>
                ✓ 폼에 적용하기
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setAiSuggestion(null)}
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* 키워드 */}
        <div className="form-row">
          <div className="form-group">
            <label>대표 키워드</label>
            <input
              className="input"
              value={form.main_keyword}
              onChange={(e) => set("main_keyword", e.target.value)}
              placeholder="대표 키워드 1개"
            />
          </div>
          <div className="form-group">
            <label>보조 키워드</label>
            <input
              className="input"
              value={form.sub_keywords}
              onChange={(e) => set("sub_keywords", e.target.value)}
              placeholder="쉼표로 구분 (예: 키워드1, 키워드2)"
            />
          </div>
        </div>

        {/* 독자 / 목적 */}
        <div className="form-row">
          <div className="form-group">
            <label>대상 독자</label>
            <input
              className="input"
              value={form.target_reader}
              onChange={(e) => set("target_reader", e.target.value)}
              placeholder="예: 블로그를 시작하는 초보자"
            />
          </div>
          <div className="form-group">
            <label>글 목적</label>
            <input
              className="input"
              value={form.goal}
              onChange={(e) => set("goal", e.target.value)}
              placeholder="예: 검색 유입 증가, 상담 신청 유도"
            />
          </div>
        </div>

        {/* 목표 글자 수 */}
        <div className="form-group">
          <label>목표 글자 수</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {LENGTH_OPTIONS.map((len) => (
              <button
                key={len}
                className={`type-btn ${form.target_length === len ? "active" : ""}`}
                onClick={() => set("target_length", len)}
              >
                {len.toLocaleString()}자
              </button>
            ))}
          </div>
        </div>

        {/* 홍보 글: 상품/서비스 정보 */}
        {form.type === "홍보" && (
          <div className="form-group">
            <label>상품/서비스 정보</label>
            <textarea
              className="textarea"
              value={form.product_info}
              onChange={(e) => set("product_info", e.target.value)}
              placeholder="홍보할 상품이나 서비스 정보를 입력하세요."
              rows={3}
            />
          </div>
        )}

        {/* 반드시 포함 / 제외 표현 */}
        <div className="form-row">
          <div className="form-group">
            <label>반드시 포함할 내용</label>
            <textarea
              className="textarea"
              value={form.must_include}
              onChange={(e) => set("must_include", e.target.value)}
              placeholder="반드시 포함해야 할 내용"
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>제외할 표현</label>
            <textarea
              className="textarea"
              value={form.exclude_phrases}
              onChange={(e) => set("exclude_phrases", e.target.value)}
              placeholder="사용하지 말아야 할 표현"
              rows={2}
            />
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => navigate("/")}>
            취소
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "생성 중..." : "다음: 스타일 선택 →"}
          </button>
        </div>
      </div>
    </div>
  );
}
