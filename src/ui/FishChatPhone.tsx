import { useEffect, useMemo, useState } from "react";
import { useGame } from "../store/gameStore";
import { useUi } from "../store/uiStore";
import { FISHERY_DEFS } from "../data/fisheryDefs";
import {
  demoFishChatThreads,
  fishChatAvatarColor,
  fishChatInitial,
  fisheryLabel,
  formatInviteRange,
  getFishChatThread,
  inviteExpiredMessage,
  isInviteActive,
  isInviteExpired,
  chatPresenceForName,
  presenceLabel,
  type FishChatInvite,
  type FishChatThread,
} from "../data/chatDefs";
import { getFriendChatThread } from "../data/fishChatThread";
import { getPlayerByUid, normalizePlayerUid, type DemoPlayer } from "../data/playerDefs";
import { FISH_STICKERS } from "../data/stickerDefs";
import { StickerGlyph } from "./StickerGlyph";
import ProfilePanel from "../profile/ProfilePanel";
import FishChatFeedBody, { FishFeedComposer } from "./FishChatFeed";
import { IcoFishSketch } from "./marks";
import { BackChevron } from "./marks";
import type { FishChatTab } from "../store/uiStore";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function defaultInviteWindow(now = Date.now()): { startAt: number; endAt: number } {
  const hour = 3_600_000;
  const base = new Date(now);
  base.setDate(base.getDate() + 1);
  base.setHours(9, 0, 0, 0);
  const startAt = base.getTime();
  return { startAt, endAt: startAt + 3 * hour };
}

function toDatetimeLocalValue(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): number {
  return new Date(value).getTime();
}

type ChatBubble =
  | { kind: "sticker"; glyph: string }
  | { kind: "text"; text: string }
  | { kind: "invite"; invite: FishChatInvite };

const FISH_CHAT_STICKERS = FISH_STICKERS;

type InviteReply = "accepted" | "rejected" | null;

const TABS: { id: FishChatTab; label: string }[] = [
  { id: "msg", label: "消息" },
  { id: "friends", label: "好友" },
  { id: "feed", label: "动态" },
  { id: "mine", label: "我的" },
];

function MessageRow({ thread, onOpen }: { thread: FishChatThread; onOpen: () => void }) {
  const presence = chatPresenceForName(thread.name);
  return (
    <button type="button" className="fishchat-row" onClick={onOpen}>
      <span
        className="fishchat-avatar"
        style={{ background: fishChatAvatarColor(thread.name) }}
        aria-hidden
      >
        {fishChatInitial(thread.name)}
      </span>
      <span className="fishchat-row-main">
        <span className="fishchat-row-top">
          <span className="fishchat-row-name-wrap">
            <strong className="fishchat-row-name">{thread.name}</strong>
            <span className={`fishchat-presence sm is-${presence}`}>{presenceLabel(presence)}</span>
          </span>
          <span className="fishchat-row-time">{thread.time}</span>
        </span>
        <span className="fishchat-row-preview">{thread.preview}</span>
      </span>
      {thread.unread > 0 && <span className="fishchat-badge">{thread.unread}</span>}
    </button>
  );
}

function InviteCard({ invite, expired }: { invite: FishChatInvite; expired?: boolean }) {
  return (
    <div className={`fishchat-invite-card${expired ? " is-expired" : ""}`}>
      <div className="fishchat-invite-title">🎣 钓鱼邀约</div>
      <dl className="fishchat-invite-fields">
        <div>
          <dt>邀请人</dt>
          <dd>{invite.inviter}</dd>
        </div>
        <div>
          <dt>邀请时期</dt>
          <dd>{formatInviteRange(invite.startAt, invite.endAt)}</dd>
        </div>
        <div>
          <dt>钓鱼点</dt>
          <dd>{fisheryLabel(invite.fisheryId)}</dd>
        </div>
        <div>
          <dt>是否有预定</dt>
          <dd>{invite.reserved ? "已预定" : "见机行事"}</dd>
        </div>
      </dl>
    </div>
  );
}

