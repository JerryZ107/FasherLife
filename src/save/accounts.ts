/**
 * 账号本。真档在游戏服务 data/account-book.json，按账号+密码哈希读写。
 * 本机 localStorage 只做这台浏览器的缓存，方便存档柜暂时连不上时接着玩。
 */

const BOOK_KEY = "fishing-daily-accounts-v1";
const SESSION_KEY = "fishing-daily-session-v1";
const SESSION_HASH_KEY = "fishing-daily-session-h-v1";
const REMEMBER_KEY = "fishing-daily-remember-v1";
const LEGACY_SAVE_KEY = "fishing-daily-save-v1";

interface AccountSlot {
  h: string;
  s: unknown;
}

interface AccountBook {
  v: number;
  accounts: Record<string, AccountSlot>;
}

export const ACCOUNT_RULE = "2～16 字，字母数字下划线或中文";
export const PASSWORD_RULE = "4～20 位";

function emptyBook(): AccountBook {
  return { v: 1, accounts: {} };
}

function readBook(): AccountBook {
  try {
    const raw = localStorage.getItem(BOOK_KEY);
    if (!raw) return emptyBook();
    const d = JSON.parse(raw) as AccountBook;
    if (!d || typeof d !== "object" || !d.accounts) return emptyBook();
    return { v: 1, accounts: d.accounts };
  } catch {
    return emptyBook();
  }
}

function writeBook(book: AccountBook): void {
  try {
    localStorage.setItem(BOOK_KEY, JSON.stringify(book));
  } catch {
    throw new Error("本机存档写不进去，关掉无痕/隐私模式再试");
  }
}

function findKey(book: AccountBook, account: string): string | null {
  const n = account.trim().toLowerCase();
  if (!n) return null;
  for (const k of Object.keys(book.accounts)) {
    if (k.toLowerCase() === n) return k;
  }
  return null;
}

export function normalizeAccount(account: string): string {
  return account.trim();
}

export function validateAccount(account: string): string | null {
  const id = normalizeAccount(account);
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]{2,16}$/.test(id)) return `账号：${ACCOUNT_RULE}`;
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 4 || password.length > 20) return `密码：${PASSWORD_RULE}`;
  return null;
}

export async function hashPassword(account: string, password: string): Promise<string> {
  const text = `${normalizeAccount(account).toLowerCase()}:${password}`;
  return sha256Hex(text);
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", bytes);
    return hex(new Uint8Array(buf));
  }
  return hex(sha256Bytes(bytes));
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 手机用 http://局域网IP 时没有 subtle，用同一套 SHA-256。 */
function sha256Bytes(message: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const bitLen = message.length * 8;
  const withOne = message.length + 1;
  const pad = (64 - ((withOne + 8) % 64)) % 64;
  const buf = new Uint8Array(withOne + pad + 8);
  buf.set(message);
  buf[message.length] = 0x80;
  new DataView(buf.buffer).setUint32(buf.length - 4, bitLen, false);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < buf.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      const j = i + t * 4;
      w[t] = (buf[j] << 24) | (buf[j + 1] << 16) | (buf[j + 2] << 8) | buf[j + 3];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = H[i] >>> 24;
    out[i * 4 + 1] = (H[i] >>> 16) & 255;
    out[i * 4 + 2] = (H[i] >>> 8) & 255;
    out[i * 4 + 3] = H[i] & 255;
  }
  return out;
}

export function getSessionAccount(): string | null {
  try {
    const id = localStorage.getItem(SESSION_KEY);
    return id ? normalizeAccount(id) : null;
  } catch {
    return null;
  }
}

export function getSessionHash(): string | null {
  try {
    return localStorage.getItem(SESSION_HASH_KEY);
  } catch {
    return null;
  }
}

export function setSessionAccount(account: string | null, hash?: string | null): void {
  try {
    if (account) {
      localStorage.setItem(SESSION_KEY, normalizeAccount(account));
      if (hash) localStorage.setItem(SESSION_HASH_KEY, hash);
    } else {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_HASH_KEY);
    }
  } catch {
    throw new Error("本机存档写不进去，关掉无痕/隐私模式再试");
  }
}

export function accountExists(account: string): boolean {
  return findKey(readBook(), account) != null;
}

export function createAccountSlot(account: string, passHash: string, save: unknown): string | null {
  const id = normalizeAccount(account);
  const err = validateAccount(id);
  if (err) return err;
  const book = readBook();
  if (findKey(book, id)) return "这个账号已经注册过了";
  book.accounts[id] = { h: passHash, s: save };
  writeBook(book);
  return null;
}

export function verifyAccountHash(account: string, passHash: string): boolean {
  const book = readBook();
  const key = findKey(book, account);
  if (!key) return false;
  return book.accounts[key]?.h === passHash;
}

export function readAccountSaveRaw(account: string): unknown | null {
  const book = readBook();
  const key = findKey(book, account);
  if (!key) return null;
  return book.accounts[key]?.s ?? null;
}

