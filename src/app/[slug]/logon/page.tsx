import { redirect } from "next/navigation";
import { ownerLogon } from "@/app/actions/auth";
import { PromptForm } from "@/components/PromptForm";
import { getAccess } from "@/lib/access";

export const metadata = { title: "Logon" };

export default async function OwnerLogon({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getAccess(slug);
  if (access.role === "owner") redirect(`/${access.terminal.slug}`);
  return (
    <PromptForm
      back={`/${access.terminal.slug}`}
      blocks={[
        { t: "line", text: "WELCOME TO ROBCO INDUSTRIES (TM) TERMLINK" },
        { t: "gap" },
        { t: "line", text: `>LOGON ${access.owner.username.toUpperCase()}` },
        { t: "gap" },
        { t: "line", text: "ENTER PASSWORD NOW" },
        { t: "gap" },
      ]}
      fields={[{ name: "password", label: "", secret: true }]}
      submit={ownerLogon.bind(null, access.terminal.slug)}
      busyText="Verifying..."
    />
  );
}
