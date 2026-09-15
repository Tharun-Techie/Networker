import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Networker — relationship intelligence",
  description: "Map the people behind the organizations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
