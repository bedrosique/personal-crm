import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const displayFont = localFont({
  src: "../../public/fonts/oswald-bold.ttf",
  weight: "700",
  style: "normal",
  display: "swap",
  variable: "--font-oswald",
});
export const metadata: Metadata = {
  title: "СВЯЗИ. — личная CRM",
  description: "Люди и контекст вашего общения",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={displayFont.variable}>
      <body>{children}</body>
    </html>
  );
}
