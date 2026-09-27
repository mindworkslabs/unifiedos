import { logoff } from "@/app/actions/auth";
import type { Block } from "@/components/screen";
import { Terminal } from "@/components/Terminal";
import { getCurrentUser, getMyTerminal } from "@/lib/access";
import { PIPOS_BOOT } from "@/lib/firmware";

export default async function Home() {
  const [user, terminal] = await Promise.all([getCurrentUser(), getMyTerminal()]);
  const blocks: Block[] = [
    ...PIPOS_BOOT.map((text, i): Block => ({ t: "line", text, center: i === 0 })),
    { t: "gap" },
    { t: "line", text: "ROBCO INDUSTRIES (TM) TERMLINK NETWORK" },
    { t: "line", text: user ? `Operator: ${user.username.toUpperCase()}` : "Operator: NOT LOGGED ON", dim: true },
    { t: "rule" },
    {
      t: "menu",
      items: user
        ? [
            ...(terminal ? [{ label: `Access Terminal /${terminal.slug}`, href: `/${terminal.slug}` }] : []),
            { label: "Connect to Remote Terminal", href: "/connect" },
            { label: "Log Off", action: logoff.bind(null, undefined) },
          ]
        : [
            { label: "Logon", href: "/logon" },
            { label: "Register New Terminal", href: "/register" },
            { label: "Connect to Remote Terminal", href: "/connect" },
          ],
    },
  ];
  return <Terminal blocks={blocks} />;
}
