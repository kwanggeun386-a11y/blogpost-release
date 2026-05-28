import React, { useState } from "react";
import { countWords } from "../utils/textStats.js";

const ROLES = [
  "도입", "문제 공감", "상황 설명", "핵심 개념", "원인 분석",
  "해결 방법", "실무 팁", "예시", "비교", "주의사항",
  "체크리스트", "후기/경험", "요약", "마무리", "CTA",
];

const STATUS_DOT = { pending: "pending", writing: "writing", done: "done" };

export default function ParagraphCard({
  paragraph, index, total,
  isSelected, analysis, analysisLoading, draftLoading,
  mainKeyword, subKeywords,
  onSelect, onChange, onDelete, onMoveUp, onMoveDown,
  onRegenerateGuide, onGenerateDraft, onAnalyze,
}) {
  const [guideOpen, setGuideOpen] = useState(true);

  const content = paragraph.content || "";
  const charCount = content.replace(/\s/g, "").length;
  const fullCharCount = content.length;

  // 로컬 키워드 체크
  const hasMain = mainKeyword
    ? content.toLowerCase().includes(mainKeyword.toLowerCase())
    : false;

  const subKwList = subKeywords
    ? subKeywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [];
  const foundSub = subKwList.filter((kw) =>
    content.toLowerCase().includes(kw.toLowerCase())
  );

  // 로컬 반복 단어 (단순 빈도)
  const { topRepeated } = countWords(content);

  return (
    <div
      className={`paragraph-card ${isSelected ? "selected" : ""} ${paragraph.status === "done" ? "status-done" : ""}`}
      onClick={onSelect}
    >
      {/* ── 카드 헤더 ── */}
      <div className="paragraph-card-header">
        <span className="para-order">{index + 1}</span>
        <span className="para-role-badge">{paragraph.role}</span>
        <input
          className="para-title-input"
          value={paragraph.title || ""}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="문단 소제목..."
          onClick={(e) => e.stopPropagation()}
        />
        <span
          className={`para-status-dot ${STATUS_DOT[paragraph.status] || "pending"}`}
          title={paragraph.status}
        />
        <div
          className="para-header-actions"
          onClick={(e) => e.stopPropagation()}
        >
          {index > 0 && (
            <button className="btn btn-ghost btn-xs" onClick={onMoveUp} title="위로">↑</button>
          )}
          {index < total - 1 && (
            <button className="btn btn-ghost btn-xs" onClick={onMoveDown} title="아래로">↓</button>
          )}
          <button className="btn btn-danger btn-xs" onClick={onDelete} title="삭제">✕</button>
        </div>
      </div>

      {/* ── 카드 바디 ── */}
      <div className="paragraph-card-body" onClick={(e) => e.stopPropagation()}>
        {/* 역할 변경 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text3)", whiteSpace: "nowrap" }}>역할:</label>
          <select
            className="para-role-select"
            value={paragraph.role}
            onChange={(e) => onChange("role", e.target.value)}
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            className="btn btn-ghost btn-xs"
            onClick={onRegenerateGuide}
            title="가이드 재생성"
            style={{ marginLeft: "auto" }}
          >
            🔄 가이드 재생성
          </button>
          <button
            className="btn btn-secondary btn-xs"
            onClick={onGenerateDraft}
            disabled={draftLoading}
            title="현재 문단 초안 작성"
          >
            {draftLoading ? <><span className="spinning">⟳</span> 초안 중...</> : "✍ AI 초안 작성"}
          </button>
        </div>

        {/* 작성 가이드 */}
        {paragraph.guide && (
          <div className="para-guide-box">
            <div className="para-guide-box-header">
              <span className="para-guide-label">📌 작성 가이드</span>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setGuideOpen((v) => !v)}
              >
                {guideOpen ? "접기" : "펼치기"}
              </button>
            </div>
            {guideOpen && <div>{paragraph.guide}</div>}
          </div>
        )}

        {/* 본문 입력 */}
        <textarea
          className="para-content-textarea"
          value={content}
          onChange={(e) => onChange("content", e.target.value)}
          placeholder={`[${paragraph.role}] 문단 내용을 직접 작성하세요...`}
          rows={6}
        />

        {/* 푸터: 통계 + 분석 버튼 */}
        <div className="para-footer">
          <div className="para-stats">
            <span>{fullCharCount}자</span>
            {mainKeyword && (
              <span className={hasMain ? "kw-found" : "kw-missing"}>
                {hasMain ? "✓" : "✗"} 대표KW
              </span>
            )}
            {subKwList.length > 0 && (
              <span className={foundSub.length > 0 ? "kw-found" : "kw-missing"}>
                보조KW {foundSub.length}/{subKwList.length}
              </span>
            )}
            {topRepeated.length > 0 && (
              <span title={topRepeated.map((w) => `'${w.word}' ${w.count}회`).join(", ")}>
                🔁 {topRepeated[0]?.word}({topRepeated[0]?.count})
              </span>
            )}
            {paragraph.score > 0 && (
              <span
                style={{
                  color:
                    paragraph.score >= 80 ? "var(--green)" :
                    paragraph.score >= 60 ? "var(--yellow)" : "var(--red)",
                  fontWeight: 600,
                }}
              >
                ★{paragraph.score}
              </span>
            )}
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={onAnalyze}
            disabled={analysisLoading || !content.trim()}
          >
            {analysisLoading ? (
              <><span className="spinning">⟳</span> 분석 중...</>
            ) : (
              "🔍 AI 분석하기"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
