import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserSession: vi.fn(),
  getAdminClient: vi.fn(),
  siarkanPesanBaru: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getUserSession: mocks.getUserSession,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: mocks.getAdminClient,
}));

vi.mock("@/lib/chatRealtime", () => ({
  siarkanPesanBaru: mocks.siarkanPesanBaru,
}));

vi.mock("@/lib/fonnte", () => ({
  sendWa: vi.fn().mockResolvedValue(true),
}));

import { GET, POST } from "@/app/api/chat/room/[id]/route";
import { metadata as chatMetadata } from "@/app/chat/layout";

describe("Chat Privacy & Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Metadata Privacy", () => {
    it("ensures /chat is never indexed by search engines", () => {
      expect(chatMetadata.robots.index).toBe(false);
      expect(chatMetadata.robots.follow).toBe(false);
    });

    it("has a valid non-duplicative title and canonical tag", () => {
      expect(chatMetadata.title).toBe("Obrolan Mahasiswa");
      expect(chatMetadata.alternates.canonical).toBe("/chat");
    });
  });

  describe("API Room Authorization", () => {
    it("rejects unauthenticated requests with 401", async () => {
      mocks.getUserSession.mockReturnValue(null);
      const single = vi.fn().mockResolvedValue({
        data: { id: "room-1", type: "marketplace", user1_id: "628111", user2_id: "628222" },
      });
      const eq = vi.fn(() => ({ single }));
      const select = vi.fn(() => ({ eq }));
      const from = vi.fn(() => ({ select }));
      mocks.getAdminClient.mockReturnValue({ from });

      const req = new Request("http://localhost/api/chat/room/room-1");
      const res = await GET(req, { params: { id: "room-1" } });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("rejects non-participant users with 403 Forbidden", async () => {
      mocks.getUserSession.mockReturnValue("6289999999"); // Orang asing
      const single = vi.fn().mockResolvedValue({
        data: { id: "room-1", type: "marketplace", user1_id: "628111", user2_id: "628222" },
      });
      const eq = vi.fn(() => ({ single }));
      const select = vi.fn(() => ({ eq }));
      const from = vi.fn(() => ({ select }));
      mocks.getAdminClient.mockReturnValue({ from });

      const req = new Request("http://localhost/api/chat/room/room-1");
      const res = await GET(req, { params: { id: "room-1" } });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("bukan peserta");
    });

    it("allows authorized participants to read their messages", async () => {
      mocks.getUserSession.mockReturnValue("628111"); // Peserta sah (user1)
      const roomData = { id: "room-1", type: "marketplace", user1_id: "628111", user2_id: "628222" };
      
      const single = vi.fn().mockResolvedValue({ data: roomData });
      const eqRoom = vi.fn(() => ({ single }));
      const selectRoom = vi.fn(() => ({ eq: eqRoom }));

      const orderMessages = vi.fn().mockResolvedValue({
        data: [{ id: "msg-1", message: "Halo kak", sender_id: "628111" }],
      });
      const eqMessages = vi.fn(() => ({ order: orderMessages }));
      const selectMessages = vi.fn(() => ({ eq: eqMessages }));

      const from = vi.fn((table) => {
        if (table === "chat_rooms") return { select: selectRoom };
        if (table === "chat_messages") return { select: selectMessages };
        return {};
      });
      mocks.getAdminClient.mockReturnValue({ from });

      const req = new Request("http://localhost/api/chat/room/room-1");
      const res = await GET(req, { params: { id: "room-1" } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.room.id).toBe("room-1");
      expect(body.messages).toHaveLength(1);
    });

    it("prevents non-participants from sending messages", async () => {
      mocks.getUserSession.mockReturnValue("6289999999"); // Orang asing
      const single = vi.fn().mockResolvedValue({
        data: { id: "room-1", type: "marketplace", user1_id: "628111", user2_id: "628222" },
      });
      const eq = vi.fn(() => ({ single }));
      const select = vi.fn(() => ({ eq }));
      const from = vi.fn(() => ({ select }));
      mocks.getAdminClient.mockReturnValue({ from });

      const req = new Request("http://localhost/api/chat/room/room-1", {
        method: "POST",
        body: JSON.stringify({ message: "Pesan penyusup" }),
      });
      const res = await POST(req, { params: { id: "room-1" } });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("bukan peserta");
    });
  });
});
