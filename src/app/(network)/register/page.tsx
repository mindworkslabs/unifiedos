import { redirect } from "next/navigation";
import { register } from "@/app/actions/auth";
import { PromptForm } from "@/components/PromptForm";
import { getMyTerminal } from "@/lib/access";

export const metadata = { title: "Register Terminal" };

export default async function RegisterPage() {
  const mine = await getMyTerminal();
  if (mine) redirect(`/${mine.slug}`);
  return (
    <PromptForm
      back="/"
      blocks={[
        { t: "line", text: "ROBCO INDUSTRIES (TM) TERMLINK" },
        { t: "line", text: "NEW TERMINAL ACTIVATION" },
        { t: "rule" },
        { t: "text", text: "Choose an operator username and password, then name the location where your terminal is installed. The location name becomes your terminal's network address." },
        { t: "gap" },
      ]}
      fields={[
        { name: "username", label: "USERNAME:", maxLength: 24 },
        { name: "password", label: "PASSWORD:", secret: true },
        { name: "confirm", label: "CONFIRM PASSWORD:", secret: true },
        { name: "location", label: "LOCATION NAME:", maxLength: 60 },
      ]}
      submit={register}
      busyText="Activating terminal..."
    />
  );
}
