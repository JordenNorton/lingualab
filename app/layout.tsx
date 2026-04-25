import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinguaLab",
  description: "AI-generated reading practice, explanations, and workbook drills for language learners."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
