import type { Metadata } from "next";
// @ts-ignore
import "./globals.css";
// @ts-ignore
import "./framework.css"

export const metadata: Metadata = {
  title: "Block Game",
  description: "A Block Game built with Three.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
