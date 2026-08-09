import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getOrganizationMembershipList = vi.fn();
vi.mock("../lib/auth", () => ({
  getClerkClient: () => ({
    organizations: { getOrganizationMembershipList },
  }),
}));

const { notifyGap } = await import("./notifyGap");

const baseInput = {
  gap: { id: "gap_1", gapType: "PAST_DEADLINE", severity: "HIGH" },
  obligation: { code: "IA-01", title: "Risk profiling manual" },
  clientName: "Asha Rao",
  dueDate: new Date("2026-01-01T00:00:00Z"),
  clerkOrgId: "org_1",
};

describe("notifyGap", () => {
  beforeEach(() => {
    getOrganizationMembershipList.mockReset();
    vi.stubGlobal("fetch", vi.fn());
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns 0 and never calls fetch when RESEND_API_KEY is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await notifyGap(baseInput);
    expect(result).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    expect(getOrganizationMembershipList).not.toHaveBeenCalled();
  });

  it("sends only to OWNER_EMAIL and skips the Clerk lookup when it's set", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("OWNER_EMAIL", "owner@example.com");
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    const result = await notifyGap(baseInput);

    expect(result).toBe(1);
    expect(getOrganizationMembershipList).not.toHaveBeenCalled();
    const [, options] = vi.mocked(fetch).mock.calls[0]!;
    const body = JSON.parse(options!.body as string);
    expect(body.to).toEqual(["owner@example.com"]);
  });

  // WEB_ORIGIN doubles as the CORS allowlist, so in production it routinely
  // holds several comma-separated origins. Using it verbatim produced a dead
  // link in every notification email.
  it("builds the gap link from the first origin when WEB_ORIGIN lists several", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("OWNER_EMAIL", "owner@example.com");
    vi.stubEnv("WEB_ORIGIN", "https://app.example.com,https://preview.example.com");
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    await notifyGap(baseInput);

    const [, options] = vi.mocked(fetch).mock.calls[0]!;
    const body = JSON.parse(options!.body as string);
    expect(body.html).toContain("https://app.example.com/gaps/gap_1");
    expect(body.html).not.toContain("preview.example.com/gaps");
  });

  it("tolerates whitespace around the origins in WEB_ORIGIN", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("OWNER_EMAIL", "owner@example.com");
    vi.stubEnv("WEB_ORIGIN", "  https://app.example.com , https://preview.example.com ");
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    await notifyGap(baseInput);

    const [, options] = vi.mocked(fetch).mock.calls[0]!;
    const body = JSON.parse(options!.body as string);
    expect(body.html).toContain("https://app.example.com/gaps/gap_1");
  });

  it("looks up Clerk org members and filters out ones with no email when OWNER_EMAIL is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    getOrganizationMembershipList.mockResolvedValue({
      data: [
        { publicUserData: { identifier: "a@example.com" } },
        { publicUserData: { identifier: null } },
        { publicUserData: undefined },
      ],
    });
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    const result = await notifyGap(baseInput);

    expect(result).toBe(1);
    const [, options] = vi.mocked(fetch).mock.calls[0]!;
    const body = JSON.parse(options!.body as string);
    expect(body.to).toEqual(["a@example.com"]);
  });

  it("returns 0 without calling fetch when no org members have an email", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    getOrganizationMembershipList.mockResolvedValue({ data: [] });

    const result = await notifyGap(baseInput);

    expect(result).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 0 without throwing when Resend responds with a non-ok status", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("OWNER_EMAIL", "owner@example.com");
    vi.mocked(fetch).mockResolvedValue(new Response("bad request", { status: 422 }));

    const result = await notifyGap(baseInput);

    expect(result).toBe(0);
  });

  it("returns the recipient count and posts subject/body on success", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("OWNER_EMAIL", "owner@example.com");
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    const result = await notifyGap(baseInput);

    expect(result).toBe(1);
    const [url, options] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(options!.body as string);
    expect(body.subject).toContain("IA-01");
    expect(body.html).toContain("Asha Rao");
  });
});
