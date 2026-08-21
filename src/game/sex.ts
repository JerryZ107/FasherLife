import type { Sex } from "../types";

/** 旧档无性别时，用 uid 稳定哈希出公/母。 */
export function sexFromUid(uid: string): Sex {
  let h = 2166136261;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2 === 0 ? "male" : "female";
}
