import { useMemo, useState } from "react";
import { useGame } from "../store/gameStore";
import { useUi } from "../store/uiStore";
import { FISH_BY_ID } from "../data/fishDefs";
import {
  feedAuthorName,
  feedCaption,
  formatFeedTime,
  isSelfFeedAuthor,
  likerNames,
  mergedFishFeed,
  playerFeedUid,
  postLikes,
  unsharedDailyCatches,
  type FishFeedPost,
} from "../data/fishFeedDefs";
import { fishChatAvatarColor, fishChatInitial } from "../data/chatDefs";
import { FishPortrait } from "../art/Art";

function feedGridClass(n: number): string {
  if (n <= 1) return "cols-1";
  if (n === 2) return "cols-2";
  if (n <= 4) return "cols-2";
  return "cols-3";
}

function FeedFishGrid({ fish }: { fish: FishFeedPost["fish"] }) {
  const cls = feedGridClass(fish.length);
  return (
    <div className={`fishchat-feed-grid ${cls}`}>
      {fish.map((f, i) => {
        const def = FISH_BY_ID[f.defId];
        if (!def) return null;
        const size = fish.length === 1 ? 108 : fish.length === 2 ? 88 : 72;
        return (
          <div className="fishchat-feed-fish" key={`${f.defId}_${i}`} title={def.name}>
            <FishPortrait id={f.defId} size={size} alt={def.name} />
          </div>
        );
      })}
    </div>
  );
}

function FeedPostCard({
  post,
  onLike,
  onDelete,
}: {
  post: FishFeedPost;
  onLike: (postId: string) => void;
  onDelete?: (postId: string) => void;
}) {
  const save = useGame((s) => s.save);
  const account = useGame((s) => s.account);
  const selfUid = playerFeedUid(account);
  const name = feedAuthorName(post.authorUid, save, account);
  const likes = postLikes(post, save);
  const liked = likes.includes(selfUid);
  const likeText = likerNames(post, save, account);
  const isSelf = isSelfFeedAuthor(post.authorUid, account);

  return (
    <article className="fishchat-feed-post">
      <span
        className="fishchat-feed-avatar"
        style={{ background: fishChatAvatarColor(name) }}
        aria-hidden
      >
        {fishChatInitial(name)}
      </span>
      <div className="fishchat-feed-main">
        <div className="fishchat-feed-head">
          <strong className="fishchat-feed-name">{name}</strong>
          {isSelf && onDelete ? (
            <button type="button" className="fishchat-feed-delete" onClick={() => onDelete(post.id)}>
              删除
            </button>
          ) : null}
        </div>
        <p className="fishchat-feed-caption">{feedCaption(post.fish)}</p>
        <FeedFishGrid fish={post.fish} />
        <div className="fishchat-feed-meta">
          <time className="fishchat-feed-time">{formatFeedTime(post.createdAt)}</time>
          <button
            type="button"
            className={`fishchat-feed-like-btn${liked ? " liked" : ""}`}
            aria-label={liked ? "取消赞" : "点赞"}
            onClick={() => onLike(post.id)}
          >
            <span className="fishchat-feed-like-ico" aria-hidden>{liked ? "♥" : "♡"}</span>
          </button>
        </div>
        {likes.length > 0 && (
          <div className="fishchat-feed-likes">
            <span className="fishchat-feed-like-ico sm" aria-hidden>♥</span>
            <span>{likeText}</span>
          </div>
        )}
      </div>
    </article>
  );
}

export function FishFeedComposer({
  onClose,
  inline = false,
}: {
  onClose: () => void;
  inline?: boolean;
}) {
  const save = useGame((s) => s.save);
  const publishFishFeedPost = useGame((s) => s.publishFishFeedPost);
  const [picked, setPicked] = useState<string[]>([]);

  const todayFish = useMemo(() => unsharedDailyCatches(save), [save.dailyCatchLog, save.gameDay, save.fishFeedPosts]);

  function toggle(uid: string) {
    setPicked((cur) => (cur.includes(uid) ? cur.filter((x) => x !== uid) : [...cur, uid]));
  }

  function submit() {
    if (publishFishFeedPost(picked)) {
      onClose();
    }
  }

  const shellClass = inline ? "fishchat-feed-compose-inline" : "fishchat-feed-compose-backdrop";
  const panelClass = inline ? "fishchat-feed-compose fishchat-feed-compose-panel" : "fishchat-feed-compose";

  return (
    <div className={shellClass} onClick={inline ? undefined : onClose} role="presentation">
      <div className={panelClass} onClick={(e) => e.stopPropagation()}>
        <header className="fishchat-feed-compose-head">
          <button type="button" className="fishchat-feed-compose-cancel" onClick={onClose}>
            取消
          </button>
          <strong>发布今日渔获</strong>
          <button
            type="button"
            className="fishchat-feed-compose-send"
            data-guide="fishchat-send"
            disabled={picked.length === 0}
            onClick={submit}
          >
            发送
          </button>
        </header>
        <p className="dim fishchat-feed-compose-hint">
          多选今天钓到的渔获（第 {save.gameDay} 天，卖出或存缸也不影响）
        </p>
        {todayFish.length === 0 ? (
          <p className="dim fishchat-feed-compose-empty">
            {save.dailyCatchLog?.some((c) => c.gameDay === save.gameDay)
              ? "今天的渔获都已发过动态了"
              : "今天还没有可分享的渔获，去钓场试试吧"}
          </p>
        ) : (
          <ul className="fishchat-feed-compose-list">
            {todayFish.map((fish) => {
              const def = FISH_BY_ID[fish.defId];
              if (!def) return null;
              const selected = picked.includes(fish.uid);
              return (
                <li key={fish.uid}>
                  <button
                    type="button"
                    className={`fishchat-feed-compose-row${selected ? " selected" : ""}`}
                    onClick={() => toggle(fish.uid)}
                  >
                    <FishPortrait id={fish.defId} size={52} alt={def.name} />
                    <span className="fishchat-feed-compose-label">
                      {fish.customName?.trim() ? `${fish.customName}（${def.name}）` : def.name}
                    </span>
                    <span className={`fishchat-feed-compose-check${selected ? " on" : ""}`} aria-hidden>
                      {selected ? "✓" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function FishChatFeedBody() {
  const save = useGame((s) => s.save);
  const account = useGame((s) => s.account);
  const friendUids = useUi((s) => s.friendUids);
  const toggleFishFeedLike = useGame((s) => s.toggleFishFeedLike);
  const deleteFishFeedPost = useGame((s) => s.deleteFishFeedPost);

  const posts = useMemo(
    () => mergedFishFeed(save, account, friendUids),
    [save, account, friendUids],
  );

  if (posts.length === 0) {
    return (
      <div className="fishchat-feed-empty">
        <p>还没有动态</p>
        <span className="dim">点右上角鱼图标，分享今日渔获</span>
      </div>
    );
  }

  return (
    <div className="fishchat-feed-list">
      {posts.map((post) => (
        <FeedPostCard
          key={post.id}
          post={post}
          onLike={toggleFishFeedLike}
          onDelete={deleteFishFeedPost}
        />
      ))}
    </div>
  );
}
