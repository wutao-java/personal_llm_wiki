import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MarkdownView, stripFrontmatter } from "./MarkdownView";

describe("MarkdownView", () => {
  it("removes source metadata frontmatter from the reader", () => {
    expect(stripFrontmatter("---\ntitle: Example\n---\n# Heading")).toBe("# Heading");
  });

  it("turns numbered citations into traceable controls", () => {
    const onCitation = vi.fn();
    render(<MarkdownView content="A supported conclusion [2]." onCitation={onCitation} />);
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(onCitation).toHaveBeenCalledWith(2);
  });

  it("sanitizes unsafe source markup", () => {
    const { container } = render(<MarkdownView content={'<script>alert("unsafe")</script>\n\nSafe text'} />);
    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(screen.getByText("Safe text")).toBeInTheDocument();
  });

  it("does not treat malformed fragment links as evidence", () => {
    render(<MarkdownView content="[原文](#evidence-%ZZ)" evidence={[]} onEvidence={vi.fn()} />);
    expect(screen.getByRole("link", { name: "原文" })).toBeInTheDocument();
  });

  it("highlights source characters without losing Markdown formatting or Unicode positions", () => {
    const content = "---\ntitle: 笔记\n---\n# 概览😀\n\n- **重点**：引用内容\n\n结尾";
    const start = Array.from(content).indexOf("重");
    const { container } = render(<MarkdownView content={content} highlightRange={{ start, end: start + 2 }} />);
    expect(screen.getByRole("heading", { name: "概览😀" })).toBeInTheDocument();
    expect(container.querySelector("li strong #source-highlight")).toHaveTextContent("重点");
    expect(container.querySelector("pre")).not.toBeInTheDocument();
  });

  it("keeps the first locator when a cited range crosses formatted text", () => {
    const content = "# 标题\n\n- **重点**：还有正文";
    const start = Array.from(content).indexOf("重");
    const { container } = render(<MarkdownView content={content} highlightRange={{ start, end: Array.from(content).length }} />);
    expect(container.querySelectorAll("mark")).toHaveLength(2);
    expect(container.querySelectorAll("#source-highlight")).toHaveLength(1);
    expect(container.querySelector("#source-highlight")).toHaveTextContent("重点");
    expect(container.querySelectorAll("mark")[1]).toHaveTextContent("：还有正文");
  });
});
