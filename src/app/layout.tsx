import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Близкие — личная CRM",
  description: "Люди и контекст вашего общения",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
