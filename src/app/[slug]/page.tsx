import { and, count, eq, isNull } from "drizzle-orm";
import { logoff } from "@/app/actions/auth";
import { terminalHeader, type Block, type MenuItem } from "@/components/screen";
import { Terminal } from "@/components/Terminal";
import { getDb } from "@/db";
import { messages } from "@/db/schema";
import { getAccess, getLockout } from "@/lib/access";
import { headerFor } from "@/lib/screens";

export default async function TerminalHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getAccess(slug);
  const { terminal, owner } = access;
  const base = `/${terminal.slug}`;

  if (!access.role) {
    const lock = await getLockout(terminal.id);
    if (lock) {
      const mins = Math.ceil((lock.until.getTime() - Date.now()) / 60000);
      const blocks: Block[] =
        terminal.firmware === "uos"
          ? [
              { t: "gap" },
              { t: "gap" },
              { t: "gap" },
              { t: "line", text: "TERMINAL LOCKED", center: true },
              { t: "gap" },
              { t: "line", text: "PLEASE CONTACT AN ADMINISTRATOR", center: true },
              { t: "gap" },
            ]
          : [...terminalHeader({ firmware: "termlink", serverNo: 1, welcome: terminal.welcome }), { t: "line", text: "This terminal has locked you out." }, { t: "gap" }];
      if (terminal.lockoutSeconds > 0 && mins < 60 * 24) blocks.push({ t: "line", text: `Retry in ${mins} min.`, center: terminal.firmware === "uos", dim: true });
      blocks.push({ t: "gap" }, { t: "menu", items: [{ label: "Administrator Logon", href: `${base}/logon` }, { label: "Disconnect", href: "/" }] });
      return <Terminal blocks={blocks} back="/" />;
    }
    return (
      <Terminal
        back="/"
        blocks={[
          ...terminalHeader({ firmware: terminal.firmware, serverNo: terminal.serverNo, welcome: terminal.welcome }),
          { t: "line", text: terminal.firmware === "uos" ? "PASSWORD REQUIRED" : "Password Required" },
          { t: "gap" },
          {
            t: "menu",
            items: [
              { label: `Logon ${owner.username.toUpperCase()}`, href: `${base}/logon` },
              { label: "Enter Maintenance Mode", href: `${base}/hack` },
              { label: "Disconnect", href: "/" },
            ],
          },
        ]}
      />
    );
  }

  const db = await getDb();
  const [{ unread }] = await db
    .select({ unread: count() })
    .from(messages)
    .where(and(eq(messages.toUserId, owner.id), isNull(messages.readAt), eq(messages.deletedByRecipient, false)));

  const items: MenuItem[] = [
    { label: "Personal Files", href: `${base}/files` },
    { label: `Termlink Mail${unread ? ` (${unread} new)` : ""}`, href: `${base}/mail` },
  ];
  if (access.role === "owner") {
    items.push({ label: "Access Log", href: `${base}/log` }, { label: "Terminal Configuration", href: `${base}/config` });
  }
  items.push({ label: access.role === "owner" ? "Log Off" : "Disconnect", action: logoff.bind(null, terminal.slug) });

  return <Terminal blocks={[...headerFor(access), { t: "menu", items }]} />;
}
