/** 上钩除了鱼以外的杂物。 */

export type JunkKind = "bottle" | "bag" | "weed";

export type JunkDef = {
  id: string;
  kind: JunkKind;
  name: string;
};

export type BottleStory = {
  id: string;
  body: string;
};

export const JUNK_DEFS: JunkDef[] = [
  { id: "junk_bottle", kind: "bottle", name: "漂流瓶" },
  { id: "junk_bag", kind: "bag", name: "塑料袋" },
  { id: "junk_weed", kind: "weed", name: "水草" },
];

export const JUNK_BY_ID: Record<string, JunkDef> = Object.fromEntries(
  JUNK_DEFS.map((j) => [j.id, j]),
);

export const JUNK_BY_KIND: Record<JunkKind, JunkDef> = {
  bottle: JUNK_BY_ID.junk_bottle,
  bag: JUNK_BY_ID.junk_bag,
  weed: JUNK_BY_ID.junk_weed,
};

/** 挂机捞到杂物时扣的能量，按普通鱼下限。 */
export const JUNK_IDLE_STAMINA = 6;

/** 上钩是杂物而不是鱼的概率。要少，别盖过钓鱼。 */
export const JUNK_BITE_CHANCE = 0.04;

export const BOTTLE_STORIES: BottleStory[] = [
  {
    id: "s1",
    body: "纸条被水泡得发皱。上面写：今天风大，浮漂一个劲地点头。我当是大货，拉上来却是这只瓶子。你要是看到了，替我在水边再坐一会儿。",
  },
  {
    id: "s2",
    body: "小孩字，一笔一顿：爸爸说明天带我来钓鱼。我先把愿望装进瓶子。希望钓到一条会发光的鱼。",
  },
  {
    id: "s3",
    body: "半页日记。离职那天我坐到天黑，一条鱼也没有。可是心倒是静了。瓶子就留给下一个坐不住的人。",
  },
  {
    id: "s4",
    body: "字迹歪歪扭扭：我把情书扔进河里。后来才知道漂流瓶不该这么用。如果你捡到了，当没看见吧。",
  },
  {
    id: "s5",
    body: "工整小楷：河边那位穿蓑衣的人，每天都来。他不说话，鱼倒是认他。我羡慕这种安静。",
  },
  {
    id: "s6",
    body: "一张小条，写得很凶：谁把垃圾袋钓上来了请扔进桶里。河不是灰桶。谢谢。",
  },
  {
    id: "s7",
    body: "菜单背面：今日推荐清蒸鲫鱼。老板说这张纸别给客人看，我就塞瓶子里了。愿你今晚有鱼下锅。",
  },
  {
    id: "s8",
    body: "只有一行：钓不到也别骂河。它又没欠你的。写完我自己先笑了。",
  },
];

export function pickBottleStory(): BottleStory {
  return BOTTLE_STORIES[Math.floor(Math.random() * BOTTLE_STORIES.length)] ?? BOTTLE_STORIES[0];
}

export function pickJunkDef(): JunkDef {
  const r = Math.random();
  if (r < 0.45) return JUNK_BY_KIND.weed;
  if (r < 0.8) return JUNK_BY_KIND.bag;
  return JUNK_BY_KIND.bottle;
}
