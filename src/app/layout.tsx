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
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lnorton89.github.io";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const canonicalPath = basePath
  ? `${basePath.startsWith("/") ? basePath : `/${basePath}`}/`
  : "/";

const description = `A build-log snapshot of what ${username} is building on GitHub — recent activity, repositories, and contribution history.`;

export const metadata: Metadata = {
  title: `${username} — build log`,
  description,
  metadataBase: new URL(siteUrl),
  alternates: { canonical: canonicalPath },
  robots: { index: true, follow: true },
  openGraph: {
    title: `${username} — build log`,
    description,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: `${username} GitHub build log` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${username} — build log`,
    description,
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
