import { Terminal } from "@/components/Terminal";
import { requireRead } from "@/lib/access";
import { mailboxScreen } from "@/lib/mailbox-screen";

export const metadata = { title: "Sent" };

export default async function Mailbox({ params }: { params: Promise<{ slug: string }> }) {
  const access = await requireRead((await params).slug);
  return <Terminal back={`/${access.terminal.slug}/mail`} blocks={await mailboxScreen(access, "sent")} />;
}
