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
  title: { default: "UnifiedOS", template: "%s | UnifiedOS" },
  description: "UnifiedOS: your own retro-futuristic terminal. Keep files, send mail, and guard your terminal against intruders.",
};

export const viewport: Viewport = { themeColor: "#070907" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fixedsys.variable} ${shareTech.variable}`}>
      <body>{children}</body>
    </html>
  );
}
