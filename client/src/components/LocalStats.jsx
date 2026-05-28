import React from "react";
import { countWords } from "../utils/textStats.js";

export default function LocalStats({ paragraphs, mainKeyword, subKeywords, targetLength, title }) {
  // 전체 글 합산
  const allContent = paragraphs.map((p) => p.content || "").join(" ");
  const totalChars = allContent.replace(/\s/g, "").length;
  const totalCharsWithSpace = allContent.length;

  // 목표 달성률
  const progress = targetLength ? Math.min(100, Math.round((totalCharsWithSpace / targetLength) * 100)) : 0;

  // 키워드 체크
  const mainKwCount = mainKeyword
    ? (allContent.toLowerCase().match(
        new RegExp(mainKeyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
      ) || []).length
    : 0;

  const mainInTitle = mainKeyword && title
    ? title.toLowerCase().includes(mainKeyword.toLowerCase())
    : false;

  const subKwList = subKeywords
    ? subKeywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [];

  const subKwFound = subKwList.filter((kw) =>
    allContent.toLowerCase().includes(kw.toLowerCase())
  );

  // 전체 반복 단어
  const { topRepeated } = countWords(allContent, 5);

  // 완료 문단 수
  const doneParagraphs = paragraphs.filter((p) => p.status === "done").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* 진행률 바 */}
      <div style={{ background: "var(--card2)", borderRadius: "var(--radius)", padding: "10px 14px", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text2)", fontWeight: 600 }}>
            글자 수 진행률
          </span>
          <span style={{ fontSize: "0.78rem", color: progress >= 100 ? "var(--green)" : "var(--text3)" }}>
            {totalCharsWithSpace.toLocaleString()} / {(targetLength || 2000).toLocaleString()}자
            {" "}({progress}%)
          </span>
        </div>
        <div style={{
          height: "6px", borderRadius: "3px", background: "var(--card)",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            borderRadius: "3px",
            background: progress >= 100 ? "var(--green)" : progress >= 70 ? "var(--accent)" : "var(--yellow)",
            transition: "width 0.3s ease",
          }} />
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="local-stats">
        <div className="stat-item">
          <span className="stat-value">{totalChars.toLocaleString()}</span>
          <span className="stat-label">공백제외 글자</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{paragraphs.length}</span>
          <span className="stat-label">전체 문단</span>
        </div>
        <div className="stat-item">
          <span
            className="stat-value"
            style={{ color: doneParagraphs === paragraphs.length && paragraphs.length > 0 ? "var(--green)" : "var(--text)" }}
          >
            {doneParagraphs}
          </span>
          <span className="stat-label">분석 완료</span>
        </div>
        {mainKeyword && (
          <div className="stat-item">
            <span
              className="stat-value"
              style={{ color: mainKwCount > 0 ? "var(--green)" : "var(--red)" }}
            >
              {mainKwCount}
            </span>
            <span className="stat-label">대표KW</span>
          </div>
        )}
        {mainKeyword && (
          <div className="stat-item">
            <span
              className="stat-value"
              style={{ color: mainInTitle ? "var(--green)" : "var(--red)", fontSize: "0.9rem" }}
            >
              {mainInTitle ? "✓" : "✗"}
            </span>
            <span className="stat-label">제목KW</span>
          </div>
        )}
        {subKwList.length > 0 && (
          <div className="stat-item">
            <span
              className="stat-value"
              style={{ color: subKwFound.length === subKwList.length ? "var(--green)" : "var(--yellow)" }}
            >
              {subKwFound.length}/{subKwList.length}
            </span>
            <span className="stat-label">보조KW</span>
          </div>
        )}
      </div>

      {/* 반복 단어 */}
      {topRepeated.length > 0 && (
        <div style={{
          background: "var(--card2)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", padding: "8px 12px",
        }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", marginBottom: "5px" }}>
            🔁 많이 쓴 단어 (로컬 체크)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {topRepeated.map((w) => (
              <span
                key={w.word}
                style={{
                  padding: "2px 8px", borderRadius: "99px",
                  background: "var(--card)", border: "1px solid var(--border)",
                  fontSize: "0.75rem", color: "var(--text2)",
                }}
              >
                {w.word} <strong style={{ color: "var(--yellow)" }}>{w.count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
