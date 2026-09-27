import { Crt } from "@/components/Crt";
import { Terminal } from "@/components/Terminal";

export default function NotFound() {
  return (
    <Crt firmware="termlink" phosphor="green">
      <Terminal
        back="/"
        blocks={[
          { t: "line", text: "ERROR 0x03C663A1" },
          { t: "line", text: "Network connection not found." },
          { t: "gap" },
          { t: "line", text: "No terminal responds at this address." },
          { t: "rule" },
          { t: "menu", items: [{ label: "Return to Termlink Network", href: "/" }] },
        ]}
      />
    </Crt>
  );
}
