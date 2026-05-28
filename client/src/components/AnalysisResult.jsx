import React, { useState } from "react";

function ScoreBadge({ score }) {
  const cls =
    score >= 80 ? "score-high" : score >= 60 ? "score-mid" : "score-low";
  return <div className={`score-badge ${cls}`}>{score}</div>;
}

export default function AnalysisResult({ analysis, type }) {
  const [open, setOpen] = useState(true);

  if (!analysis) return null;

  if (type === "paragraph") {
    return (
      <div className="advice-section fade-in">
        <div
          className="advice-section-title"
          style={{ cursor: "pointer" }}
          onClick={() => setOpen((v) => !v)}
        >
          🔍 문단 분석 결과
          <span style={{ marginLeft: "auto", fontSize: "0.75rem" }}>{open ? "▲" : "▼"}</span>
        </div>

        {open && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* 점수 */}
            <div className="score-row">
              <ScoreBadge score={analysis.score || 0} />
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text2)" }}>
                  완성도 점수
                </div>
                {analysis.roleFit && (
                  <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>
                    {analysis.roleFit}
                  </div>
                )}
              </div>
            </div>

            {/* 잘된 점 */}
            {analysis.strengths?.length > 0 && (
              <Section title="✅ 잘된 점" color="var(--green)">
                {analysis.strengths.map((s, i) => (
                  <Item key={i} text={s} bullet="✓" color="var(--green)" />
                ))}
              </Section>
            )}

            {/* 아쉬운 점 */}
            {analysis.weaknesses?.length > 0 && (
              <Section title="⚠️ 아쉬운 점" color="var(--yellow)">
                {analysis.weaknesses.map((w, i) => (
                  <Item key={i} text={w} bullet="•" color="var(--yellow)" />
                ))}
              </Section>
            )}

            {/* 오탈자 */}
            {analysis.typos?.length > 0 && (
              <Section title="❌ 오탈자">
                {analysis.typos.map((t, i) => (
                  <div key={i} className="typo-item">
                    <span className="original">"{t.original}"</span>
                    <span className="suggested">→ "{t.suggested}"</span>
                    <span className="reason">{t.reason}</span>
                  </div>
                ))}
              </Section>
            )}

            {/* 어색한 표현 */}
            {analysis.awkwardExpressions?.length > 0 && (
              <Section title="💬 어색한 표현">
                {analysis.awkwardExpressions.map((a, i) => (
                  <div key={i} className="awkward-item">
                    <span className="original">"{a.original}"</span>
                    <span className="suggested">→ "{a.suggested}"</span>
                    <span className="reason">{a.reason}</span>
                  </div>
                ))}
              </Section>
            )}

            {/* 반복 단어 */}
            {analysis.repeatedWords?.length > 0 && (
              <Section title="🔁 반복 단어">
                {analysis.repeatedWords.map((r, i) => (
                  <div key={i} style={{ fontSize: "0.8rem", color: "var(--text2)", marginBottom: "4px" }}>
                    <strong style={{ color: "var(--yellow)" }}>'{r.word}'</strong>{" "}
                    {r.count}회 — {r.comment}
                  </div>
                ))}
              </Section>
            )}

            {/* 키워드 체크 */}
            {analysis.keywordCheck && (
              <Section title="🔑 키워드 반영">
                <div className="keyword-check">
                  <div className="kw-row">
                    <span className={analysis.keywordCheck.mainKeywordIncluded ? "kw-ok" : "kw-ng"}>
                      {analysis.keywordCheck.mainKeywordIncluded ? "✓" : "✗"}
                    </span>
                    <span style={{ fontSize: "0.8rem" }}>대표 키워드</span>
                  </div>
                  {analysis.keywordCheck.subKeywordsIncluded?.map((kw, i) => (
                    <div key={i} className="kw-row">
                      <span className="kw-ok">✓</span>
                      <span style={{ fontSize: "0.78rem" }}>{kw}</span>
                    </div>
                  ))}
                  {analysis.keywordCheck.missingSubKeywords?.map((kw, i) => (
                    <div key={i} className="kw-row">
                      <span className="kw-ng">✗</span>
                      <span style={{ fontSize: "0.78rem", color: "var(--text3)" }}>{kw} (누락)</span>
                    </div>
                  ))}
                  {analysis.keywordCheck.keywordNaturalness && (
                    <div style={{ fontSize: "0.78rem", color: "var(--text3)", marginTop: "3px" }}>
                      {analysis.keywordCheck.keywordNaturalness}
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* 독자 불편 */}
            {analysis.readerFriction?.length > 0 && (
              <Section title="👤 독자 불편 요소" color="var(--red)">
                {analysis.readerFriction.map((r, i) => (
                  <Item key={i} text={r} bullet="⚠" color="var(--red)" />
                ))}
              </Section>
            )}

            {/* 흐름 */}
            {analysis.flow && (
              <Section title="🔗 문단 연결 흐름">
                <div style={{ fontSize: "0.8rem", color: "var(--text2)" }}>{analysis.flow}</div>
              </Section>
            )}

            {/* 보완 제안 */}
            {analysis.suggestions?.length > 0 && (
              <Section title="💡 보완 제안" color="var(--accent)">
                <ul className="suggestion-list">
                  {analysis.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </Section>
            )}

            {/* 수정 예시 */}
            {analysis.rewriteExample && (
              <Section title="✏️ 수정 예시">
                <div className="rewrite-example">{analysis.rewriteExample}</div>
              </Section>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── 전체 글 분석 ───────────────────────────────────────────────────
  if (type === "post") {
    return (
      <div className="advice-section fade-in">
        <div
          className="advice-section-title"
          style={{ cursor: "pointer" }}
          onClick={() => setOpen((v) => !v)}
        >
          📊 전체 글 분석
          <span style={{ marginLeft: "auto", fontSize: "0.75rem" }}>{open ? "▲" : "▼"}</span>
        </div>

        {open && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* 점수 */}
            <div className="score-row">
              <ScoreBadge score={analysis.score || 0} />
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text2)" }}>
                전체 완성도
              </span>
            </div>

            {/* 흐름 */}
            {analysis.flow && (
              <Section title="📑 글 흐름">
                <div style={{ fontSize: "0.8rem", color: "var(--text2)" }}>{analysis.flow}</div>
              </Section>
            )}

            {/* 문단 순서 */}
            {analysis.paragraphOrder && (
              <Section title="📋 문단 순서">
                <div style={{ fontSize: "0.8rem", color: "var(--text2)" }}>{analysis.paragraphOrder}</div>
              </Section>
            )}

            {/* 중복 내용 */}
            {analysis.duplicatedContent?.length > 0 && (
              <Section title="🔁 중복 내용" color="var(--yellow)">
                {analysis.duplicatedContent.map((d, i) => (
                  <Item key={i} text={d} bullet="•" color="var(--yellow)" />
                ))}
              </Section>
            )}

            {/* 누락 내용 */}
            {analysis.missingContent?.length > 0 && (
              <Section title="⚠️ 누락된 내용" color="var(--red)">
                {analysis.missingContent.map((m, i) => (
                  <Item key={i} text={m} bullet="•" color="var(--red)" />
                ))}
              </Section>
            )}

            {/* 키워드 분포 */}
            {analysis.keywordDistribution && (
              <Section title="🔑 키워드 분포">
                <div style={{ fontSize: "0.8rem", color: "var(--text2)" }}>
                  <strong style={{ color: "var(--accent)" }}>
                    '{analysis.keywordDistribution.mainKeyword}'
                  </strong>{" "}
                  {analysis.keywordDistribution.count}회 등장
                  <br />
                  {analysis.keywordDistribution.comment}
                </div>
              </Section>
            )}

            {/* 독자 이탈 */}
            {analysis.readerDropRisk?.length > 0 && (
              <Section title="📉 독자 이탈 위험" color="var(--red)">
                {analysis.readerDropRisk.map((r, i) => (
                  <Item key={i} text={r} bullet="⚠" color="var(--red)" />
                ))}
              </Section>
            )}

            {/* 이미지 추천 */}
            {analysis.imageSuggestions?.length > 0 && (
              <Section title="🖼️ 이미지 추천">
                {analysis.imageSuggestions.map((img, i) => (
                  <div key={i} style={{ fontSize: "0.78rem", color: "var(--text2)", marginBottom: "4px" }}>
                    <strong style={{ color: "var(--text)" }}>{img.position}:</strong> {img.purpose}
                  </div>
                ))}
              </Section>
            )}

            {/* 발행 전 체크리스트 */}
            {analysis.publishingChecklist?.length > 0 && (
              <Section title="✅ 발행 전 체크리스트" color="var(--green)">
                <ul className="checklist">
                  {analysis.publishingChecklist.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}

function Section({ title, color, children }) {
  return (
    <div>
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          color: color || "var(--text3)",
          marginBottom: "5px",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Item({ text, bullet, color }) {
  return (
    <div
      style={{
        fontSize: "0.8rem",
        color: "var(--text2)",
        paddingLeft: "14px",
        position: "relative",
        marginBottom: "3px",
        lineHeight: "1.5",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 0,
          color: color || "var(--accent)",
        }}
      >
        {bullet}
      </span>
      {text}
    </div>
  );
}
