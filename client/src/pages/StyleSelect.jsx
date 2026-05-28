import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { updatePost } from "../api.js";

const STYLES = [
  {
    id: "전문가",
    icon: "🎯",
    label: "전문가",
    desc: "논리적이고 신뢰감 있는 전문 정보 전달",
    tags: ["해요체", "논리적", "전문적", "실용적"],
    analysisFocus: "논리성, 근거, 전문성, 실무성을 중점 분석",
  },
  {
    id: "쉬운 설명",
    icon: "📖",
    label: "쉬운 설명",
    desc: "초보자도 쉽게 이해할 수 있는 친절한 설명",
    tags: ["초보자용", "예시 중심", "친절함", "쉬운 표현"],
    analysisFocus: "어려운 표현, 초보자 이해도, 예시 부족을 중점 분석",
  },
  {
    id: "솔직한 후기",
    icon: "💬",
    label: "솔직한 후기",
    desc: "경험담 중심의 진솔하고 자연스러운 리뷰",
    tags: ["경험담", "구어체", "자연스러움", "리뷰형"],
    analysisFocus: "경험담 진정성, 구어체 자연스러움, 공감 요소를 중점 분석",
  },
  {
    id: "위트 있는 전문가",
    icon: "😄",
    label: "위트 있는 전문가",
    desc: "전문성을 유지하면서도 재미있고 친근하게",
    tags: ["전문성", "유머", "정보성", "친근함"],
    analysisFocus: "전문성과 유머 균형, 정보 정확성을 중점 분석",
  },
  {
    id: "귀엽고 친근한 블로거",
    icon: "🌸",
    label: "귀엽고 친근한 블로거",
    desc: "감성적이고 부드러운 친근감 있는 글체",
    tags: ["친근함", "감성적", "부드러움", "쉬운 표현"],
    analysisFocus: "친근감, 표현의 부드러움, 독자 친화성을 중점 분석",
  },
  {
    id: "분석가",
    icon: "📊",
    label: "분석가",
    desc: "데이터와 근거 중심의 객관적 비교 분석",
    tags: ["객관적", "비교", "논리적", "근거"],
    analysisFocus: "객관성, 비교 공정성, 근거 타당성, 논리 구조를 중점 분석",
  },
];

export default function StyleSelect() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState("전문가");
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    setLoading(true);
    try {
      await updatePost(postId, { style: selected });
      navigate(`/editor/${postId}`);
    } catch (err) {
      alert("오류: " + err.message);
      setLoading(false);
    }
  }

  const selectedStyle = STYLES.find((s) => s.id === selected);

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          ← 뒤로
        </button>
        <h2>글쓰기 스타일 선택</h2>
      </div>

      <p className="page-desc">
        스타일은 문단 작성 가이드와 AI 분석 기준에도 반영됩니다.
      </p>

      <div className="style-grid">
        {STYLES.map((style) => (
          <div
            key={style.id}
            className={`style-card ${selected === style.id ? "selected" : ""}`}
            onClick={() => setSelected(style.id)}
          >
            <div className="style-icon">{style.icon}</div>
            <div className="style-label">{style.label}</div>
            <div className="style-desc">{style.desc}</div>
            <div className="style-tags">
              {style.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedStyle && (
        <div
          className="ai-helper-section"
          style={{ marginBottom: "24px" }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--text2)" }}>
            <strong style={{ color: "var(--accent)" }}>
              {selectedStyle.icon} {selectedStyle.label}
            </strong>{" "}
            선택됨 — AI 분석 기준: {selectedStyle.analysisFocus}
          </span>
        </div>
      )}

      <div className="form-actions">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          뒤로
        </button>
        <button
          className="btn btn-primary"
          onClick={handleNext}
          disabled={loading}
        >
          {loading ? "처리 중..." : "작성 시작하기 →"}
        </button>
      </div>
    </div>
  );
}
