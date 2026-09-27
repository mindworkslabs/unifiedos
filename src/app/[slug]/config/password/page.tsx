import { changePassword } from "@/app/actions/auth";
import { PromptForm } from "@/components/PromptForm";
import { requireOwner } from "@/lib/access";
import { headerFor } from "@/lib/screens";

export default async function PasswordPage({ params }: { params: Promise<{ slug: string }> }) {
  const access = await requireOwner((await params).slug);
  return (
    <PromptForm
      back={`/${access.terminal.slug}/config`}
      blocks={[...headerFor(access), { t: "line", text: "Change Operator Password" }, { t: "gap" }]}
      fields={[
        { name: "current", label: "CURRENT PASSWORD:", secret: true },
        { name: "next", label: "NEW PASSWORD:", secret: true },
        { name: "confirm", label: "CONFIRM:", secret: true },
      ]}
      submit={changePassword}
    />
  );
}
