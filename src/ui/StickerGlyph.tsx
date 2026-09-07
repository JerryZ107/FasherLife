type Props = {
  id: string;
  glyph: string;
  className?: string;
};

/** 三个点等纯文本表情在圆钮里容易看不见，单独渲染。 */
export function StickerGlyph({ id, glyph, className = "" }: Props) {
  if (id === "dots") {
    return (
      <span className={`sticker-dots-glyph ${className}`.trim()} aria-hidden>
        ...
      </span>
    );
  }
  return (
    <span className={className || undefined} aria-hidden={className ? true : undefined}>
      {glyph}
    </span>
  );
}
