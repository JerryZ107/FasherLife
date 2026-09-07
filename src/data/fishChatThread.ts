/** 按好友 UID 解析渔聊会话（避免 chatDefs ↔ playerDefs 循环依赖）。 */

import { getFishChatThread, type FishChatThread } from "./chatDefs";
import { getPlayerByUid } from "./playerDefs";

function fallbackInviteWindow(now: number): { startAt: number; endAt: number } {
  const hour = 3_600_000;
  return { startAt: now - hour / 2, endAt: now + 2 * hour };
}

export function getFriendChatThread(uid: string, now = Date.now()): FishChatThread | undefined {
  const player = getPlayerByUid(uid);
  if (!player) return undefined;
  if (player.threadId) return getFishChatThread(player.threadId, now);
  const { startAt, endAt } = fallbackInviteWindow(now);
  return {
    id: `friend_${player.uid}`,
    name: player.name,
    preview: "打个招呼吧",
    time: "刚刚",
    unread: 0,
    invite: {
      inviter: player.name,
      startAt,
      endAt,
      fisheryId: "clear_stream",
      reserved: false,
    },
  };
}
