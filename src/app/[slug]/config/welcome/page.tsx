import { updateWelcome } from "@/app/actions/config";
import { PromptForm } from "@/components/PromptForm";
import { requireOwner } from "@/lib/access";
import { headerFor } from "@/lib/screens";

export default async function WelcomePage({ params }: { params: Promise<{ slug: string }> }) {
  const access = await requireOwner((await params).slug);
  return (
    <PromptForm
      back={`/${access.terminal.slug}/config`}
      blocks={[...headerFor(access), { t: "line", text: "Set the message shown to everyone who connects." }, { t: "gap" }]}
      fields={[{ name: "welcome", label: "WELCOME:", initial: access.terminal.welcome, maxLength: 80 }]}
      submit={updateWelcome.bind(null, access.terminal.slug)}
    />
  );
}
