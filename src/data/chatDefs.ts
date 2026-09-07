/** 渔聊 Demo：好友消息与钓鱼邀约。 */

const FISHERY_NAMES: Record<string, string> = {
  clear_stream: "清溪池",
  village_pond: "鱼塘",
};

export type FishChatInvite = {
  inviter: string;
  startAt: number;
  endAt: number;
  fisheryId: string;
  /** true=已预定，false=见机行事 */
  reserved: boolean;
};

export type FishChatThread = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread: number;
  invite: FishChatInvite;
};

export type { FishSticker as FishChatSticker } from "./stickerDefs";

const FISH_CHAT_FRIENDS = ["阿花", "老陈", "小美", "大刘", "阿珍", "阿强", "小周"] as const;
const FISHERY_IDS = ["clear_stream", "village_pond"] as const;
const INVITE_KINDS = ["钓鱼邀约", "钓鱼邀请"] as const;
const TIME_LABELS = ["刚刚", "3分钟前", "12分钟前", "1小时前", "昨天", "周二", "周一", "上周"];

function avatarHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function fishChatAvatarColor(name: string): string {
  return `hsl(${avatarHue(name)} 52% 48%)`;
}

export function fishChatInitial(name: string): string {
  return name.slice(0, 1);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatInviteRange(startAt: number, endAt: number): string {
  const fmt = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };
  return `${fmt(startAt)}~${fmt(endAt)}`;
}

export function fisheryLabel(fisheryId: string): string {
  return FISHERY_NAMES[fisheryId] ?? fisheryId;
}

export function isInviteActive(invite: FishChatInvite, now = Date.now()): boolean {
  return now >= invite.startAt && now <= invite.endAt;
}

export function isInviteExpired(invite: FishChatInvite, now = Date.now()): boolean {
  return now > invite.endAt;
}

export function inviteExpiredMessage(inviter: string): string {
  return `${inviter}的钓鱼邀约已过期`;
}

export function presenceLabel(presence: "online" | "idle" | "offline"): string {
  if (presence === "idle") return "挂机";
  if (presence === "offline") return "离线";
  return "在线";
}

/** 演示好友在钓场的在线态（与码头占座一致）。 */
const NPC_PRESENCE: Record<string, "online" | "idle" | "offline"> = {
  阿花: "idle",
  老陈: "online",
  小美: "offline",
  大刘: "online",
  阿珍: "idle",
  阿强: "offline",
  小周: "online",
};

export function chatPresenceForName(name: string): "online" | "idle" | "offline" {
  return NPC_PRESENCE[name] ?? "online";
}

function inviteWindow(i: number, now: number): { startAt: number; endAt: number } {
  const day = 86_400_000;
  const hour = 3_600_000;
  const base = new Date(now);
  base.setMinutes(0, 0, 0);
  const today = base.getTime();
  if (i % 3 === 0) {
    return { startAt: now - hour / 2, endAt: now + 2 * hour };
  }
  if (i % 3 === 1) {
    return { startAt: today + day + 9 * hour, endAt: today + day + 12 * hour };
  }
  return { startAt: today - 2 * day + 10 * hour, endAt: today - 2 * day + 12 * hour };
}

export function demoFishChatThreads(now = Date.now()): FishChatThread[] {
  return FISH_CHAT_FRIENDS.map((name, i) => {
    const kind = INVITE_KINDS[i % INVITE_KINDS.length]!;
    const { startAt, endAt } = inviteWindow(i, now);
    return {
      id: `fishchat_${i}`,
      name,
      preview: `${name}向你发送了一条${kind}`,
      time: TIME_LABELS[i % TIME_LABELS.length]!,
      unread: i < 4 ? 1 : 0,
      invite: {
        inviter: name,
        startAt,
        endAt,
        fisheryId: FISHERY_IDS[i % FISHERY_IDS.length]!,
        reserved: i % 2 === 0,
      },
    };
  });
}

export function getFishChatThread(id: string, now = Date.now()): FishChatThread | undefined {
  return demoFishChatThreads(now).find((t) => t.id === id);
}
