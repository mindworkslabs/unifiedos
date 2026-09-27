import { Crt } from "@/components/Crt";

/** Screens that aren't tied to a location use a stock green UOS terminal. */
export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  return (
    <Crt firmware="termlink" phosphor="green">
      {children}
    </Crt>
  );
}
