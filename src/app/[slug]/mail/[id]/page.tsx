import { notFound } from "next/navigation";
import { deleteMessage } from "@/app/actions/mail";
import { backItem, type MenuItem } from "@/components/screen";
import { Terminal } from "@/components/Terminal";
import { logEvent, requireRead } from "@/lib/access";
import { getMail, markRead } from "@/lib/mail";
import { formatStamp, headerFor } from "@/lib/screens";

export default async function MailView({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const access = await requireRead(slug);
  const { terminal, owner, role } = access;
  const m = await getMail(owner.id, id);
  if (!m) notFound();
  const inbound = m.toUserId === owner.id;
  const base = `/${terminal.slug}`;
  const back = `${base}/mail/${inbound ? "inbox" : "sent"}`;

  if (role === "owner" && inbound && !m.readAt) await markRead(m.id);
  if (role === "intruder") await logEvent(terminal.id, "intruder", "READ MAIL", `${m.from} → ${m.to}: ${m.subject}`);

  const items: MenuItem[] = [];
  if (role === "owner") {
    if (inbound) items.push({ label: "[Reply]", href: `${base}/mail/compose?re=${m.id}` });
    items.push({ label: "[Delete]", confirm: "Delete this message?", action: deleteMessage.bind(null, terminal.slug, m.id) });
  }
  items.push(...backItem(terminal.firmware, back));

  return (
    <Terminal
      back={back}
      blocks={[
        ...headerFor(access),
        { t: "line", text: `From: ${m.from.toUpperCase()}` },
        { t: "line", text: `To: ${m.to.toUpperCase()}` },
        { t: "line", text: `Date: ${formatStamp(m.createdAt)}` },
        { t: "line", text: `Subject: ${m.subject}` },
        { t: "rule" },
        { t: "text", text: m.body },
        { t: "gap" },
        { t: "menu", items },
      ]}
    />
  );
}
