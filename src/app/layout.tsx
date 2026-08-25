import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "@fontsource-variable/plus-jakarta-sans";
import QueryProvider from "@/components/QueryProvider";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const username = process.env.GH_USERNAME || "octocat";

export const metadata: Metadata = {
  title: `${username} — build log`,
  description: `A live snapshot of what ${username} is building on GitHub right now.`,
  metadataBase: new URL("https://lnorton89.github.io"),
  openGraph: {
    title: `${username} — build log`,
    description: `A live snapshot of what ${username} is building on GitHub right now.`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "lnorton89 GitHub build log" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${username} — build log`,
    description: `A live snapshot of what ${username} is building on GitHub right now.`,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jetbrainsMono.variable} antialiased`}
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
