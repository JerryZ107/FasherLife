import { useState } from "react";
import { useGame } from "../store/gameStore";
import { ART } from "../art/assets";
import { CharImg } from "../art/Art";
import { ACCOUNT_RULE, PASSWORD_RULE, hasLegacySave, listAccountNames } from "../save/accounts";

export default function LoginScene() {
  const login = useGame((s) => s.login);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const names = listAccountNames();
  const leftover = hasLegacySave();

  async function submit() {
    if (busy) return;
    setError("");
    setBusy(true);
    const err = await login(account, password);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="login" style={{ backgroundImage: `url(${ART.bgLogin})` }}>
      <div className="login-card">
        <CharImg className="login-hero" size={120} />
        <h1>钓鱼佬日常</h1>
        <p className="login-sub">输入账号密码进入；没号就当场开档</p>
        {leftover && <p className="login-hint">发现你之前的存档，进入后会接上。</p>}
        {names.length > 0 && <p className="login-hint">本机账号：{names.join("、")}</p>}
        <label className="login-field">
          <span>账号</span>
          <input
            autoComplete="username"
            maxLength={16}
            placeholder={ACCOUNT_RULE}
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
        </label>
        <label className="login-field">
          <span>密码</span>
          <input
            type="password"
            autoComplete="current-password"
            maxLength={20}
            placeholder={PASSWORD_RULE}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
          />
        </label>
        {error && <p className="login-err">{error}</p>}
        <button className="primary login-btn" disabled={busy} onClick={() => void submit()}>
          {busy ? "请稍候…" : "进入"}
        </button>
        <p className="login-ver">简历作品 Demo · v0.1 · 本机校验，无服务器</p>
      </div>
    </div>
  );
}
