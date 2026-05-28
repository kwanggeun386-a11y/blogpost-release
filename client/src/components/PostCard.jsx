import React from "react";

const TYPE_CLASS = { 정보성: "type-info", 홍보: "type-promo", 리뷰: "type-review" };
const STATUS_LABEL = { draft: "작성 전", writing: "작성 중", done: "완료" };

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return d.toLocaleDateString("ko-KR");
}

export default function PostCard({ post, onEdit, onDelete }) {
  const typeClass = TYPE_CLASS[post.type] || "";
  const statusClass = post.status === "done" ? "status-done" : "status-draft";
  const avgScore = post.avg_score ? Math.round(post.avg_score) : null;

  return (
    <div className="post-card" onClick={onEdit}>
      <div className="post-card-header">
        <div className="post-card-title">
          {post.title || post.topic || "제목 없음"}
        </div>
        <div className="post-card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="btn btn-ghost btn-xs"
            onClick={onEdit}
            title="편집"
          >
            ✏️
          </button>
          <button
            className="btn btn-danger btn-xs"
            onClick={onDelete}
            title="삭제"
          >
            🗑
          </button>
        </div>
      </div>

      <div className="post-card-meta">
        <span className={`meta-badge ${typeClass}`}>{post.type}</span>
        <span className={`meta-badge ${statusClass}`}>
          {STATUS_LABEL[post.status] || post.status}
        </span>
        {post.style && (
          <span className="meta-badge">{post.style}</span>
        )}
      </div>

      {post.main_keyword && (
        <div style={{ fontSize: "0.8rem", color: "var(--text2)", marginBottom: "6px" }}>
          🔑 {post.main_keyword}
        </div>
      )}

      <div className="post-card-footer">
        <span>📄 {post.paragraph_count || 0}개 문단</span>
        {avgScore !== null && (
          <span
            style={{
              color:
                avgScore >= 80 ? "var(--green)" :
                avgScore >= 60 ? "var(--yellow)" : "var(--red)",
              fontWeight: 600,
            }}
          >
            ★ {avgScore}점
          </span>
        )}
        <span>{formatDate(post.updated_at)}</span>
      </div>
    </div>
  );
}
