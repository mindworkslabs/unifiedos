import { MailComposer } from "@/components/MailComposer";
import { requireOwner } from "@/lib/access";
import { getMail } from "@/lib/mail";
import { formatStamp } from "@/lib/screens";

export const metadata = { title: "Compose" };

export default async function ComposePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ to?: string; re?: string }>;
}) {
  const access = await requireOwner((await params).slug);
  const { to, re } = await searchParams;
  const original = re ? await getMail(access.owner.id, re) : null;
  const quoted = original
    ? `\n\n--- On ${formatStamp(original.createdAt)}, ${original.from.toUpperCase()} wrote:\n${original.body
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n")}`
    : "";
  return (
    <MailComposer
      slug={access.terminal.slug}
      from={access.owner.username}
      initialTo={original?.from ?? to ?? ""}
      initialSubject={original ? (original.subject.startsWith("RE: ") ? original.subject : `RE: ${original.subject}`) : ""}
      initialBody={quoted}
      exitTo={`/${access.terminal.slug}/mail`}
    />
  );
}
