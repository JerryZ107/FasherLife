import { useEffect, useMemo, useState } from "react";
import { useGame } from "../store/gameStore";
import { formatNoteTime, notePreview, noteTitle } from "../game/notes";
import { EmptyHint, Page, PageBody, PageHead } from "../ui/chrome";
import type { PlayerNote } from "../save/saveSchema";

export default function NotesScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const createNote = useGame((s) => s.createNote);
  const saveNote = useGame((s) => s.saveNote);
  const deleteNote = useGame((s) => s.deleteNote);

  const [editUid, setEditUid] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");

  const playerLabel = save.playerName.trim() || "钓鱼佬";
  const sorted = useMemo(
    () => [...save.notes].sort((a, b) => b.updatedAt - a.updatedAt),
    [save.notes],
  );

  function openEditor(note: PlayerNote) {
    setEditUid(note.uid);
    setTitleDraft(note.title);
    setContentDraft(note.content);
  }

  function handleNew() {
    const uid = createNote();
    const note = useGame.getState().save.notes.find((n) => n.uid === uid);
    if (note) openEditor(note);
  }

  function closeEditor() {
    if (editUid) {
      const saved = save.notes.find((n) => n.uid === editUid);
      const empty =
        !titleDraft.trim()
        && !contentDraft.trim()
        && !saved?.title.trim()
        && !saved?.content.trim();
      if (empty) deleteNote(editUid);
    }
    setEditUid(null);
    setTitleDraft("");
    setContentDraft("");
  }

  function handleSave() {
    if (!editUid) return;
    saveNote(editUid, titleDraft, contentDraft);
  }

  useEffect(() => {
    if (!editUid) return;
    const still = save.notes.some((n) => n.uid === editUid);
    if (!still) setEditUid(null);
  }, [editUid, save.notes]);

  if (editUid) {
    return (
      <Page className="notes-page notes-edit">
        <PageHead
          onBack={closeEditor}
          backLabel="笔记"
          title="编辑"
          backGuide="back-notes"
          extra={
            <button type="button" className="pill primary" onClick={handleSave}>
              保存
            </button>
          }
        />
        <PageBody className="notes-editor">
          <div className="notes-paper">
            <input
              className="notes-title"
              value={titleDraft}
              placeholder="标题"
              maxLength={80}
              onChange={(e) => setTitleDraft(e.target.value)}
            />
            <textarea
              className="notes-body"
              value={contentDraft}
              placeholder="开始写笔记…"
              onChange={(e) => setContentDraft(e.target.value)}
            />
          </div>
        </PageBody>
      </Page>
    );
  }

  return (
    <Page className="notes-page">
      <PageHead onBack={() => setScene("aquarium")} title={`${playerLabel}的笔记`} />
      <PageBody className="notes-list">
        {sorted.length === 0 && <EmptyHint>还没有笔记，点下方加号新建</EmptyHint>}
        {sorted.map((note) => (
          <button key={note.uid} type="button" className="panel notes-row" onClick={() => openEditor(note)}>
            <span className="notes-row-main">
              <strong>{noteTitle(note)}</strong>
              <span className="dim notes-row-preview">{notePreview(note)}</span>
            </span>
            <span className="dim notes-row-time">{formatNoteTime(note.updatedAt)}</span>
          </button>
        ))}
      </PageBody>
      <button type="button" className="notes-fab" aria-label="新建笔记" onClick={handleNew}>
        <span>+</span>
      </button>
    </Page>
  );
}
