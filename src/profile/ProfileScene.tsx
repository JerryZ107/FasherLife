import { useGame } from "../store/gameStore";
import { useUi } from "../store/uiStore";
import { getFriendChatThread } from "../data/fishChatThread";
import { getPlayerByUid } from "../data/playerDefs";
import ProfilePanel from "./ProfilePanel";
import { Page, PageBody, PageFoot, PageHead } from "../ui/chrome";

function IcoMsg({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <path
        d="M6 8h20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H12l-6 4v-4V10a2 2 0 0 1 2-2z"
        fill="#ffe08a"
        stroke="#2a1a0c"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M11 14h10M11 18h6" stroke="#2a1a0c" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function ProfileScene() {
  const setScene = useGame((s) => s.setScene);
  const viewProfileUid = useUi((s) => s.viewProfileUid);
  const profileReturnScene = useUi((s) => s.profileReturnScene);
  const clearViewProfile = useUi((s) => s.clearViewProfile);
  const isFriend = useUi((s) => s.isFriend);
  const addFriend = useUi((s) => s.addFriend);
  const openFishChatThread = useUi((s) => s.openFishChatThread);
  const showToast = useUi((s) => s.showToast);

  const other = viewProfileUid ? getPlayerByUid(viewProfileUid) : null;
  const viewingOther = Boolean(other);
  const friend = viewingOther && other ? isFriend(other.uid) : false;

  function leaveProfile() {
    const back = profileReturnScene ?? "aquarium";
    clearViewProfile();
    setScene(back);
  }

  function onAddFriend() {
    if (!other) return;
    if (addFriend(other.uid)) showToast(`已添加 ${other.name} 为好友`);
    else showToast("已经是好友了");
  }

  function onSendMessage() {
    if (!other || !friend) return;
    const thread = getFriendChatThread(other.uid);
    if (!thread) {
      showToast("暂无法发消息");
      return;
    }
    const back = profileReturnScene ?? "aquarium";
    clearViewProfile();
    setScene(back);
    openFishChatThread(thread.id);
  }

  return (
    <Page className="profile-page">
      <PageHead
        onBack={leaveProfile}
        backLabel={viewingOther ? "返回" : "水族馆"}
        title={viewingOther ? "钓友主页" : "个人主页"}
      />
      <PageBody className="profile-body">
        <ProfilePanel viewUid={viewProfileUid} />
      </PageBody>
      {viewingOther && (
        <PageFoot>
          <button type="button" className="primary profile-msg-btn" onClick={friend ? onSendMessage : onAddFriend}>
            <IcoMsg size={20} />
            <span>{friend ? "发消息" : "加好友"}</span>
          </button>
        </PageFoot>
      )}
    </Page>
  );
}
