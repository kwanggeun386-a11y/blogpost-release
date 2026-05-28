const crypto = require("crypto");
const fs = require("fs");
const { SETTINGS_PATH } = require("./paths");

const DEFAULT_SETTINGS = {
  provider: "",
  model: "",
  apiKeys: {
    gemini: "",
    openai: "",
    claude: "",
  },
  verifiedModels: {
    gemini: [],
    openai: [],
    claude: [],
    ollama: [],
  },
  ollamaUrl: "http://localhost:11434",
  crypto: null,
};

let activeKey = null;

function loadSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...(parsed.apiKeys || {}) },
      verifiedModels: {
        ...DEFAULT_SETTINGS.verifiedModels,
        ...(parsed.verifiedModels || {}),
      },
    };
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(data) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), "utf8");
}

function deriveKey(password, saltHex) {
  return crypto.scryptSync(password, Buffer.from(saltHex, "hex"), 32);
}

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function ensureCrypto(settings, password) {
  if (settings.crypto?.salt && settings.crypto?.verifier) {
    const key = deriveKey(password, settings.crypto.salt);
    const verifier = sha256Hex(Buffer.concat([key, Buffer.from("blog-factory-verifier-v1")]));
    if (verifier !== settings.crypto.verifier) {
      throw new Error("마스터 비밀번호가 올바르지 않습니다.");
    }
    activeKey = key;
    return { settings, key };
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const key = deriveKey(password, salt);
  const verifier = sha256Hex(Buffer.concat([key, Buffer.from("blog-factory-verifier-v1")]));
  const next = { ...settings, crypto: { version: 1, salt, verifier } };
  saveSettings(next);
  activeKey = key;
  return { settings: next, key };
}

function isEncryptedValue(value) {
  return !!value && typeof value === "object" && value.encrypted === true;
}

function hasPlainTextKeys(settings) {
  return Object.values(settings.apiKeys || {}).some(
    (value) => typeof value === "string" && value.trim().length > 0
  );
}

function encryptText(text, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: true,
    version: 1,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    data: encrypted.toString("hex"),
    hint: text.substring(0, 6),
  };
}

function decryptText(value, key = activeKey) {
  if (!isEncryptedValue(value)) return value || "";
  if (!key) throw new Error("API 키가 잠겨 있습니다. AI 설정에서 마스터 비밀번호를 입력해 주세요.");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(value.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(value.tag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.data, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

function unlock(password) {
  if (!password || password.length < 4) {
    throw new Error("마스터 비밀번호를 4자 이상 입력해 주세요.");
  }
  const settings = loadSettings();
  const ensured = ensureCrypto(settings, password);
  if (hasPlainTextKeys(ensured.settings)) {
    const migrated = { ...ensured.settings, apiKeys: { ...ensured.settings.apiKeys } };
    Object.entries(migrated.apiKeys).forEach(([provider, value]) => {
      if (typeof value === "string" && value.trim()) {
        migrated.apiKeys[provider] = encryptText(value.trim(), ensured.key);
      }
    });
    saveSettings(migrated);
  }
  return true;
}

function lock() {
  activeKey = null;
}

function isLocked() {
  const settings = loadSettings();
  const hasEncryptedKey = Object.values(settings.apiKeys || {}).some(isEncryptedValue);
  return hasEncryptedKey && !activeKey;
}

function getApiKey(provider) {
  const settings = loadSettings();
  const value = settings.apiKeys?.[provider];
  return decryptText(value);
}

function hasApiKey(provider) {
  const settings = loadSettings();
  return !!settings.apiKeys?.[provider];
}

function getRegisteredProviders() {
  const settings = loadSettings();
  return Object.entries(settings.apiKeys || {})
    .filter(([, value]) => !!value)
    .map(([provider]) => provider);
}

function hasMasterPassword() {
  const settings = loadSettings();
  return !!settings.crypto?.salt && !!settings.crypto?.verifier;
}

function maskApiKey(value) {
  if (!value) return "";
  if (isEncryptedValue(value)) return `${value.hint || "••••••"}••••••`;
  return value.length > 6 ? value.substring(0, 6) + "••••••" : "••••••";
}

function setApiKey(provider, apiKey, password) {
  const settings = loadSettings();
  let key = activeKey;
  let next = settings;

  if (!key) {
    if (!password) {
      throw new Error("API 키 저장에는 마스터 비밀번호가 필요합니다.");
    }
    const ensured = ensureCrypto(settings, password);
    next = ensured.settings;
    key = ensured.key;
  }

  next.apiKeys = {
    ...next.apiKeys,
    [provider]: encryptText(apiKey, key),
  };
  saveSettings(next);
}

function deleteApiKey(provider) {
  const settings = loadSettings();
  const registeredBeforeDelete = Object.entries(settings.apiKeys || {})
    .filter(([key, value]) => key !== provider && !!value)
    .map(([key]) => key);
  settings.apiKeys = { ...settings.apiKeys, [provider]: "" };
  settings.verifiedModels = { ...settings.verifiedModels, [provider]: [] };
  if (settings.provider === provider) {
    const nextProvider = registeredBeforeDelete[0] || "";
    settings.provider = nextProvider;
    settings.model = settings.verifiedModels?.[nextProvider]?.[0]?.value || "";
  }
  saveSettings(settings);
}

function getPublicSettings() {
  const settings = loadSettings();
  const maskedKeys = {};
  Object.keys(settings.apiKeys || {}).forEach((k) => {
    maskedKeys[k] = maskApiKey(settings.apiKeys[k]);
  });
  return {
    ...settings,
    apiKeys: maskedKeys,
    crypto: settings.crypto ? { version: settings.crypto.version || 1 } : null,
    locked: isLocked(),
  };
}

function getRuntimeSettings() {
  const settings = loadSettings();
  const provider = settings.provider || "";
  const apiKeys = { ...settings.apiKeys };
  if (provider && provider !== "ollama" && apiKeys[provider]) {
    apiKeys[provider] = getApiKey(provider);
  }
  return { ...settings, apiKeys };
}

module.exports = {
  loadSettings,
  saveSettings,
  unlock,
  lock,
  isLocked,
  getApiKey,
  hasApiKey,
  getRegisteredProviders,
  hasMasterPassword,
  setApiKey,
  deleteApiKey,
  getPublicSettings,
  getRuntimeSettings,
};
