import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlanForge RAG",
  description: "PSST \uAE30\uBC18 \uCC3D\uC5C5 \uC0AC\uC5C5\uACC4\uD68D\uC11C AI \uCD08\uC548 \uC0DD\uC131\uAE30",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
