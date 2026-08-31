import { useEffect, useState } from "react";
import { useGame } from "../store/gameStore";
import { ART } from "../art/assets";
import { CharImg } from "../art/Art";
import {
  ACCOUNT_RULE,
  PASSWORD_RULE,
  hasLegacySave,
  readRememberedAuth,
  writeRememberedAuth,
} from "../save/accounts";

type Mode = "login" | "register";

export default function LoginScene() {
  const login = useGame((s) => s.login);
  const register = useGame((s) => s.register);
  const remembered = readRememberedAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [account, setAccount] = useState(remembered?.account ?? "");
  const [password, setPassword] = useState(remembered?.password ?? "");
  const [password2, setPassword2] = useState("");
  const [remember, setRemember] = useState(Boolean(remembered));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const leftover = hasLegacySave();

  useEffect(() => {
    setError("");
    setPassword2("");
  }, [mode]);

  function toggleRemember(on: boolean) {
    setRemember(on);
    if (!on) writeRememberedAuth(null);
  }

  async function submit() {
    if (busy) return;
    if (mode === "register" && password !== password2) {
      setError("两次密码不一样");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const err = mode === "login"
        ? await login(account, password, remember)
        : await register(account, password, remember);
      if (err) setError(err);
    } catch {
      setError(mode === "login" ? "登录失败，请换浏览器再试" : "注册失败，请换浏览器再试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login" style={{ backgroundImage: `url(${ART.bgLogin})` }}>
      <div className="login-card">
        <CharImg className="login-hero" size={140} />
        <h1>钓鱼佬日常</h1>
        <p className="login-sub">出钓养鱼，木框里的小日子</p>
        <div className="login-tabs" role="tablist">
          <button
            type="button"
            className={mode === "login" ? "tab is-on" : "tab"}
            onClick={() => setMode("login")}
          >
            登录
          </button>
          <button
            type="button"
            className={mode === "register" ? "tab is-on" : "tab"}
            onClick={() => setMode("register")}
          >
            注册
          </button>
        </div>
        <p className="login-ver">
          {mode === "login" ? "用已有账号进入。每个账号全柜唯一。" : "注册新账号。名字不能和别人重复。"}
        </p>
        {mode === "register" && leftover && (
          <p className="login-hint">发现你之前的存档，注册后会接到这个新号上。</p>
        )}
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
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            maxLength={20}
            placeholder={PASSWORD_RULE}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && mode === "login") void submit(); }}
          />
        </label>
        {mode === "register" && (
          <label className="login-field">
            <span>确认密码</span>
            <input
              type="password"
              autoComplete="new-password"
              maxLength={20}
              placeholder="再输一遍"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
            />
          </label>
        )}
        <label className="login-check">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => toggleRemember(e.target.checked)}
          />
          记住账号密码
        </label>
        {error && <p className="login-err">{error}</p>}
        <button className="primary login-btn" disabled={busy} onClick={() => void submit()}>
          {busy ? "请稍候…" : mode === "login" ? "登录" : "注册并进入"}
        </button>
        <p className="login-ver">账密只记在这台浏览器。存档跟账号走，换设备用同一组就能接上。</p>
      </div>
    </div>
  );
}