function ChatBubbleRow({
  bubble,
  self,
  selfName,
}: {
  bubble: ChatBubble;
  self?: boolean;
  selfName?: string;
}) {
  const peerAvatar = !self ? null : (
    <span
      className="fishchat-avatar sm"
      style={{ background: fishChatAvatarColor(selfName ?? "我") }}
      aria-hidden
    >
      {fishChatInitial(selfName ?? "我")}
    </span>
  );
  if (bubble.kind === "sticker") {
    return (
      <div className={`fishchat-msg-row${self ? " self" : ""}`}>
        <div className="fishchat-bubble sticker-bubble self">
          <StickerGlyph id={bubble.glyph === "..." ? "dots" : "other"} glyph={bubble.glyph} />
        </div>
        {peerAvatar}
      </div>
    );
  }
  if (bubble.kind === "text") {
    return (
      <div className={`fishchat-msg-row${self ? " self" : ""}`}>
        <div className={`fishchat-bubble text${self ? " self" : " peer"}`}>{bubble.text}</div>
        {peerAvatar}
      </div>
    );
  }
  return (
    <div className={`fishchat-msg-row${self ? " self" : ""}`}>
      <div className={`fishchat-bubble${self ? " self" : " peer"}`}>
        <InviteCard invite={bubble.invite} />
      </div>
      {peerAvatar}
    </div>
  );
}

