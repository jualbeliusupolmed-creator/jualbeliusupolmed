import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CategoryFilter from "../src/components/CategoryFilter";

describe("CategoryFilter", () => {
  it("does not duplicate the supplied all-categories option", () => {
    render(
      <CategoryFilter
        active="all"
        onChange={vi.fn()}
        categories={[
          { name: "Semua Jasa", slug: "all" },
          { name: "Desain & Video", slug: "desain-video" },
        ]}
      />
    );

    expect(screen.getAllByRole("button", { name: "Semua Jasa" })).toHaveLength(1);
  });
});
