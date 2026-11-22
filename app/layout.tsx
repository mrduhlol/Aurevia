import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegistration } from "./pwa-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aurevia",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  description: "Opt-in connections between verified passengers on the same flight.",
};

export const viewport: Viewport = { themeColor: "#101d32", colorScheme: "dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
