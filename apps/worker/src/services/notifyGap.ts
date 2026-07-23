import { getClerkClient } from "../lib/auth";

interface NotifyGapInput {
  gap: { id: string; gapType: string; severity: string };
  obligation: { code: string; title: string };
  clientName: string | null;
  dueDate: Date | null;
  clerkOrgId: string;
}

const GAP_TYPE_LABELS: Record<string, string> = {
  PAST_DEADLINE: "Deadline passed with no evidence",
  MISSING_EVIDENCE: "No evidence submitted",
  STALE_EVIDENCE: "Evidence expired",
};

// Emails every member of the intermediary's Clerk organization via Resend's
// REST API (plain fetch — no SDK needed). Returns the recipient count, or 0
// when nothing was sent (no key configured / no members / send failed).
// Callers treat 0 as "not notified" and skip setting notifiedAt.
export async function notifyGap(input: NotifyGapInput): Promise<number> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[notifyGap] RESEND_API_KEY not set — skipping email notification");
    return 0;
  }

  // OWNER_EMAIL overrides the Clerk member lookup entirely: in Resend
  // sandbox mode (no verified sending domain), delivery only succeeds to the
  // account owner's own address anyway, so looking up real org members would
  // just produce a rejected send.
  const ownerEmail = process.env.OWNER_EMAIL;
  let recipients: string[];
  if (ownerEmail) {
    recipients = [ownerEmail];
  } else {
    const memberships = await getClerkClient().organizations.getOrganizationMembershipList({
      organizationId: input.clerkOrgId,
      limit: 100,
    });
    recipients = memberships.data
      .map((m) => m.publicUserData?.identifier)
      .filter((email): email is string => Boolean(email));
    if (recipients.length === 0) {
      console.warn(`[notifyGap] no member emails found for org ${input.clerkOrgId}`);
      return 0;
    }
  }

  const gapUrl = `${process.env.WEB_ORIGIN ?? "http://localhost:3000"}/gaps/${input.gap.id}`;
  const gapTypeLabel = GAP_TYPE_LABELS[input.gap.gapType] ?? input.gap.gapType;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM_EMAIL ?? "SEBISync <onboarding@resend.dev>",
      to: recipients,
      subject: `[SEBISync] New ${input.gap.severity} compliance gap: ${input.obligation.code}`,
      html: [
        `<p>A new <strong>${input.gap.severity}</strong> compliance gap was detected.</p>`,
        `<p><strong>Obligation:</strong> ${input.obligation.title} (${input.obligation.code})</p>`,
        input.clientName ? `<p><strong>Client:</strong> ${input.clientName}</p>` : "",
        `<p><strong>Issue:</strong> ${gapTypeLabel}</p>`,
        input.dueDate ? `<p><strong>Due date:</strong> ${input.dueDate.toDateString()}</p>` : "",
        `<p><a href="${gapUrl}">Review and resolve this gap</a></p>`,
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    console.error(`[notifyGap] Resend send failed (${response.status}): ${await response.text()}`);
    return 0;
  }
  return recipients.length;
}
