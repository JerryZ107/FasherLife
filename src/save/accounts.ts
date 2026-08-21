/**
 * 本地账号本。Demo 无后端，密码只做本机校验，按账号分存档槽。
 */

const BOOK_KEY = "fishing-daily-accounts-v1";
const SESSION_KEY = "fishing-daily-session-v1";
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
  localStorage.setItem(BOOK_KEY, JSON.stringify(book));
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
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getSessionAccount(): string | null {
  try {
    const id = localStorage.getItem(SESSION_KEY);
    return id ? normalizeAccount(id) : null;
  } catch {
    return null;
  }
}

export function setSessionAccount(account: string | null): void {
  if (account) localStorage.setItem(SESSION_KEY, normalizeAccount(account));
  else localStorage.removeItem(SESSION_KEY);
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

export function readCurrentSaveRaw(): unknown | null {
  const acc = getSessionAccount();
  if (!acc) return null;
  return readAccountSaveRaw(acc);
}

export function writeCurrentSaveRaw(save: unknown): void {
  const acc = getSessionAccount();
  if (!acc) return;
  writeAccountSaveRaw(acc, save);
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
