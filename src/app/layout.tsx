import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Noto_Sans_Armenian } from "next/font/google";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoArmenian = Noto_Sans_Armenian({
  variable: "--font-armenian",
  subsets: ["armenian", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Pulse — Picsart Academy Որակի Հարցումներ և Խնդիրների Թրեքեր",
  description:
    "Որակի հարցումներ, AI ամփոփում, տրենդների վերլուծություն և խնդիրների հաստատված լուծումներ Picsart Academy-ի համար։",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  // Apple / Editorial defaults to crisp Light Mode, with 1-click Dark Mode toggle
  const theme = cookieStore.get("pulse_theme")?.value === "dark" ? "dark" : "light";
  const lang = cookieStore.get("pulse_lang")?.value === "en" ? "en" : "hy";

  return (
    <html
      lang={lang}
      className={`${theme === "dark" ? "dark" : ""} ${notoArmenian.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
