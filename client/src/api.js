const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
let sessionTokenPromise = null;

async function getSessionToken() {
  if (!sessionTokenPromise) {
    sessionTokenPromise = fetch(`${API_BASE}/session`)
      .then((res) => {
        if (!res.ok) throw new Error("로컬 세션을 시작하지 못했습니다.");
        return res.json();
      })
      .then((data) => data.token);
  }
  return sessionTokenPromise;
}

async function request(method, path, body = null) {
  const token = await getSessionToken();
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-BlogFactory-Session": token,
    },
  };
  if (body !== null) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    let msg = "서버 오류가 발생했습니다.";
    let data = null;
    try { data = await res.json(); msg = data.error || msg; } catch (_) {}
    const err = new Error(msg);
    if (data) err.data = data;
    throw err;
  }
  return res.json();
}

async function download(method, path) {
  const token = await getSessionToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "X-BlogFactory-Session": token },
  });
  if (!res.ok) {
    let msg = "다운로드 중 서버 오류가 발생했습니다.";
    try { msg = (await res.json()).error || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.blob();
}

// ── Settings ──────────────────────────────────────────────────────────
export const getSettings      = ()     => request("GET",  "/settings");
export const saveSettings     = (data) => request("PUT",  "/settings", data);
export const testConnection   = (data) => request("POST", "/settings/test", data);
export const getSettingsStatus = ()    => request("GET",  "/settings/status");
export const getModels        = ()     => request("GET",  "/settings/models");
export const deleteApiKey     = (p)    => request("DELETE", `/settings/api-key/${p}`);
export const unlockSettings   = (masterPassword) => request("POST", "/settings/unlock", { masterPassword });
export const lockSettings     = () => request("POST", "/settings/lock");

// ── Posts ──────────────────────────────────────────────────────────────
export const getPosts    = ()        => request("GET",    "/posts");
export const getPost     = (id)      => request("GET",    `/posts/${id}`);
export const createPost  = (data)    => request("POST",   "/posts", data);
export const updatePost  = (id, d)   => request("PUT",    `/posts/${id}`, d);
export const deletePost  = (id)      => request("DELETE", `/posts/${id}`);

// ── Paragraphs ────────────────────────────────────────────────────────
export const addParagraph      = (postId, d) => request("POST",   `/posts/${postId}/paragraphs`, d);
export const updateParagraph   = (id, d)     => request("PUT",    `/paragraphs/${id}`, d);
export const deleteParagraph   = (id)        => request("DELETE", `/paragraphs/${id}`);
export const reorderParagraphs = (postId, o) => request("PUT",    `/posts/${postId}/paragraphs/reorder`, { order: o });

// ── AI ────────────────────────────────────────────────────────────────
export const aiSetupHelper      = (d) => request("POST", "/ai/setup-helper", d);
export const aiBriefing         = (d) => request("POST", "/ai/briefing", d);
export const aiOutline          = (d) => request("POST", "/ai/outline", d);
export const aiParagraphGuide   = (d) => request("POST", "/ai/paragraph-guide", d);
export const aiDraftParagraph   = (d) => request("POST", "/ai/draft-paragraph", d);
export const aiAnalyzeParagraph = (d) => request("POST", "/ai/analyze-paragraph", d);
export const aiAnalyzePost      = (d) => request("POST", "/ai/analyze-post", d);

// ── Export ────────────────────────────────────────────────────────────
export const downloadMarkdown = (postId) => download("GET", `/export/${postId}/markdown`);
