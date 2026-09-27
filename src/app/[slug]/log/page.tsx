import { desc, eq } from "drizzle-orm";
import { backItem, type Block } from "@/components/screen";
import { Terminal } from "@/components/Terminal";
import { getDb } from "@/db";
import { accessLog } from "@/db/schema";
import { requireOwner } from "@/lib/access";
import { formatStamp, headerFor } from "@/lib/screens";

export const metadata = { title: "Access Log" };

function who(actor: string, visitorId: string | null) {
  if (actor === "owner") return "OPERATOR";
  const tag = (visitorId ?? "????").replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${actor === "intruder" ? "INTRUDER" : "VISITOR"} ${tag}`;
}

export default async function LogPage({ params }: { params: Promise<{ slug: string }> }) {
  const access = await requireOwner((await params).slug);
  const db = await getDb();
  const rows = await db
    .select()
    .from(accessLog)
    .where(eq(accessLog.terminalId, access.terminal.id))
    .orderBy(desc(accessLog.createdAt))
    .limit(100);
  const lines: Block[] = rows.map((r) => ({
    t: "line",
    text: `${formatStamp(r.createdAt).slice(5)} ${who(r.actor, r.visitorId).padEnd(13)} ${r.event}${r.detail ? `: ${r.detail}` : ""}`.slice(0, 54),
  }));
  return (
    <Terminal
      back={`/${access.terminal.slug}`}
      rate={600}
      blocks={[
        ...headerFor(access),
        { t: "line", text: "Access Log (last 100 events)" },
        { t: "gap" },
        ...(lines.length ? lines : [{ t: "line", text: "No events recorded.", dim: true } as Block]),
        { t: "gap" },
        { t: "menu", items: backItem(access.terminal.firmware, `/${access.terminal.slug}`) },
      ]}
    />
  );
}
