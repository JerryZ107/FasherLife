import { useMemo, useState } from "react";
import { useGame } from "../store/gameStore";
import { MAIL_BY_ID, mailHasReward, type MailDef } from "../data/mailDefs";
import { CONSUMABLE_BY_ID, foodNameOf } from "../data/consumableDefs";
import { mailExpired, visibleMails, formatMailReceivedAt, mailReceivedAt } from "../game/mail";
import { EmptyHint, GoldAmt, Page, PageBody, PageHead, PearlAmt } from "../ui/chrome";
import { IcoMail } from "../ui/marks";
import type { MailItem } from "../save/saveSchema";

export default function MailScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const readMail = useGame((s) => s.readMail);
  const claimMail = useGame((s) => s.claimMail);
  const claimAllMail = useGame((s) => s.claimAllMail);
  const deleteMail = useGame((s) => s.deleteMail);
  const list = useMemo(() => visibleMails(save), [save]);
  const [picked, setPicked] = useState<string | null>(null);
  const activeMail = useMemo(
    () => (picked ? list.find((m) => m.uid === picked) : undefined),
    [list, picked],
  );
  const activeDef = activeMail ? MAIL_BY_ID[activeMail.defId] : undefined;
  const pending = list.some((m) => {
    const d = MAIL_BY_ID[m.defId];
    return d && mailHasReward(d) && !m.claimed;
  });

  return (
    <Page className="mail-page">
      <PageHead
        onBack={() => setScene("aquarium")}
        title="邮件"
        extra={
          <button className="pill" disabled={!pending} onClick={() => claimAllMail()}>
            全部领取
          </button>
        }
      />
      <PageBody>
        {list.length === 0 && <EmptyHint>信箱是空的</EmptyHint>}
        {list.map((m) => {
          const d = MAIL_BY_ID[m.defId];
          if (!d) return null;
          const on = picked === m.uid;
          const pendingReward = mailHasReward(d) && !m.claimed;
          const unread = !m.read || pendingReward;
          return (
            <div className={`mail-item ${on ? "is-open" : ""}`} key={m.uid}>
              <button
                className={`panel mail-row ${on ? "panel-active" : ""} ${unread ? "unread" : "read"}`}
                onClick={() => {
                  setPicked((prev) => {
                    const next = prev === m.uid ? null : m.uid;
                    if (next) readMail(m.uid);
                    return next;
                  });
                }}
              >
                <span className={`mail-dot ${unread ? "is-on" : ""}`} />
                <IcoMail size={28} />
                <span className="mail-copy">
                  <strong>{d.title}</strong>
                  <span className="dim">
                    {d.sender} · {formatMailReceivedAt(mailReceivedAt(m, save))}
                  </span>
                </span>
                {pendingReward ? <span className="chip ok">附件</span> : null}
              </button>
              {on && activeMail && activeDef && activeMail.uid === m.uid && (
                <MailLetter
                  mail={activeMail}
                  def={activeDef}
                  gameDay={save.gameDay}
                  receivedAtLabel={formatMailReceivedAt(mailReceivedAt(activeMail, save))}
                  onClaim={() => claimMail(activeMail.uid)}
                  onDelete={() => {
                    if (deleteMail(activeMail.uid)) setPicked(null);
                  }}
                />
              )}
            </div>
          );
        })}
      </PageBody>
    </Page>
  );
}

function MailLetter({
  mail,
  def,
  gameDay,
  receivedAtLabel,
  onClaim,
  onDelete,
}: {
  mail: MailItem;
  def: MailDef;
  gameDay: number;
  receivedAtLabel: string;
  onClaim: () => void;
  onDelete: () => void;
}) {
  const hasReward = mailHasReward(def);
  const canClaim = hasReward && !mail.claimed && !mailExpired(mail, gameDay, def);
  return (
    <div className="mail-letter">
      <div className="mail-letter-head">
        <strong>{def.title}</strong>
        <span className="dim">发件人：{def.sender} · {receivedAtLabel}</span>
      </div>
      <p className="mail-letter-body">{def.body}</p>
      {hasReward && (
        <div className="mail-attach">
          <div className="dim">附件</div>
          <div className="mail-attach-row">
            {def.gold ? <GoldAmt n={`${def.gold}`} /> : null}
            {def.pearl ? <PearlAmt n={`${def.pearl}`} /> : null}
            {def.salt ? <span className="chip">盐 ×{def.salt}</span> : null}
            {def.bait ? (
              <span className="chip">
                {CONSUMABLE_BY_ID[def.bait.id]?.name ?? "鱼饵"} ×{def.bait.n}
              </span>
            ) : null}
            {def.food ? (
              <span className="chip">
                {foodNameOf(def.food.id)} ×{def.food.n}
              </span>
            ) : null}
          </div>
          {mail.claimed ? <span className="chip ok">已领取</span> : null}
        </div>
      )}
      <div className="mail-letter-acts">
        {hasReward && (
          <button className="primary" disabled={!canClaim} onClick={onClaim}>
            {mail.claimed ? "已领取" : "领取"}
          </button>
        )}
        <button onClick={onDelete}>删除</button>
      </div>
    </div>
  );
}
