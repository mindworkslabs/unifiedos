import { cycleSetting, resetLockouts } from "@/app/actions/config";
import { backItem } from "@/components/screen";
import { Terminal } from "@/components/Terminal";
import { requireOwner } from "@/lib/access";
import { FIRMWARE_LABEL } from "@/lib/firmware";
import { SECURITY_LEVELS } from "@/lib/hack/engine";
import { headerFor } from "@/lib/screens";

export const metadata = { title: "Configuration" };

function lockoutLabel(s: number) {
  if (s === 0) return "UNTIL RESET BY OPERATOR";
  return s >= 3600 ? `${s / 3600} HR` : `${s / 60} MIN`;
}

export default async function ConfigPage({ params }: { params: Promise<{ slug: string }> }) {
  const access = await requireOwner((await params).slug);
  const t = access.terminal;
  const base = `/${t.slug}`;
  const cycle = (key: Parameters<typeof cycleSetting>[1]) => cycleSetting.bind(null, t.slug, key);
  const lvl = SECURITY_LEVELS[t.securityLevel];
  return (
    <Terminal
      back={base}
      blocks={[
        ...headerFor(access),
        { t: "line", text: "Terminal Configuration" },
        { t: "line", text: `Address: /${t.slug}   Operator: ${access.owner.username.toUpperCase()}`, dim: true },
        { t: "gap" },
        {
          t: "menu",
          items: [
            { label: `Firmware: ${FIRMWARE_LABEL[t.firmware]}`, action: cycle("firmware") },
            { label: `Phosphor: ${t.phosphor.toUpperCase()}`, action: cycle("phosphor") },
            { label: `Server Designation: -Server ${t.serverNo}-`, action: cycle("serverNo") },
            { label: `Welcome Message: ${t.welcome}`.slice(0, 50), href: `${base}/config/welcome` },
            {
              label: `Security Level: ${t.securityLevel} (${lvl.lengths[0]}-${lvl.lengths[1]} letter passwords)`,
              action: cycle("securityLevel"),
            },
            { label: `Lockout Duration: ${lockoutLabel(t.lockoutSeconds)}`, action: cycle("lockoutSeconds") },
            { label: `Maintenance Reset Exploit: ${t.exploitEnabled ? "UNPATCHED" : "PATCHED"}`, action: cycle("exploitEnabled") },
            { label: "[Reset All Lockouts]", action: resetLockouts.bind(null, t.slug) },
            { label: "[Change Password]", href: `${base}/config/password` },
            ...backItem(t.firmware, base),
          ],
        },
      ]}
    />
  );
}
