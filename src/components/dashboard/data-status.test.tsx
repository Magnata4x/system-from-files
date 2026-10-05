import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataStatusBadge } from "./data-status";

describe("DataStatusBadge", () => {
  it("exposes unavailable state without fabricating a value", () => {
    render(<DataStatusBadge source="Calendário econômico" status="unavailable" />);
    expect(screen.getByText("Calendário econômico · indisponível")).toBeInTheDocument();
  });

  it("makes stale state explicit with age", () => {
    render(<DataStatusBadge source="Sinais" status="stale" updatedAt={Date.now() - 120_000} />);
    expect(screen.getByText(/Sinais · desatualizado/)).toBeInTheDocument();
  });
});
