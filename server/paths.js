/**
 * paths.js — pkg 실행 환경과 일반 Node.js 환경 모두에서 올바른 경로를 반환
 *
 * pkg로 묶인 실행파일은 __dirname이 가상 스냅샷(읽기 전용)을 가리키므로
 * 쓰기 가능한 경로는 process.execPath 기준(실행파일 옆 폴더)으로 계산해야 한다.
 *
 * 배포 구조:
 *   BlogFactory/
 *   ├── BlogFactory.exe      ← pkg 번들 (Node.js 내장)
 *   ├── client/dist/         ← React 빌드 결과물
 *   └── data/                ← 자동 생성 (settings.json, DB)
 *
 * 개발 구조 (node server/index.js):
 *   blog-writing-factory/
 *   ├── server/
 *   ├── client/dist/
 *   └── data/                ← server/data/ 에 저장
 */

const path = require("path");
const fs   = require("fs");

/** pkg 런타임 여부 */
const IS_PKG = !!process.pkg;

/**
 * 쓰기 가능한 루트 경로
 *  - pkg : 실행파일(BlogFactory.exe)이 있는 폴더
 *  - dev : 프로젝트 루트 (server/의 상위)
 */
const ROOT = IS_PKG
  ? path.dirname(process.execPath)
  : path.join(__dirname, "..");

/** data/ 폴더 (settings.json + DB) */
const DATA_DIR = path.join(ROOT, "data");

/** SQLite DB 파일 경로 */
const DB_PATH = path.join(DATA_DIR, "blog_factory.db");

/** AI 설정 파일 경로 */
const SETTINGS_PATH = path.join(DATA_DIR, "settings.json");

/** React 빌드 결과물 경로 */
const DIST_PATH = path.join(ROOT, "client", "dist");

/** data/ 폴더가 없으면 자동 생성 */
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log("📁 data 폴더 생성:", DATA_DIR);
}

module.exports = { IS_PKG, ROOT, DATA_DIR, DB_PATH, SETTINGS_PATH, DIST_PATH };
