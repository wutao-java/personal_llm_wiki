import { ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import type { Evidence } from "../api/types";

type MarkdownNode = {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
  data?: { hName?: string; hProperties?: { id?: string } };
};

function evidenceReferences(evidence: Evidence[]) {
  const ids = evidence.map((item) => item.evidenceId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?<![\\w-])(?:${ids.join("|")})(?![\\w-])`, "g");

  return () => (root: MarkdownNode) => {
    const visit = (parent: MarkdownNode) => {
      if (!parent.children) return;
      parent.children = parent.children.flatMap((node) => {
        if (node.type !== "text" || !node.value) {
          if (node.type !== "link" && node.type !== "linkReference") visit(node);
          return [node];
        }
        const children: MarkdownNode[] = [];
        let start = 0;
        for (const match of node.value.matchAll(pattern)) {
          if (match.index > start) children.push({ type: "text", value: node.value.slice(start, match.index) });
          children.push({ type: "link", url: `#evidence-${encodeURIComponent(match[0])}`, children: [{ type: "text", value: match[0] }] });
          start = match.index + match[0].length;
        }
        if (!children.length) return [node];
        if (start < node.value.length) children.push({ type: "text", value: node.value.slice(start) });
        return children;
      });
    };
    visit(root);
  };
}

export function stripFrontmatter(content: string): string {
  if (!content.startsWith("---\n")) return content;
  const marker = content.indexOf("\n---\n", 4);
  return marker >= 0 ? content.slice(marker + 5).trimStart() : content;
}

function sourceHighlight(content: string, body: string, range: { start: number; end: number }) {
  const prefix = content.length - body.length;
  const start = Array.from(content).slice(0, range.start).join("").length - prefix;
  const end = Array.from(content).slice(0, range.end).join("").length - prefix;
  return () => (root: MarkdownNode) => {
    let first = true;
    const visit = (parent: MarkdownNode) => {
      if (!parent.children) return;
      parent.children = parent.children.flatMap((node) => {
        if (node.type !== "text" || !node.value || node.position?.start.offset === undefined || node.position.end.offset === undefined) {
          visit(node);
          return [node];
        }
        const offset = node.position.start.offset;
        const raw = body.slice(offset, node.position.end.offset);
        const textOffset = raw.indexOf(node.value);
        const textStart = textOffset >= 0 ? offset + textOffset : offset;
        const from = Math.max(0, start - textStart);
        const to = Math.min(node.value.length, end - textStart);
        if (from >= to) return [node];
        const marked: MarkdownNode = {
          type: "strong",
          data: { hName: "mark", hProperties: first ? { id: "source-highlight" } : undefined },
          children: [{ type: "text", value: node.value.slice(from, to) }],
        };
        first = false;
        return [
          ...(from ? [{ type: "text", value: node.value.slice(0, from) }] : []),
          marked,
          ...(to < node.value.length ? [{ type: "text", value: node.value.slice(to) }] : []),
        ];
      });
    };
    visit(root);
  };
}

export function MarkdownView({ content, className = "", onCitation, evidence, onEvidence, highlightRange }: {
  content: string;
  className?: string;
  onCitation?: (index: number) => void;
  evidence?: Evidence[];
  onEvidence?: (item: Evidence) => void;
  highlightRange?: { start: number; end: number } | null;
}) {
  const body = stripFrontmatter(content);
  const prepared = onCitation ? body.replace(/\[(\d{1,2})\]/g, "[$1](#citation-$1)") : body;
  const evidenceById = new Map(evidence?.map((item, index) => [encodeURIComponent(item.evidenceId), { item, index }]));
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, ...(highlightRange ? [sourceHighlight(content, body, highlightRange)] : []), ...(evidence?.length && onEvidence ? [evidenceReferences(evidence)] : [])]}
        rehypePlugins={highlightRange ? [[rehypeSanitize, { ...defaultSchema, tagNames: [...(defaultSchema.tagNames ?? []), "mark"] }]] : [rehypeSanitize]}
        components={{
          mark: ({ children, id }) => <mark id={id ? "source-highlight" : undefined} className="document-reader__highlight">{children}</mark>,
          a: ({ href, children, ...props }) => {
            const evidenceId = href?.startsWith("#evidence-") ? href.slice("#evidence-".length) : null;
            const reference = evidenceId ? evidenceById.get(evidenceId) : null;
            if (reference && onEvidence) {
              const { item, index } = reference;
              const location = item.pageNumber ? ` · 第 ${item.pageNumber} 页` : item.blockLabel ? ` · ${item.blockLabel}` : "";
              return (
                <button className="evidence-reference" onClick={() => onEvidence(item)} type="button">
                  [{index + 1}] {item.sourceTitle}{location}
                </button>
              );
            }
            const citation = href?.match(/^#citation-(\d+)$/);
            if (citation && onCitation) {
              return (
                <button className="citation-marker" onClick={() => onCitation(Number(citation[1]))} type="button">
                  {children}
                </button>
              );
            }
            const external = href?.startsWith("http");
            return (
              <a {...props} href={href} rel={external ? "noreferrer" : undefined} target={external ? "_blank" : undefined}>
                {children}{external ? <ExternalLink size={12} /> : null}
              </a>
            );
          },
        }}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
}
