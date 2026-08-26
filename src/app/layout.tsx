import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "@fontsource-variable/plus-jakarta-sans";
import MotionProvider from "@/components/MotionProvider";
import { getSiteConfig } from "@/lib/site";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const username = process.env.GH_USERNAME || "octocat";
const { origin, canonicalPath, ogImageUrl } = getSiteConfig();

const description = `A build-log snapshot of what ${username} is building on GitHub — recent activity, repositories, and contribution history.`;

export const metadata: Metadata = {
  title: `${username} — build log`,
  description,
  metadataBase: new URL(origin),
  alternates: { canonical: canonicalPath },
  robots: { index: true, follow: true },
  openGraph: {
    title: `${username} — build log`,
    description,
    type: "website",
    images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${username} GitHub build log` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${username} — build log`,
    description,
    images: [ogImageUrl],
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
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
