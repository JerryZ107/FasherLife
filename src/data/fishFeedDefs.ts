/** 渔聊动态（朋友圈式渔获分享）。 */

import { FISH_BY_ID } from "./fishDefs";
import { getPlayerByUid } from "./playerDefs";
import type { SaveData } from "../save/saveSchema";

export type FishFeedEntry = {
  defId: string;
  customName?: string | null;
  /** 发布时对应的当日渔获记录 id。 */
  catchUid?: string;
  /** @deprecated 旧版绑定鱼筐实例。 */
  basketUid?: string;
};

export type DailyCatchLogEntry = {
  uid: string;
  defId: string;
  customName?: string | null;
  gameDay: number;
};

export type FishFeedPost = {
  id: string;
  authorUid: string;
  gameDay: number;
  createdAt: number;
  fish: FishFeedEntry[];
  likeUids: string[];
};

export function playerFeedUid(account: string | null | undefined): string {
  const key = account?.trim().toLowerCase();
  return key || "__player__";
}

export function isSelfFeedAuthor(authorUid: string, account: string | null | undefined): boolean {
  return authorUid === playerFeedUid(account);
}

export function feedAuthorName(authorUid: string, save: SaveData, account: string | null | undefined): string {
  if (isSelfFeedAuthor(authorUid, account)) {
    return save.playerName.trim() || account?.trim() || "钓手";
  }
  return getPlayerByUid(authorUid)?.name ?? authorUid;
}

export function findFeedPost(postId: string, save: SaveData): FishFeedPost | undefined {
  const player = save.fishFeedPosts.find((p) => p.id === postId);
  if (player) return player;
  return demoPosts(save.gameDay).find((p) => p.id === postId);
}

export function postLikes(post: FishFeedPost, save: SaveData): string[] {
  const override = save.fishFeedPostLikes[post.id];
  if (override) return override;
  return post.likeUids;
}

export function formatFeedTime(createdAt: number, now = Date.now()): string {
  const diff = Math.max(0, now - createdAt);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const d = new Date(createdAt);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function feedCaption(fish: FishFeedEntry[]): string {
  if (fish.length === 0) return "今日出钓";
  const names = fish
    .map((f) => {
      const def = FISH_BY_ID[f.defId];
      const custom = f.customName?.trim();
      if (custom && def) return `${custom}（${def.name}）`;
      return def?.name ?? "鱼";
    })
    .slice(0, 3);
  const more = fish.length > 3 ? ` 等 ${fish.length} 条` : "";
  return `今日渔获 · ${names.join("、")}${more}`;
}

function demoPosts(gameDay: number): FishFeedPost[] {
  const base = Date.now() - 3_600_000;
  return [
    {
      id: "feed_demo_ahua",
      authorUid: "ahua",
      gameDay,
      createdAt: base - 1_800_000,
      fish: [
        { defId: "koi_red_white", customName: "小花" },
        { defId: "crucian" },
      ],
      likeUids: ["laochen", "xiaomei"],
    },
    {
      id: "feed_demo_laochen",
      authorUid: "laochen",
      gameDay,
      createdAt: base - 3_200_000,
      fish: [{ defId: "black_carp" }, { defId: "crucian" }, { defId: "minnow" }],
      likeUids: ["ahua"],
    },
    {
      id: "feed_demo_xiaomei",
      authorUid: "xiaomei",
      gameDay,
      createdAt: base - 5_400_000,
      fish: [{ defId: "rainbow_trout" }],
      likeUids: [],
    },
    {
      id: "feed_demo_aqiang",
      authorUid: "aqiang",
      gameDay,
      createdAt: base - 7_200_000,
      fish: [
        { defId: "gold_trout" },
        { defId: "brook_trout" },
        { defId: "red_spot_salmon" },
        { defId: "stone_bass" },
      ],
      likeUids: ["daliu", "azhen", "xiaozhou"],
    },
  ];
}

export function mergedFishFeed(
  save: SaveData,
  account: string | null | undefined,
  friendUids: string[],
): FishFeedPost[] {
  const friendSet = new Set(friendUids);
  const selfUid = playerFeedUid(account);
  const demo = demoPosts(save.gameDay).filter((p) => friendSet.has(p.authorUid));
  const player = save.fishFeedPosts.filter(
    (p) => isSelfFeedAuthor(p.authorUid, account) || friendSet.has(p.authorUid),
  );
  const seen = new Set<string>();
  const all: FishFeedPost[] = [];
  for (const p of [...player, ...demo]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    if (p.authorUid === selfUid || friendSet.has(p.authorUid)) all.push(p);
  }
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

/** 玩家已发动态的渔获 uid（含旧版鱼筐 uid）。 */
export function sharedCatchUids(save: SaveData): Set<string> {
  const set = new Set<string>();
  for (const post of save.fishFeedPosts) {
    for (const f of post.fish) {
      if (f.catchUid) set.add(f.catchUid);
      if (f.basketUid) set.add(f.basketUid);
    }
  }
  return set;
}

/** @deprecated 使用 sharedCatchUids */
export function sharedFeedBasketUids(save: SaveData): Set<string> {
  return sharedCatchUids(save);
}

export function appendDailyCatch(
  save: SaveData,
  defId: string,
  customName?: string | null,
): string {
  if (!save.dailyCatchLog) save.dailyCatchLog = [];
  const uid = `catch_${save.gameDay}_${save.dailyCatchLog.length + 1}_${Date.now().toString(36)}`;
  save.dailyCatchLog.push({
    uid,
    defId,
    customName: customName ?? null,
    gameDay: save.gameDay,
  });
  return uid;
}

export function unsharedDailyCatches(save: SaveData, gameDay = save.gameDay): DailyCatchLogEntry[] {
  const shared = sharedCatchUids(save);
  return (save.dailyCatchLog ?? []).filter((c) => c.gameDay === gameDay && !shared.has(c.uid));
}

export function hasTodayCatchForFeed(save: SaveData): boolean {
  return unsharedDailyCatches(save).length > 0;
}

/** 玩家今天是否已发过渔聊动态。 */
export function hasSelfFeedPostToday(
  save: SaveData,
  account: string | null | undefined,
  gameDay = save.gameDay,
): boolean {
  const selfUid = playerFeedUid(account);
  return save.fishFeedPosts.some((p) => p.authorUid === selfUid && p.gameDay === gameDay);
}

export function likerNames(
  post: FishFeedPost,
  save: SaveData,
  account: string | null | undefined,
): string {
  const uids = postLikes(post, save);
  if (uids.length === 0) return "";
  const names = uids.map((uid) => feedAuthorName(uid, save, account));
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}、${names[1]}`;
  return `${names[0]}、${names[1]} 等 ${names.length} 人`;
}
