require("dotenv").config();
const express      = require("express");
const cors         = require("cors");
const fs           = require("fs");
const { execSync } = require("child_process");
const { DIST_PATH, DB_PATH, IS_PKG } = require("./paths");
const {
  corsOptions,
  requireLocalRequest,
  requireSession,
  sessionRoute,
} = require("./security");

// 개발 모드에서 포트 충돌 자동 해결 (pkg 실행 시에는 건드리지 않음)
if (!IS_PKG) {
  try {
    execSync(`lsof -ti:${process.env.PORT || 3001} | xargs kill -9 2>/dev/null || true`, { stdio: "ignore" });
  } catch (_) {}
}

const app  = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "127.0.0.1";

app.set("trust proxy", false);
app.use(requireLocalRequest);
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

// ── API 라우트 ────────────────────────────────────────────────────────
app.get("/api/session", sessionRoute);
app.use("/api/settings",   requireSession, require("./routes/settings"));
app.use("/api/posts",      requireSession, require("./routes/posts"));
app.use("/api/paragraphs", requireSession, require("./routes/paragraphs"));
app.use("/api/ai",         requireSession, require("./routes/ai"));
app.use("/api/export",     requireSession, require("./routes/export"));

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// ── React 정적 파일 서빙 ──────────────────────────────────────────────
// 빌드된 client/dist/ 폴더가 있으면 서빙 (프로덕션 / pkg 실행)
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  // SPA 라우팅: 모든 미매핑 GET 요청을 index.html로
  app.get("*", (_req, res) => {
    res.sendFile(require("path").join(DIST_PATH, "index.html"));
  });
  console.log("📦 정적 파일 서빙:", DIST_PATH);
} else {
  console.log("ℹ️  개발 모드: Vite dev 서버 사용 (npm run dev)");
}

// ── DB 초기화 ─────────────────────────────────────────────────────────
require("./db");

app.listen(PORT, HOST, () => {
  console.log(`\n✍️  블로그 팩토리 서버 실행 중`);
  console.log(`   주소: http://${HOST}:${PORT}`);
  console.log(`   DB:   ${DB_PATH}`);
  if (IS_PKG) console.log(`   모드: 단독 실행파일 (pkg)\n`);
  else        console.log(`   모드: Node.js 직접 실행\n`);
});
