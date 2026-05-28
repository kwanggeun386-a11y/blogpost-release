import React from "react";
import BriefingBox from "./BriefingBox.jsx";
import AnalysisResult from "./AnalysisResult.jsx";

export default function AdvicePanel({
  post,
  briefing,
  briefingLoading,
  selectedParagraph,
  currentAnalysis,
  postAnalysis,
  postAnalysisLoading,
}) {
  return (
    <div className="advice-panel">
      <div className="advice-panel-header">
        🤖 AI 어드바이스
        {selectedParagraph && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.75rem",
              color: "var(--accent)",
              fontWeight: 400,
            }}
          >
            [{selectedParagraph.role}] 선택됨
          </span>
        )}
      </div>

      <div className="advice-panel-body">
        {/* 로딩 */}
        {briefingLoading && (
          <div className="ai-loading">
            <span className="spinning">⟳</span> 브리핑 생성 중...
          </div>
        )}

        {/* 작성 전 브리핑 */}
        {briefing && !briefingLoading && (
          <BriefingBox briefing={briefing} />
        )}

        {/* 브리핑 없을 때 안내 */}
        {!briefing && !briefingLoading && (
          <div className="advice-section">
            <div className="advice-section-title">💡 시작하기</div>
            <div className="advice-section-content" style={{ fontSize: "0.8rem" }}>
              상단의 <strong style={{ color: "var(--accent)" }}>🤖 작성 전 브리핑</strong> 버튼을 눌러 AI 브리핑을 받아보세요.
              <br /><br />
              브리핑에는 핵심 방향, 독자 궁금증, 추천 흐름이 포함됩니다.
            </div>
          </div>
        )}

        {/* 현재 선택 문단 정보 */}
        {selectedParagraph && (
          <div className="advice-section">
            <div className="advice-section-title">📝 선택된 문단</div>
            <div className="advice-section-content">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span
                  style={{
                    padding: "2px 8px", borderRadius: "99px",
                    background: "var(--accent-bg)", color: "var(--accent)",
                    fontSize: "0.75rem", fontWeight: 600,
                  }}
                >
                  {selectedParagraph.role}
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {selectedParagraph.title || "(제목 없음)"}
                </span>
              </div>
              {selectedParagraph.guide && (
                <div
                  style={{
                    fontSize: "0.78rem", color: "var(--text2)",
                    lineHeight: "1.7", whiteSpace: "pre-line",
                    background: "var(--card2)", borderRadius: "var(--radius)",
                    padding: "8px 10px",
                  }}
                >
                  {selectedParagraph.guide}
                </div>
              )}
              {!selectedParagraph.guide && (
                <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>
                  가이드가 없습니다. '🔄 가이드 재생성' 버튼을 눌러보세요.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 문단 분석 결과 */}
        {currentAnalysis && selectedParagraph && (
          <AnalysisResult analysis={currentAnalysis} type="paragraph" />
        )}

        {/* 문단 선택 안내 */}
        {!selectedParagraph && !postAnalysis && (
          <div className="advice-section">
            <div className="advice-section-title">👆 문단 선택</div>
            <div className="advice-section-content" style={{ fontSize: "0.8rem" }}>
              우측에서 문단을 클릭하면 해당 문단의 작성 가이드와 분석 결과가 여기에 표시됩니다.
            </div>
          </div>
        )}

        {/* 전체 분석 로딩 */}
        {postAnalysisLoading && (
          <div className="ai-loading">
            <span className="spinning">⟳</span> 전체 글 분석 중...
          </div>
        )}

        {/* 전체 글 분석 결과 */}
        {postAnalysis && !postAnalysisLoading && (
          <AnalysisResult analysis={postAnalysis} type="post" />
        )}
      </div>
    </div>
  );
}
