/**
 * Demo 存档柜：账号本写在仓库 data/ 里，跟浏览器端口、设备无关。
 * 只认账号 + 密码哈希。没有单独后端进程，挂在 Vite 上。
 */
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const FILE = path.resolve("data/account-book.json");

interface AccountSlot {
  h: string;
  s: unknown;
}

interface AccountBook {
  v: number;
  accounts: Record<string, AccountSlot>;
}

function emptyBook(): AccountBook {
  return { v: 1, accounts: {} };
}

function readBook(): AccountBook {
  try {
    if (!fs.existsSync(FILE)) return emptyBook();
    const d = JSON.parse(fs.readFileSync(FILE, "utf8")) as AccountBook;
    if (!d || typeof d !== "object" || !d.accounts) return emptyBook();
    return { v: 1, accounts: d.accounts };
  } catch {
    return emptyBook();
  }
}

function writeBook(book: AccountBook): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(book));
}

function findKey(book: AccountBook, account: string): string | null {
  const n = account.trim().toLowerCase();
  if (!n) return null;
  for (const k of Object.keys(book.accounts)) {
    if (k.toLowerCase() === n) return k;
  }
  return null;
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const raw = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(raw);
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => {
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
      const n = chunks.reduce((s, b) => s + b.length, 0);
      if (n > 2_000_000) {
        reject(new Error("存档太大"));
        req.destroy();
      }
    });
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new Error("请求读不出来"));
      }
    });
    req.on("error", reject);
  });
}

function pathnameOf(req: IncomingMessage): string {
  const raw = req.url ?? "/";
  const q = raw.indexOf("?");
  return q >= 0 ? raw.slice(0, q) : raw;
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const pathName = pathnameOf(req);
  const method = (req.method ?? "GET").toUpperCase();

  if (pathName === "/api/accounts" && method === "GET") {
    json(res, 200, { names: Object.keys(readBook().accounts) });
    return true;
  }

  if (pathName === "/api/login" && method === "POST") {
    const body = (await readBody(req)) as { account?: unknown; hash?: unknown };
    const account = typeof body.account === "string" ? body.account.trim() : "";
    const hash = typeof body.hash === "string" ? body.hash : "";
    if (!account || !hash) {
      json(res, 400, { error: "账号或密码缺了" });
      return true;
    }
    const book = readBook();
    const key = findKey(book, account);
    if (!key) {
      json(res, 404, { error: "没有这个账号，请先注册" });
      return true;
    }
    const slot = book.accounts[key];
    if (!slot || slot.h !== hash) {
      json(res, 401, { error: "密码不对" });
      return true;
    }
    json(res, 200, { save: slot.s ?? null });
    return true;
  }

  if (pathName === "/api/register" && method === "POST") {
    const body = (await readBody(req)) as { account?: unknown; hash?: unknown; save?: unknown };
    const account = typeof body.account === "string" ? body.account.trim() : "";
    const hash = typeof body.hash === "string" ? body.hash : "";
    if (!account || !hash) {
      json(res, 400, { error: "账号或密码缺了" });
      return true;
    }
    const book = readBook();
    if (findKey(book, account)) {
      json(res, 409, { error: "这个账号已经有人用了" });
      return true;
    }
    book.accounts[account] = { h: hash, s: body.save ?? null };
    writeBook(book);
    json(res, 201, { save: body.save ?? null });
    return true;
  }

  if (pathName === "/api/save" && method === "PUT") {
    const body = (await readBody(req)) as { account?: unknown; hash?: unknown; save?: unknown };
    const account = typeof body.account === "string" ? body.account.trim() : "";
    const hash = typeof body.hash === "string" ? body.hash : "";
    if (!account || !hash) {
      json(res, 400, { error: "账号或密码缺了" });
      return true;
    }
    const book = readBook();
    const key = findKey(book, account);
    if (!key) {
      json(res, 404, { error: "没有这个号" });
      return true;
    }
    const slot = book.accounts[key];
    if (!slot || slot.h !== hash) {
      json(res, 401, { error: "密码不对" });
      return true;
    }
    book.accounts[key] = { h: slot.h, s: body.save ?? null };
    writeBook(book);
    json(res, 200, { ok: true });
    return true;
  }

  return false;
}

function accountApiMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  const pathName = pathnameOf(req);
  if (!pathName.startsWith("/api/")) {
    next();
    return;
  }
  void handle(req, res).then((hit) => {
    if (!hit) next();
  }).catch((e) => {
    const msg = e instanceof Error ? e.message : "存档柜出错";
    if (!res.headersSent) json(res, 500, { error: msg });
  });
}

export function accountApiPlugin(): Plugin {
  return {
    name: "account-book-api",
    configureServer(server) {
      server.middlewares.use(accountApiMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(accountApiMiddleware);
    },
  };
}
