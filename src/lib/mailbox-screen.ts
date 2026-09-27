import "server-only";
import type { Block, MenuItem } from "@/components/screen";
import type { Access } from "./access";
import { listMail } from "./mail";
import { formatStamp, headerFor } from "./screens";

export async function mailboxScreen(access: Access, box: "inbox" | "sent"): Promise<Block[]> {
  const base = `/${access.terminal.slug}`;
  const mail = await listMail(access.owner.id, box);
  const items: MenuItem[] = mail.map((m) => {
    const who = (box === "inbox" ? m.from : m.to).toUpperCase().slice(0, 12).padEnd(12);
    const flag = box === "inbox" && !m.readAt ? "*" : " ";
    return { label: `${flag}${formatStamp(m.createdAt).slice(5, 10)} ${who} ${m.subject}`.slice(0, 50), href: `${base}/mail/${m.id}` };
  });
  items.push({ label: "Back", href: `${base}/mail` });
  return [
    ...headerFor(access),
    { t: "line", text: box === "inbox" ? "Inbox" : "Sent Messages" },
    ...(mail.length ? [] : ([{ t: "line", text: "No messages.", dim: true }] as Block[])),
    { t: "gap" },
    { t: "menu", items },
  ];
}
