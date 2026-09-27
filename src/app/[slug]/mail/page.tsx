import type { MenuItem } from "@/components/screen";
import { Terminal } from "@/components/Terminal";
import { requireRead } from "@/lib/access";
import { listMail } from "@/lib/mail";
import { headerFor } from "@/lib/screens";

export const metadata = { title: "Termlink Mail" };

export default async function MailHome({ params }: { params: Promise<{ slug: string }> }) {
  const access = await requireRead((await params).slug);
  const base = `/${access.terminal.slug}`;
  const inbox = await listMail(access.owner.id, "inbox");
  const unread = inbox.filter((m) => !m.readAt).length;
  const items: MenuItem[] = [
    { label: `Inbox (${inbox.length}${unread ? `, ${unread} new` : ""})`, href: `${base}/mail/inbox` },
    { label: "Sent", href: `${base}/mail/sent` },
  ];
  if (access.role === "owner") items.push({ label: "[Compose Message]", href: `${base}/mail/compose` });
  items.push({ label: "Back", href: base });
  return (
    <Terminal
      back={base}
      blocks={[
        ...headerFor(access),
        { t: "line", text: "Termlink Mail" },
        { t: "line", text: `Mailbox: ${access.owner.username.toUpperCase()}`, dim: true },
        { t: "gap" },
        { t: "menu", items },
      ]}
    />
  );
}
