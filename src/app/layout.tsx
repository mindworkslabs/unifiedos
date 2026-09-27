import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const fixedsys = localFont({
  src: "../fonts/FSEX300.ttf",
  variable: "--font-fixedsys",
  display: "block",
});

const shareTech = localFont({
  src: "../fonts/ShareTechMono-Regular.ttf",
  variable: "--font-sharetech",
  display: "block",
});

export const metadata: Metadata = {
  title: { default: "RobCo Termlink", template: "%s | RobCo Termlink" },
  description: "RobCo Industries Unified Operating System. Your terminal on the Termlink network.",
};

export const viewport: Viewport = { themeColor: "#070907" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fixedsys.variable} ${shareTech.variable}`}>
      <body>{children}</body>
    </html>
  );
}