function ChatDetail({
  thread,
  onBack,
}: {
  thread: FishChatThread;
  onBack: () => void;
}) {
  const setScene = useGame((s) => s.setScene);
  const selectFishery = useGame((s) => s.selectFishery);
  const playerName = useGame((s) => s.save.playerName.trim() || s.account || "钓手");
  const closeFishChat = useUi((s) => s.closeFishChat);
  const setMapPicked = useUi((s) => s.setMapPicked);
  const setMeetFisheryId = useUi((s) => s.setMeetFisheryId);
  const showToast = useUi((s) => s.showToast);

  const defaultWindow = useMemo(() => defaultInviteWindow(), []);
  const [reply, setReply] = useState<InviteReply>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [inviteFormOpen, setInviteFormOpen] = useState(false);
  const [inviteStart, setInviteStart] = useState(() => toDatetimeLocalValue(defaultWindow.startAt));
  const [inviteEnd, setInviteEnd] = useState(() => toDatetimeLocalValue(defaultWindow.endAt));
  const [inviteFishery, setInviteFishery] = useState(FISHERY_DEFS[0]?.id ?? "clear_stream");
  const [inviteReserved, setInviteReserved] = useState(false);
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const inviteExpired = isInviteExpired(thread.invite, now);
  const canMeet = isInviteActive(thread.invite, now);
  const fisheryName = fisheryLabel(thread.invite.fisheryId);
  const presence = chatPresenceForName(thread.name);

  function guardInviteAction(): boolean {
    if (!inviteExpired) return true;
    showToast(inviteExpiredMessage(thread.invite.inviter));
    return false;
  }

  function onAccept() {
    if (!guardInviteAction()) return;
    setReply("accepted");
    setBubbles((prev) => [...prev, { kind: "text", text: "走起" }]);
    showToast("走起");
  }

  function onReject() {
    if (!guardInviteAction()) return;
    setReply("rejected");
    setBubbles((prev) => [...prev, { kind: "text", text: "抱歉" }]);
    showToast(`已拒绝 ${thread.name} 的邀约`);
  }

  function onMeet() {
    if (!canMeet) return;
    selectFishery(thread.invite.fisheryId);
    setMeetFisheryId(thread.invite.fisheryId);
    setMapPicked(thread.invite.fisheryId);
    closeFishChat();
    setScene("fishing_map");
    showToast(`已前往${fisheryName}`);
  }

  function sendSticker(glyph: string) {
    setBubbles((prev) => [...prev, { kind: "sticker", glyph }]);
    setEmojiOpen(false);
  }

  function sendInvite() {
    const startAt = fromDatetimeLocalValue(inviteStart);
    const endAt = fromDatetimeLocalValue(inviteEnd);
    if (!inviteStart || !inviteEnd) {
      showToast("请填写邀请时间");
      return;
    }
    if (Number.isNaN(startAt) || Number.isNaN(endAt)) {
      showToast("邀请时间格式不正确");
      return;
    }
    if (endAt <= startAt) {
      showToast("结束时间须晚于开始时间");
      return;
    }
    if (!inviteFishery) {
      showToast("请选择钓鱼点");
      return;
    }
    const invite: FishChatInvite = {
      inviter: playerName,
      startAt,
      endAt,
      fisheryId: inviteFishery,
      reserved: inviteReserved,
    };
    setBubbles((prev) => [...prev, { kind: "invite", invite }]);
    setInviteFormOpen(false);
    setEmojiOpen(false);
    showToast("邀约已发送");
  }

  return (
    <div className="fishchat-detail">
      <header className="fishchat-detail-head">
        <button type="button" className="fishchat-back" onClick={onBack} aria-label="返回">
          <BackChevron size={18} />
        </button>
        <h2>
          {thread.name}
          <span className={`fishchat-presence is-${presence}`}>{presenceLabel(presence)}</span>
        </h2>
        <span className="fishchat-back-spacer" aria-hidden />
      </header>
      <div className="fishchat-detail-body">
        <div className="fishchat-msg-row peer">
          <span
            className="fishchat-avatar sm"
            style={{ background: fishChatAvatarColor(thread.name) }}
            aria-hidden
          >
            {fishChatInitial(thread.name)}
          </span>
          <div className={`fishchat-bubble peer${inviteExpired ? " is-expired" : ""}`}>
            <InviteCard invite={thread.invite} expired={inviteExpired} />
          </div>
        </div>
        {inviteExpired && (
          <p className="fishchat-invite-expired-tip">{inviteExpiredMessage(thread.invite.inviter)}</p>
        )}
        {bubbles.map((b, i) => (
          <ChatBubbleRow key={`${b.kind}_${i}`} bubble={b} self selfName={playerName} />
        ))}
      </div>
      <div className="fishchat-invite-actions">
        <button
          type="button"
          className={reply === "accepted" ? "primary" : ""}
          disabled={reply != null || inviteExpired}
          onClick={onAccept}
        >
          接受
        </button>
        <button type="button" className="danger" disabled={reply != null || inviteExpired} onClick={onReject}>
          拒绝
        </button>
        <button
          type="button"
          className={canMeet ? "primary" : ""}
          disabled={!canMeet}
          title={canMeet ? `前往${fisheryName}` : "未到邀约时间"}
          onClick={onMeet}
        >
          应约
        </button>
      </div>
      {inviteFormOpen && (
        <div className="fishchat-invite-form">
          <div className="fishchat-invite-form-head">
            <strong>发送邀约</strong>
            <button type="button" className="fishchat-form-close" onClick={() => setInviteFormOpen(false)}>
              取消
            </button>
          </div>
          <label className="fishchat-form-field">
            <span>开始时间</span>
            <input
              type="datetime-local"
              value={inviteStart}
              onChange={(e) => setInviteStart(e.target.value)}
            />
          </label>
          <label className="fishchat-form-field">
            <span>结束时间</span>
            <input
              type="datetime-local"
              value={inviteEnd}
              onChange={(e) => setInviteEnd(e.target.value)}
            />
          </label>
          <label className="fishchat-form-field">
            <span>钓鱼点</span>
            <select value={inviteFishery} onChange={(e) => setInviteFishery(e.target.value)}>
              {FISHERY_DEFS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <div className="fishchat-form-field">
            <span>是否有预定</span>
            <div className="fishchat-form-toggle">
              <button
                type="button"
                className={!inviteReserved ? "primary" : ""}
                onClick={() => setInviteReserved(false)}
              >
                见机行事
              </button>
              <button
                type="button"
                className={inviteReserved ? "primary" : ""}
                onClick={() => setInviteReserved(true)}
              >
                已预定
              </button>
            </div>
          </div>
          <button type="button" className="primary fishchat-form-send" onClick={sendInvite}>
            发送邀约
          </button>
        </div>
      )}
      {emojiOpen && (
        <div className="fishchat-emoji-panel" role="toolbar" aria-label="表情">
          {FISH_CHAT_STICKERS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="fishchat-emoji-btn"
              title={s.label}
              onClick={() => sendSticker(s.glyph)}
            >
              <StickerGlyph id={s.id} glyph={s.glyph} />
            </button>
          ))}
        </div>
      )}
      <footer className="fishchat-composer">
        <button
          type="button"
          className={`fishchat-send-invite${inviteFormOpen ? " open" : ""}`}
          onClick={() => {
            setInviteFormOpen((v) => !v);
            setEmojiOpen(false);
          }}
        >
          发送邀约
        </button>
        <button
          type="button"
          className={`fishchat-emoji-toggle${emojiOpen ? " open" : ""}`}
          aria-label="表情"
          onClick={() => {
            setEmojiOpen((v) => !v);
            setInviteFormOpen(false);
          }}
        >
          ☺
        </button>
      </footer>
    </div>
  );
}

