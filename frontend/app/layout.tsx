import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MozHost - Hospedagem de Bots",
  description: "MozHost - Plataforma moçambicana de hospedagem de Bots",
  icons: {
    icon: "https://mozhost.vercel.app/mozhost.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const title = String(metadata.title ?? "");
  const description = String(metadata.description ?? "");

  return (
    <html lang="pt-BR">
      <head>
        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://mozhost.vercel.app/mozhost.png" />
        <meta property="og:url" content="https://mozhost.topazioverse.com.br" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
	<meta name="google-site-verification" content="9Z-qwaWlaNaIYeLBjeovB7hQYEW8eguNYFNi2CFjubg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://mozhost.vercel.app/mozhost.png" />
      </head>

      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
