import { useMemo, useState } from "react";
import { useGame } from "../store/gameStore";
import { useUi } from "../store/uiStore";
import { getPlayerByUid } from "../data/playerDefs";
import { FISH_BY_ID, FISH_DEFS } from "../data/fishDefs";
import { fishTitle } from "../game/affection";
import { profileFishSizeCm, profileFishWeightKg, MAX_PROFILE_SHOWCASE_FISH } from "../game/profileFish";
import PersonView from "../art/PersonView";
import { FishPortrait } from "../art/Art";
import { ModalSheet, QualityChip } from "../ui/chrome";
import ProfileOutfitPicker from "./ProfileOutfitPicker";

const ACHIEVEMENTS = [
  {
    id: "newbie",
    title: "新手渔夫",
    desc: "完成注册，踏上钓鱼之路",
  },
] as const;

function ShowcaseFishCard({
  defId,
  customName,
  sizeCm,
  weightKg,
}: {
  defId: string;
  customName?: string | null;
  sizeCm: number;
  weightKg: number;
}) {
  const def = FISH_BY_ID[defId];
  if (!def) return null;
  const title = customName?.trim() ? `${customName.trim()}（${def.name}）` : def.name;
  return (
    <div className="profile-showcase-card">
      <FishPortrait id={defId} size={72} alt={def.name} />
      <div className="profile-showcase-meta">
        <strong>{title}</strong>
        <span className="dim">鱼种 · {def.name}</span>
        <span className="dim">体长 · {sizeCm}cm · {weightKg}kg</span>
      </div>
    </div>
  );
}

type Props = {
  /** null=自己；有值=查看他人 Demo 资料。 */
  viewUid?: string | null;
  /** 嵌在渔聊「我的」页内。 */
  embedded?: boolean;
  /** 嵌套时跳转装备等前先关渔聊。 */
  onCloseOverlay?: () => void;
};

