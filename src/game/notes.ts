import type { PlayerNote } from "../save/saveSchema";

export function noteTitle(note: Pick<PlayerNote, "title" | "content">): string {
  const t = note.title.trim();
  if (t) return t;
  const first = note.content.split(/\r?\n/).find((line) => line.trim());
  if (first?.trim()) return first.trim().slice(0, 40);
  return "无标题";
}

export function notePreview(note: Pick<PlayerNote, "title" | "content">): string {
  const lines = note.content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return "无内容";
  if (note.title.trim()) return lines.join(" ").slice(0, 72);
  if (lines.length === 1) return "无内容";
  return lines.slice(1).join(" ").slice(0, 72);
}

export function formatNoteTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
