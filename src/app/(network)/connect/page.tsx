import { connect } from "@/app/actions/auth";
import { PromptForm } from "@/components/PromptForm";

export const metadata = { title: "Connect" };

export default function ConnectPage() {
  return (
    <PromptForm
      back="/"
      blocks={[
        { t: "line", text: "ROBCO INDUSTRIES (TM) TERMLINK" },
        { t: "line", text: "REMOTE TERMINAL CONNECTION" },
        { t: "rule" },
        { t: "text", text: "Enter the network address of the terminal you wish to reach." },
        { t: "gap" },
      ]}
      fields={[{ name: "address", label: "ADDRESS:", maxLength: 60 }]}
      submit={connect}
      busyText="Establishing Termlink connection..."
    />
  );
}