export default function ProfilePanel({ viewUid = null, embedded = false }: Props) {
  const save = useGame((s) => s.save);
  const account = useGame((s) => s.account);
  const setPlayerSignature = useGame((s) => s.setPlayerSignature);
  const toggleProfileShowcaseFish = useGame((s) => s.toggleProfileShowcaseFish);
  const clearProfileShowcaseFish = useGame((s) => s.clearProfileShowcaseFish);
  const showToast = useUi((s) => s.showToast);
  const setFishChatShowcasePickOpen = useUi((s) => s.setFishChatShowcasePickOpen);
  const markGuideFishchatShowcaseDone = useGame((s) => s.markGuideFishchatShowcaseDone);

  const [signEdit, setSignEdit] = useState(false);
  const [signDraft, setSignDraft] = useState("");
  const [pickFishOpen, setPickFishOpen] = useState(false);
  const [pickOutfitOpen, setPickOutfitOpen] = useState(false);

  const isSelf = !viewUid;
  const other = viewUid ? getPlayerByUid(viewUid) : null;

  const name = isSelf
    ? save.playerName.trim() || account || "钓手"
    : other?.name ?? viewUid ?? "钓友";
  const uid = isSelf ? account?.trim() || name : other?.uid ?? viewUid ?? "";
  const signature = isSelf
    ? save.playerSignature.trim() || "今日宜出钓。"
    : other?.signature ?? "这位钓友很神秘。";
  const level = isSelf ? save.playerLevel : other?.level ?? 1;
  const outfitId = isSelf
    ? (save.ownedOutfits.includes(save.profileShowcaseOutfitId)
        ? save.profileShowcaseOutfitId
        : save.equippedOutfit)
    : other?.outfitId ?? "outfit_default";
  const lookSex = isSelf ? save.lookSex : other?.sex ?? "male";

  const livingTank = useMemo(
    () => save.tank.filter((f) => !f.dead),
    [save.tank],
  );

  const showcaseFishList = useMemo(() => {
    if (!isSelf && other?.showcaseFish?.length) return other.showcaseFish;
    return save.profileShowcaseFishUids
      .map((uid) => save.tank.find((f) => f.uid === uid && !f.dead))
      .filter((fish): fish is NonNullable<typeof fish> => Boolean(fish))
      .map((fish) => ({
        defId: fish.defId,
        customName: fish.customName,
        sizeCm: profileFishSizeCm(fish),
        weightKg: profileFishWeightKg(fish),
      }));
  }, [isSelf, other, save.profileShowcaseFishUids, save.tank]);

  const unlockedFishIds = useMemo(() => {
    if (!isSelf && other?.caughtFishIds) return new Set(other.caughtFishIds);
    return new Set(save.caughtFishIds);
  }, [isSelf, other, save.caughtFishIds]);

  const unlockedFish = useMemo(
    () => FISH_DEFS.filter((f) => unlockedFishIds.has(f.id)),
    [unlockedFishIds],
  );

  function openOutfitPicker() {
    setPickOutfitOpen(true);
  }

  function startSignEdit() {
    setSignDraft(save.playerSignature.trim() || "今日宜出钓。");
    setSignEdit(true);
  }

  function saveSign() {
    if (setPlayerSignature(signDraft)) setSignEdit(false);
  }

  function toggleShowcase(fishUid: string) {
    const wasSelected = save.profileShowcaseFishUids.includes(fishUid);
    if (toggleProfileShowcaseFish(fishUid)) {
      showToast(wasSelected ? "已取消展示" : "已加入展示");
    }
  }

  return (
    <div className={`profile-panel-root${embedded ? " profile-embedded" : ""}`}>
      <div className="profile-hero" aria-label={isSelf ? "当前服装" : "服装展示"}>
        <div className="profile-hero-bg" aria-hidden>
          <span className="profile-hero-sun" />
          <span className="profile-hero-cloud profile-hero-cloud-a" />
          <span className="profile-hero-cloud profile-hero-cloud-b" />
          <span className="profile-hero-water" />
          <span className="profile-hero-deck" />
          <span className="profile-hero-glow" />
        </div>
        {isSelf && (
          <button type="button" className="primary profile-outfit-btn" onClick={openOutfitPicker}>
            换服装
          </button>
        )}
        <div className="profile-hero-stage">
          <PersonView
            className="profile-hero-person"
            outfitId={outfitId}
            sex={lookSex}
            pose="stand"
            size={embedded ? 120 : 140}
          />
        </div>
      </div>

      <div className="profile-scroll">
        <div className="panel profile-card">
          <div className="profile-card-head">
            <strong className="profile-name">{name}</strong>
            <span className="chip lv">Lv.{level}</span>
          </div>
          <div className="profile-uid">UID · {uid}</div>
          {isSelf && signEdit ? (
            <div className="profile-sign-edit">
              <textarea
                className="profile-sign-input"
                value={signDraft}
                maxLength={48}
                rows={3}
                autoFocus
                onChange={(e) => setSignDraft(e.target.value)}
              />
              <div className="profile-sign-actions">
                <button type="button" onClick={() => setSignEdit(false)}>取消</button>
                <button type="button" className="primary" onClick={saveSign}>保存</button>
              </div>
            </div>
          ) : isSelf ? (
            <button type="button" className="profile-sign" onClick={startSignEdit} title="点击编辑签名">
              {signature}
            </button>
          ) : (
            <p className="profile-sign readonly">{signature}</p>
          )}
        </div>

        <section className="panel profile-showcase">
          <div className="profile-section-head">
            <strong>展示鱼</strong>
            {isSelf && (
              <div className="profile-showcase-actions">
                <span className="dim">
                  {showcaseFishList.length}/{MAX_PROFILE_SHOWCASE_FISH}
                </span>
                <button
                  type="button"
                  className="profile-showcase-pick"
                  data-guide={embedded ? "fishchat-showcase-pick" : undefined}
                  onClick={() => {
                    setPickFishOpen(true);
                    if (embedded) setFishChatShowcasePickOpen(true);
                  }}
                >
                  选择
                </button>
              </div>
            )}
          </div>
          {showcaseFishList.length > 0 ? (
            <div className="profile-showcase-list">
              {showcaseFishList.map((fish, i) => (
                <ShowcaseFishCard key={`${fish.defId}_${i}`} {...fish} />
              ))}
            </div>
          ) : (
            <p className="dim profile-showcase-empty">
              {isSelf ? "从水族馆选几条鱼展示在这里" : "暂未设置展示鱼"}
            </p>
          )}
        </section>

        {isSelf && (
          <>
            <section className="panel profile-section">
              <div className="profile-section-head">
                <strong>成就</strong>
              </div>
              <ul className="profile-achieve-list">
                {ACHIEVEMENTS.map((a) => (
                  <li key={a.id} className="profile-achieve-item unlocked">
                    <span className="profile-achieve-badge" aria-hidden>🏆</span>
                    <div>
                      <strong>{a.title}</strong>
                      <p className="dim">{a.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel profile-section">
              <div className="profile-section-head">
                <strong>图鉴</strong>
                <span className="dim">{unlockedFish.length} 种已解锁</span>
              </div>
              {unlockedFish.length === 0 ? (
                <p className="dim">还没有解锁的鱼种</p>
              ) : (
                <div className="profile-ency-grid">
                  {unlockedFish.map((f) => (
                    <div className="profile-ency-card" key={f.id}>
                      <FishPortrait id={f.id} size={56} alt={f.name} />
                      <span className="profile-ency-name">{f.name}</span>
                      <QualityChip quality={f.quality} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {pickOutfitOpen && (
        <ProfileOutfitPicker
          embedded={embedded}
          onClose={() => setPickOutfitOpen(false)}
          onPicked={() => showToast("已更新主页展示服装")}
        />
      )}

      {pickFishOpen && (
        <ModalSheet
          title="选择展示鱼"
          onClose={() => {
            setPickFishOpen(false);
            if (embedded) {
              setFishChatShowcasePickOpen(false);
              markGuideFishchatShowcaseDone();
            }
          }}
        >
          <p className="dim profile-showcase-hint">
            可多选，最多 {MAX_PROFILE_SHOWCASE_FISH} 条（已选 {save.profileShowcaseFishUids.length}）
          </p>
          {livingTank.length === 0 && <p className="dim">缸里还没有活鱼</p>}
          {livingTank.map((fish) => {
            const def = FISH_BY_ID[fish.defId];
            if (!def) return null;
            const selected = save.profileShowcaseFishUids.includes(fish.uid);
            return (
              <button
                key={fish.uid}
                type="button"
                className={`profile-pick-row${selected ? " selected" : ""}`}
                onClick={() => toggleShowcase(fish.uid)}
              >
                <FishPortrait id={fish.defId} size={44} alt={def.name} />
                <span className="profile-pick-label">{fishTitle(fish)}</span>
                <span className="dim">
                  {profileFishSizeCm(fish)}cm · {profileFishWeightKg(fish)}kg
                </span>
                {selected && <span className="profile-pick-check" aria-hidden>✓</span>}
              </button>
            );
          })}
          {save.profileShowcaseFishUids.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearProfileShowcaseFish();
                showToast("已清空展示鱼");
              }}
            >
              清空展示
            </button>
          )}
        </ModalSheet>
      )}
    </div>
  );
}