export function writeAccountSaveRaw(account: string, save: unknown): void {
  const book = readBook();
  const key = findKey(book, account);
  if (!key) return;
  const slot = book.accounts[key];
  if (!slot) return;
  book.accounts[key] = { h: slot.h, s: save };
  writeBook(book);
}

/** 登录成功后写入本机缓存（没有这个号就建槽）。 */
export function upsertLocalSlot(account: string, passHash: string, save: unknown): void {
  const id = normalizeAccount(account);
  const book = readBook();
  const key = findKey(book, id) ?? id;
  book.accounts[key] = { h: passHash, s: save };
  writeBook(book);
}

export function readCurrentSaveRaw(): unknown | null {
  const acc = getSessionAccount();
  if (!acc) return null;
  return readAccountSaveRaw(acc);
}

let pendingSave: unknown | undefined;
let saving = false;

export function writeCurrentSaveRaw(save: unknown): void {
  const acc = getSessionAccount();
  if (!acc) return;
  writeAccountSaveRaw(acc, save);
  pendingSave = save;
  void flushRemoteSave();
}

async function flushRemoteSave(): Promise<void> {
  if (saving) return;
  saving = true;
  try {
    while (pendingSave !== undefined) {
      const save = pendingSave;
      pendingSave = undefined;
      const acc = getSessionAccount();
      const hash = getSessionHash();
      if (!acc || !hash) return;
      const err = await remoteWrite(acc, hash, save);
      if (err) console.error(err);
    }
  } finally {
    saving = false;
    if (pendingSave !== undefined) void flushRemoteSave();
  }
}

export async function fetchAccountNames(): Promise<string[]> {
  const local = listAccountNames();
  try {
    const r = await fetch("/api/accounts");
    if (!r.ok) return local;
    const d = (await r.json()) as { names?: unknown };
    const remote = Array.isArray(d.names) ? d.names.filter((n): n is string => typeof n === "string") : [];
    const seen = new Set(remote.map((n) => n.toLowerCase()));
    for (const n of local) {
      if (!seen.has(n.toLowerCase())) remote.push(n);
    }
    return remote;
  } catch {
    return local;
  }
}

export type RemoteSave =
  | { ok: true; save: unknown }
  | { ok: false; error: string };

export async function remoteLogin(account: string, hash: string): Promise<RemoteSave> {
  try {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, hash }),
    });
    const d = (await r.json().catch(() => ({}))) as { error?: unknown; save?: unknown };
    if (!r.ok) {
      return {
        ok: false,
        error:
          typeof d.error === "string"
            ? d.error
            : r.status === 401
              ? "密码不对"
              : r.status === 404
                ? "没有这个账号，请先注册"
                : "存档柜打不开",
      };
    }
    return { ok: true, save: d.save };
  } catch {
    return { ok: false, error: "连不上存档柜。先开着游戏服务再试。" };
  }
}

export async function remoteRegister(account: string, hash: string, save: unknown): Promise<RemoteSave> {
  try {
    const r = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, hash, save }),
    });
    const d = (await r.json().catch(() => ({}))) as { error?: unknown; save?: unknown };
    if (!r.ok) {
      return {
        ok: false,
        error:
          typeof d.error === "string"
            ? d.error
            : r.status === 409
              ? "这个账号已经有人用了"
              : "存档柜打不开",
      };
    }
    return { ok: true, save: d.save };
  } catch {
    return { ok: false, error: "连不上存档柜。先开着游戏服务再试。" };
  }
}

export type RememberedAuth = { account: string; password: string };

export function readRememberedAuth(): RememberedAuth | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<RememberedAuth>;
    if (typeof d.account !== "string" || typeof d.password !== "string") return null;
    const account = normalizeAccount(d.account);
    if (!account || !d.password) return null;
    return { account, password: d.password };
  } catch {
    return null;
  }
}

export function writeRememberedAuth(auth: RememberedAuth | null): void {
  try {
    if (!auth) localStorage.removeItem(REMEMBER_KEY);
    else localStorage.setItem(REMEMBER_KEY, JSON.stringify({
      account: normalizeAccount(auth.account),
      password: auth.password,
    }));
  } catch {
    /* 记住账密写失败时不影响登录 */
  }
}

async function remoteWrite(account: string, hash: string, save: unknown): Promise<string | null> {
  try {
    const r = await fetch("/api/save", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, hash, save }),
    });
    if (r.ok) return null;
    const d = (await r.json().catch(() => ({}))) as { error?: unknown };
    return typeof d.error === "string" ? d.error : "存档柜写不进去";
  } catch {
    return "连不上存档柜";
  }
}

export function listAccountNames(): string[] {
  return Object.keys(readBook().accounts);
}

/** 旧版「只填钓手名」的单槽。读到后先不要删，等并入成功再 clear。 */
export function peekLegacySaveRaw(): unknown | null {
  try {
    const raw = localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasLegacySave(): boolean {
  try {
    return localStorage.getItem(LEGACY_SAVE_KEY) != null;
  } catch {
    return false;
  }
}

export function clearLegacySave(): void {
  try {
    localStorage.removeItem(LEGACY_SAVE_KEY);
  } catch {
    /* ignore */
  }
}