function MessageList({ onOpen }: { onOpen: (id: string) => void }) {
  const threads = useMemo(() => demoFishChatThreads(), []);
  return (
    <ul className="fishchat-list">
      {threads.map((t) => (
        <li key={t.id}>
          <MessageRow thread={t} onOpen={() => onOpen(t.id)} />
        </li>
      ))}
    </ul>
  );
}

function UidSearchBar({ onSearch }: { onSearch: (uid: string) => void }) {
  const [q, setQ] = useState("");
  return (
    <form
      className="fishchat-search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(q);
      }}
    >
      <input
        type="search"
        className="fishchat-search-input"
        placeholder=""
        value={q}
        onChange={(e) => setQ(e.target.value)}
        enterKeyHint="search"
      />
      <button type="submit" className="fishchat-search-btn">
        搜索
      </button>
    </form>
  );
}

function FriendRow({ player, onOpen }: { player: DemoPlayer; onOpen: () => void }) {
  const presence = chatPresenceForName(player.name);
  return (
    <button type="button" className="fishchat-row" onClick={onOpen}>
      <span
        className="fishchat-avatar"
        style={{ background: fishChatAvatarColor(player.name) }}
        aria-hidden
      >
        {fishChatInitial(player.name)}
      </span>
      <span className="fishchat-row-main">
        <span className="fishchat-row-top">
          <span className="fishchat-row-name-wrap">
            <strong className="fishchat-row-name">{player.name}</strong>
            <span className={`fishchat-presence sm is-${presence}`}>{presenceLabel(presence)}</span>
          </span>
        </span>
        <span className="fishchat-row-preview">UID · {player.uid}</span>
      </span>
    </button>
  );
}

function FriendList({ onOpenProfile }: { onOpenProfile: (uid: string) => void }) {
  const friendUids = useUi((s) => s.friendUids);
  const friends = useMemo(
    () =>
      friendUids
        .map((uid) => getPlayerByUid(uid))
        .filter((p): p is DemoPlayer => Boolean(p)),
    [friendUids],
  );

  if (friends.length === 0) {
    return (
      <div className="fishchat-placeholder compact">
        <p>暂无好友</p>
      </div>
    );
  }

  return (
    <ul className="fishchat-list">
      {friends.map((p) => (
        <li key={p.uid}>
          <FriendRow player={p} onOpen={() => onOpenProfile(p.uid)} />
        </li>
      ))}
    </ul>
  );
}

