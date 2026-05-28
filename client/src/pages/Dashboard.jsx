import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPosts, deletePost, getSettingsStatus, unlockSettings } from "../api.js";
import PostCard from "../components/PostCard.jsx";
import { useTheme } from "../hooks/useTheme.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [posts,    setPosts]    = useState([]);
  const [filter,   setFilter]   = useState("all");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [aiReady,  setAiReady]  = useState(true); // AI 설정 완료 여부
  const [aiLocked, setAiLocked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    loadPosts();
    checkAiStatus();
  }, []);

  async function loadPosts() {
    try {
      setLoading(true); setError(null);
      setPosts(await getPosts());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkAiStatus() {
    try {
      const s = await getSettingsStatus();
      setAiReady(s.configured);
      setAiLocked(!!s.locked);
      setNeedsSetup(!!s.needsSetup);
    } catch (_) {}
  }

  async function handleUnlock() {
    setUnlocking(true);
    setUnlockError("");
    try {
      await unlockSettings(unlockPassword);
      setAiLocked(false);
      setUnlockPassword("");
      await checkAiStatus();
    } catch (err) {
      setUnlockError(err.message);
    } finally {
      setUnlocking(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("이 작업을 삭제하시겠습니까? 모든 문단도 함께 삭제됩니다.")) return;
    try {
      await deletePost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert("삭제 실패: " + err.message);
    }
  }

  const filtered = posts.filter((p) => {
    if (filter === "draft") return p.status !== "done";
    if (filter === "done")  return p.status === "done";
    return true;
  });
  const draftCount = posts.filter((p) => p.status !== "done").length;
  const doneCount  = posts.filter((p) => p.status === "done").length;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-title">
          <span className="header-icon">✍️</span>
          <h1>블로그 팩토리</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            className="btn"
            onClick={() => navigate("/settings")}
            style={{
              background: !aiReady || aiLocked ? "var(--yellow-bg)" : "none",
              border: !aiReady || aiLocked ? "1px solid color-mix(in srgb, var(--yellow) 38%, var(--border))" : "1px solid var(--border)",
              color: !aiReady || aiLocked ? "var(--yellow)" : "var(--text3)",
              padding: "6px 14px", fontSize: "0.8rem", fontWeight: 600,
            }}
            title="AI 설정"
          >
            {!aiReady ? "⚠ AI 설정 필요" : aiLocked ? "🔒 API 키 잠김" : "⚙ AI 설정"}
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/new")}>
            + 새 블로그
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
      </header>

      {/* AI 미설정 배너 */}
      {(!aiReady || aiLocked) && (
        <div
          onClick={() => navigate("/settings")}
          style={{
            background: "var(--yellow-bg)", border: "1px solid color-mix(in srgb, var(--yellow) 38%, var(--border))",
            borderRadius: "var(--radius)", padding: "10px 16px", margin: "0 0 16px",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "10px",
            fontSize: "0.85rem", color: "var(--yellow)",
          }}
        >
          <span>{aiLocked ? "🔒" : "⚠"}</span>
          <span>
            {aiLocked
              ? "저장된 API 키가 잠겨 있습니다. 마스터 비밀번호를 입력하면 바로 이어서 작업할 수 있습니다."
              : "AI 기능을 사용하려면 먼저 AI 설정에서 API를 등록해 주세요."}
          </span>
          <span style={{ marginLeft: "auto", fontSize: "0.78rem" }}>{aiLocked ? "잠금 해제" : "설정하기"} →</span>
        </div>
      )}

      <div className="filter-tabs">
        <button className={`filter-tab ${filter === "all"   ? "active" : ""}`} onClick={() => setFilter("all")}>
          전체 <span className="count">{posts.length}</span>
        </button>
        <button className={`filter-tab ${filter === "draft" ? "active" : ""}`} onClick={() => setFilter("draft")}>
          작성 중 <span className="count">{draftCount}</span>
        </button>
        <button className={`filter-tab ${filter === "done"  ? "active" : ""}`} onClick={() => setFilter("done")}>
          완료 <span className="count">{doneCount}</span>
        </button>
      </div>

      {loading && <div className="loading">불러오는 중...</div>}
      {error   && (
        <div className="error-msg">
          서버 연결 오류: {error}
          <br /><small>시작.bat으로 서버가 실행 중인지 확인하세요.</small>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <p>{filter === "all" ? "아직 블로그 작업이 없습니다." : filter === "done" ? "완료된 작업이 없습니다." : "작성 중인 작업이 없습니다."}</p>
          {filter === "all" && (
            <button className="btn btn-primary" onClick={() => navigate("/new")}>
              첫 번째 블로그 시작하기 →
            </button>
          )}
        </div>
      )}

      <div className="post-grid">
        {filtered.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onEdit={() => navigate(`/editor/${post.id}`)}
            onDelete={() => handleDelete(post.id)}
          />
        ))}
      </div>

      {aiLocked && !needsSetup && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(2,6,23,0.72)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px", zIndex: 60,
        }}>
          <div style={{
            width: "100%", maxWidth: "420px", background: "var(--card)",
            border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
            padding: "22px", boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>
              API 키 잠금 해제
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text3)", lineHeight: 1.7, marginBottom: "14px" }}>
              저장된 API 키는 암호화되어 있습니다. 마스터 비밀번호를 입력하면 이 실행 중인 앱에서 AI 기능을 바로 사용할 수 있습니다.
            </p>
            <input
              type="password"
              placeholder="마스터 비밀번호"
              value={unlockPassword}
              onChange={(e) => { setUnlockPassword(e.target.value); setUnlockError(""); }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && unlockPassword.length >= 4) handleUnlock();
              }}
              style={{
                width: "100%", background: "var(--card2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", padding: "10px 12px",
                color: "var(--text)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
              }}
            />
            {unlockError && (
              <div style={{ color: "var(--red)", fontSize: "0.78rem", marginTop: "8px" }}>
                {unlockError}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginTop: "14px", alignItems: "center" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/settings")}>
                API 설정
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleUnlock}
                disabled={unlocking || unlockPassword.length < 4}
              >
                {unlocking ? "확인 중..." : "잠금 해제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
