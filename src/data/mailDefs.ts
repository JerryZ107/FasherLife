import { MONTHLY_CARD_DAILY_GOLD } from "../game/constants";



export type MailReward = {

  gold?: number;

  pearl?: number;

  salt?: number;

  bait?: { id: string; n: number };

  food?: { id: string; n: number };

};



export type MailDef = {

  id: string;

  title: string;

  sender: string;

  body: string;

  expireDays?: number;

} & MailReward;



/** 系统信。进游戏只投一次。 */

export const MAIL_DEFS: MailDef[] = [

  {

    id: "welcome",

    title: "欢迎来到钓鱼佬日常",

    sender: "码头运营组",

    body: "你的水族馆和鱼竿在这。钓到的鱼先放鱼筐，再存进缸。点缸里的鱼可以喂食、挂售。附件是一点开工钱。",

    gold: 30,

    salt: 5,

    expireDays: 30,

  },

  {

    id: "supply",

    title: "新手渔具补给",

    sender: "渔具铺",

    body: "糠面饵拿着，清溪池免费能钓。饵空了去商城补。",

    bait: { id: "bait_basic", n: 10 },

    expireDays: 30,

  },

  {

    id: "notice",

    title: "码头告示",

    sender: "公告",

    body: "存档跟账号走。月卡每天 300 金，漏登会寄到邮箱。有事看任务和邮件，别忘领附件。",

    expireDays: 60,

  },

];



/** 月卡漏登补寄。可多封同模板，不进 MAIL_DEFS，避免开档只投一次。 */

export const MONTHLY_GOLD_MAIL: MailDef = {

  id: "monthly_gold",

  title: "月卡每日金币",

  sender: "码头财务",

  body: "你那天没上线，当日 300 金币在附件里。30 天内领走。",

  gold: MONTHLY_CARD_DAILY_GOLD,

  expireDays: 30,

};



export const MAIL_BY_ID: Record<string, MailDef> = {

  ...Object.fromEntries(MAIL_DEFS.map((m) => [m.id, m])),

  [MONTHLY_GOLD_MAIL.id]: MONTHLY_GOLD_MAIL,

};



export function mailHasReward(def: MailDef | undefined): boolean {

  if (!def) return false;

  return Boolean(def.gold || def.pearl || def.salt || def.bait || def.food);

}