export default function FishChatPhone({ onClose }: { onClose: () => void }) {
  const setScene = useGame((s) => s.setScene);
  const returnScene = useGame((s) => s.save.scene);
  const openPlayerProfile = useUi((s) => s.openPlayerProfile);
  const isFriend = useUi((s) => s.isFriend);
  const showToast = useUi((s) => s.showToast);
  const clearFishChatOpenThread = useUi((s) => s.clearFishChatOpenThread);
  const clearFishChatOpenTab = useUi((s) => s.clearFishChatOpenTab);
  const setFishChatCurrentTab = useUi((s) => s.setFishChatCurrentTab);
  const setFishChatComposeOpen = useUi((s) => s.setFishChatComposeOpen);

  const [tab, setTab] = useState<FishChatTab>("msg");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [feedComposeOpen, setFeedComposeOpen] = useState(false);

  useEffect(() => {
    setFishChatComposeOpen(feedComposeOpen);
    return () => setFishChatComposeOpen(false);
  }, [feedComposeOpen, setFishChatComposeOpen]);

  useEffect(() => {
    const thread = useUi.getState().fishChatOpenThread;
    const tabPref = useUi.getState().fishChatOpenTab;
    if (thread) {
      setDetailId(thread);
      setTab("msg");
      clearFishChatOpenThread();
      return;
    }
    setDetailId(null);
    setTab(tabPref ?? "msg");
    setFishChatCurrentTab(tabPref ?? "msg");
    clearFishChatOpenTab();
    // 仅在渔聊弹窗挂载时同步一次入口 Tab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detail = detailId
    ? getFishChatThread(detailId) ?? (detailId.startsWith("friend_") ? getFriendChatThread(detailId.slice(7)) : undefined)
    : null;

  function goPlayerProfile(rawUid: string) {
    const uid = normalizePlayerUid(rawUid);
    if (!uid) {
      showToast("请输入 UID");
      return;
    }
    const player = getPlayerByUid(uid);
    if (!player) {
      showToast("未找到该 UID 的玩家");
      return;
    }
    openPlayerProfile(player.uid, returnScene);
    onClose();
    setScene("profile");
    if (isFriend(player.uid)) showToast(`已找到好友 ${player.name}`);
    else showToast(`查看 ${player.name} 的主页，可加好友`);
  }

  function onUidSearch(raw: string) {
    goPlayerProfile(raw);
  }

  function tabTitle(id: FishChatTab): string {
    return TABS.find((t) => t.id === id)?.label ?? "";
  }

  function tabBodyClass(id: FishChatTab): string {
    if (id === "mine") return " fishchat-body-mine";
    if (id === "feed") return " fishchat-body-feed";
    return "";
  }

  return (
    <div className="fishchat-backdrop" onClick={onClose} role="presentation">
      <div className="fishchat-wrap" onClick={(e) => e.stopPropagation()}>
        <div className="fishchat-panel" role="dialog" aria-label="渔聊">
          {detail ? (
            <ChatDetail thread={detail} onBack={() => setDetailId(null)} />
          ) : feedComposeOpen ? (
            <FishFeedComposer inline onClose={() => setFeedComposeOpen(false)} />
          ) : (
            <>
              <div className="fishchat-tab-stage">
                <header
                  className={`fishchat-header${tab === "feed" ? " fishchat-header-actions" : ""}`}
                >
                  {tab === "feed" ? (
                    <>
                      <span className="fishchat-header-slot" aria-hidden />
                      <h2>{tabTitle(tab)}</h2>
                      <button
                        type="button"
                        className="fishchat-feed-post-btn"
                        data-guide="fishchat-post"
                        aria-label="发布今日渔获"
                        onClick={() => setFeedComposeOpen(true)}
                      >
                        <IcoFishSketch size={24} />
                      </button>
                    </>
                  ) : (
                    <h2>{tab === "msg" ? "消息" : tabTitle(tab)}</h2>
                  )}
                </header>
                {(tab === "msg" || tab === "friends") && (
                  <UidSearchBar onSearch={onUidSearch} />
                )}
                <div className={`fishchat-body${tabBodyClass(tab)}`}>
                  {tab === "msg" ? (
                    <MessageList onOpen={setDetailId} />
                  ) : tab === "friends" ? (
                    <FriendList onOpenProfile={goPlayerProfile} />
                  ) : tab === "feed" ? (
                    <FishChatFeedBody />
                  ) : (
                    <ProfilePanel embedded onCloseOverlay={onClose} />
                  )}
                </div>
              </div>
              <nav className="fishchat-tabs" aria-label="渔聊导航">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={tab === t.id ? "active" : ""}
                    data-guide={
                      t.id === "feed"
                        ? "fishchat-tab-feed"
                        : t.id === "mine"
                          ? "fishchat-tab-mine"
                          : undefined
                    }
                    onClick={() => {
                      setTab(t.id);
                      setFishChatCurrentTab(t.id);
                    }}
                  >
                    <span className="fishchat-tab-ico" aria-hidden>
                      {t.id === "msg" ? "💬" : t.id === "friends" ? "👥" : t.id === "feed" ? "◎" : "👤"}
                    </span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </nav>
            </>
          )}
        </div>
        <button type="button" className="fishchat-close" data-guide="fishchat-close" onClick={onClose} aria-label="关闭渔聊">
          收起
        </button>
      </div>
    </div>
  );
}