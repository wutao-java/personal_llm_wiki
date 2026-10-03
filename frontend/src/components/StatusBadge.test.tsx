import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("uses professional product labels for persistent states", () => {
    render(<StatusBadge status="awaiting_review" />);
    expect(screen.getByText("等待确认")).toBeInTheDocument();
  });
});
