import { FileCheck2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { SourceVersion } from "../api/types";
import { MarkdownView } from "./MarkdownView";

export function SourceDocumentReader({ source, location }: {
  source: SourceVersion;
  location?: { start: number; end: number; pageNumber?: number | null; blockNumber?: number | null } | null;
}) {
  const reader = useRef<HTMLElement>(null);
  const characters = useMemo(() => Array.from(source.content ?? ""), [source.content]);
  const range = location && Number.isInteger(location.start) && Number.isInteger(location.end)
    && location.start >= 0 && location.end > location.start && location.end <= characters.length
    ? { start: location.start, end: location.end } : null;

  useEffect(() => {
    if (!location) return;
    const frame = requestAnimationFrame(() => {
      const target = reader.current?.querySelector("#source-highlight")
        ?? reader.current?.querySelector(`#source-page-${location.pageNumber}`)
        ?? reader.current?.querySelector(`#source-block-${location.blockNumber}`);
      target?.scrollIntoView({ block: "start", inline: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [location?.start, location?.end, location?.pageNumber, location?.blockNumber, source]);

  if (!source.content && !source.pageSpans.length) return <p>此资料暂无可读取文字</p>;

  return (
    <article className="document-reader" ref={reader}>
      <div className="document-reader__notice"><FileCheck2 size={15} />{source.pageSpans.length ? "PDF 提取文本 · 原件只读保存" : source.blockSpans.length ? "Word 提取文本 · 原件只读保存" : "原始资料 · 只读"}</div>
      {source.pageSpans.length ? (
        <div className="document-reader__pages">
          {source.pageSpans.map((page) => (
            <section id={`source-page-${page.pageNumber}`} key={page.pageNumber}>
              <h3>第 {page.pageNumber} 页{page.extractionMethod === "ocr" ? <span className="document-reader__quality">{page.reviewStatus === "needs_review" ? `文字待核对 · 原始识别 ${Math.round(page.qualityScore ?? 0)} 分` : page.reviewStatus === "reviewed" ? `已人工校对 · 原始识别 ${Math.round(page.qualityScore ?? 0)} 分` : `文字识别 · ${Math.round(page.qualityScore ?? 0)} 分`}</span> : null}</h3>
              <SourceText characters={characters} start={page.charStart} end={page.charEnd} citedRange={range} empty="本页没有可提取文本" />
            </section>
          ))}
        </div>
      ) : source.blockSpans.length ? (
        <div className="document-reader__pages">
          {source.blockSpans.map((block) => (
            <section id={`source-block-${block.blockNumber}`} key={block.blockNumber}>
              <h3>{block.label}</h3>
              <SourceText characters={characters} start={block.charStart} end={block.charEnd} citedRange={range} />
            </section>
          ))}
        </div>
      ) : /\.(md|markdown)$/i.test(source.filename) ? (
        <MarkdownView content={source.content ?? ""} highlightRange={range} />
      ) : <SourceText characters={characters} start={0} end={characters.length} citedRange={range} />}
    </article>
  );
}

function SourceText({ characters, start, end, citedRange, empty }: {
  characters: string[];
  start: number;
  end: number;
  citedRange: { start: number; end: number } | null;
  empty?: string;
}) {
  if (!citedRange || citedRange.start < start || citedRange.start >= end) {
    return <pre>{characters.slice(start, end).join("") || empty}</pre>;
  }
  return <pre>{characters.slice(start, citedRange.start).join("")}<mark id="source-highlight" className="document-reader__highlight">{characters.slice(citedRange.start, Math.min(end, citedRange.end)).join("")}</mark>{characters.slice(Math.min(end, citedRange.end), end).join("")}</pre>;
}
