import React, { useState } from "react";

export default function BriefingBox({ briefing }) {
  const [open, setOpen] = useState(true);

  if (!briefing) return null;

  return (
    <div className="advice-section fade-in">
      <div
        className="advice-section-title"
        style={{ cursor: "pointer", userSelect: "none" }}
        onClick={() => setOpen((v) => !v)}
      >
        📋 작성 전 브리핑
        <span style={{ marginLeft: "auto", fontSize: "0.75rem" }}>
          {open ? "▲" : "▼"}
        </span>
      </div>

      {open && (
        <div className="advice-section-content" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* 핵심 방향 */}
          {briefing.core_direction && (
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)", marginBottom: "4px" }}>
                🎯 핵심 방향
              </div>
              <div style={{ fontSize: "0.82rem" }}>{briefing.core_direction}</div>
            </div>
          )}

          {/* 독자 궁금증 */}
          {briefing.reader_questions?.length > 0 && (
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text3)", marginBottom: "4px" }}>
                ❓ 독자가 궁금해할 것
              </div>
              <ul style={{ paddingLeft: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "3px" }}>
                {briefing.reader_questions.map((q, i) => (
                  <li key={i} style={{ fontSize: "0.8rem", paddingLeft: "12px", position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>•</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 반드시 포함 */}
          {briefing.must_cover?.length > 0 && (
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--green)", marginBottom: "4px" }}>
                ✅ 반드시 포함할 내용
              </div>
              <ul style={{ paddingLeft: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "3px" }}>
                {briefing.must_cover.map((m, i) => (
                  <li key={i} style={{ fontSize: "0.8rem", paddingLeft: "12px", position: "relative", color: "var(--text2)" }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--green)" }}>✓</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 주의 표현 */}
          {briefing.caution_expressions?.length > 0 && (
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--yellow)", marginBottom: "4px" }}>
                ⚠️ 주의해야 할 표현
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text2)" }}>
                {briefing.caution_expressions.join(", ")}
              </div>
            </div>
          )}

          {/* 추천 흐름 */}
          {briefing.recommended_flow?.length > 0 && (
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text3)", marginBottom: "4px" }}>
                📑 추천 글 흐름
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {briefing.recommended_flow.map((step, i) => (
                  <div key={i} style={{ fontSize: "0.78rem", color: "var(--text2)", display: "flex", gap: "6px" }}>
                    <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 이미지 추천 */}
          {briefing.image_positions?.length > 0 && (
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text3)", marginBottom: "4px" }}>
                🖼️ 이미지 추천 위치
              </div>
              {briefing.image_positions.map((img, i) => (
                <div key={i} style={{ fontSize: "0.78rem", color: "var(--text2)", marginBottom: "3px" }}>
                  <strong style={{ color: "var(--text)" }}>{img.position}:</strong> {img.purpose}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
