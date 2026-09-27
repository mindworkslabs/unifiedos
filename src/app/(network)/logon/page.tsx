import { redirect } from "next/navigation";
import { logon } from "@/app/actions/auth";
import { PromptForm } from "@/components/PromptForm";
import { getMyTerminal } from "@/lib/access";

export const metadata = { title: "Logon" };

export default async function LogonPage() {
  const mine = await getMyTerminal();
  if (mine) redirect(`/${mine.slug}`);
  return (
    <PromptForm
      back="/"
      blocks={[
        { t: "line", text: "WELCOME TO ROBCO INDUSTRIES (TM) TERMLINK" },
        { t: "gap" },
        { t: "line", text: "Operator logon. Enter your credentials." },
        { t: "gap" },
      ]}
      fields={[
        { name: "username", label: "LOGON", maxLength: 24 },
        { name: "password", label: "PASSWORD:", secret: true },
      ]}
      submit={logon}
      busyText="Verifying credentials..."
    />
  );
}
