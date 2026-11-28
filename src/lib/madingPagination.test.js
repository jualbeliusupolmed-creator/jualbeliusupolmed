import { describe, expect, it } from "vitest";
import { appendUniqueMadingPosts } from "./madingPagination";

describe("appendUniqueMadingPosts", () => {
  it("keeps existing entries and removes duplicates within a fetched page", () => {
    const current = [
      { id: "post-1", _kind: "mading", title: "Existing", created_at: "2026-11-01T10:00:00Z" },
    ];
    const incoming = [
      { id: "post-1", _kind: "mading", title: "Stale duplicate", created_at: "2026-11-02T10:00:00Z" },
      { id: "post-2", _kind: "mading", title: "New post", created_at: "2026-11-03T10:00:00Z" },
      { id: "post-2", _kind: "mading", title: "Duplicate in page", created_at: "2026-11-04T10:00:00Z" },
      { id: "post-1", _kind: "blog", title: "Blog with same ID", created_at: "2026-11-05T10:00:00Z" },
    ];

    expect(appendUniqueMadingPosts(current, incoming)).toEqual([
      incoming[3],
      incoming[1],
      current[0],
    ]);
  });
});
