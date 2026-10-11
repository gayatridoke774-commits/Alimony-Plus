import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const jar = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => jar }));
import { GET, POST } from "../src/app/api/backend/[...path]/route";
const base = "http://127.0.0.1:3000";
function ctx(path: string) {
  return { params: Promise.resolve({ path: path.split("/") }) };
}
describe("same-origin backend adapter", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });
  it("rejects unauthenticated case reads without contacting upstream", async () => {
    const result = await GET(
      new NextRequest(`${base}/api/backend/cases`),
      ctx("cases"),
    );
    expect(result.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects cross-origin mutations", async () => {
    const result = await POST(
      new NextRequest(`${base}/api/backend/auth/login`, {
        method: "POST",
        headers: { origin: "https://other.example" },
      }),
      ctx("auth/login"),
    );
    expect(result.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not proxy arbitrary paths", async () => {
    const result = await GET(
      new NextRequest(`${base}/api/backend/admin`),
      ctx("admin"),
    );
    expect(result.status).toBe(404);
  });
  it("stores the login token HTTP-only and removes it from the response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        success: true,
        token: "synthetic-test-token",
        user: { name: "Test" },
      }),
    );
    const result = await POST(
      new NextRequest(`${base}/api/backend/auth/login`, {
        method: "POST",
        headers: {
          origin: base,
          host: "127.0.0.1:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "synthetic",
        }),
      }),
      ctx("auth/login"),
    );
    expect((await result.json()).token).toBeUndefined();
    expect(jar.set).toHaveBeenCalledWith(
      "alimony_session",
      "synthetic-test-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      }),
    );
  });
  it("forwards the server cookie as a bearer token and returns case data", async () => {
    jar.get.mockReturnValue({ value: "synthetic-test-token" });
    vi.mocked(fetch).mockResolvedValue(Response.json({ cases: [] }));
    const result = await GET(
      new NextRequest(`${base}/api/backend/cases`),
      ctx("cases"),
    );
    expect(result.status).toBe(200);
    const options = vi.mocked(fetch).mock.calls[0][1];
    expect(new Headers(options?.headers).get("Authorization")).toBe(
      "Bearer synthetic-test-token",
    );
  });
  it("clears an expired session on upstream 401", async () => {
    jar.get.mockReturnValue({ value: "expired" });
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ message: "Expired" }, { status: 401 }),
    );
    await GET(new NextRequest(`${base}/api/backend/cases`), ctx("cases"));
    expect(jar.delete).toHaveBeenCalledWith("alimony_session");
  });
  it("reports service failure instead of returning synthetic data", async () => {
    jar.get.mockReturnValue({ value: "test" });
    vi.mocked(fetch).mockRejectedValue(new Error("unavailable"));
    const response = await GET(
      new NextRequest(`${base}/api/backend/cases`),
      ctx("cases"),
    );
    expect(response.status).toBe(503);
    expect((await response.json()).cases).toBeUndefined();
  });
});
