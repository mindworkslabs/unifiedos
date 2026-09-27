import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crt } from "@/components/Crt";
import { getTerminal } from "@/lib/access";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const row = await getTerminal((await params).slug);
  return { title: row ? row.terminal.name : "No Signal" };
}

export default async function TerminalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const row = await getTerminal((await params).slug);
  if (!row) notFound();
  return (
    <Crt firmware={row.terminal.firmware} phosphor={row.terminal.phosphor}>
      {children}
    </Crt>
  );
}
