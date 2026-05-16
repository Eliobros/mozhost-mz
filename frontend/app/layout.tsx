import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CanonicalUrl from "@/components/CanonicalUrl";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MozHost - Hospedagem de Bots e APIs",
  description:
    "MozHost é uma plataforma moçambicana especializada em hospedagem de Bots e APIs, desenvolvida pela empresa Eliobros Tech.",
  keywords: [
    "hospedagem de bots",
    "moçambique",
    "apis",
    "whatsapp bot",
    "cloud hosting",
    "eliobros tech",
  ],
  // ← REMOVIDO alternates canonical fixo
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/mozhost.png",
    apple: "/mozhost.png",
  },
  manifest: '/manifest.json'
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const title = String(metadata.title ?? "");
  const description = String(metadata.description ?? "");

  return (
    <html lang="pt">
      <head>
        {/* Canonical dinâmico ← NOVO */}
        <CanonicalUrl />

        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://mozhost.shop/mozhost.png" />
        <meta property="og:url" content="https://mozhost.shop" />
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://mozhost.shop/mozhost.png" />

        {/* Google Verification */}
        <meta
          name="google-site-verification"
          content="9Z-qwaWlaNaIYeLBjeovB7hQYEW8eguNYFNi2CFjubg"
        />

        {/* Favicon */}
        <link rel="icon" href="/mozhost.png" />
        <link rel="apple-touch-icon" href="/mozhost.png" />

        {/* Theme Color */}
        <meta name="theme-color" content="#3B82F6" />

        {/* SCHEMA 1 - WebHostingService */}
        <script type="application/ld+json">{`
{
  "@context": "https://schema.org",
  "@type": "WebHostingService",
  "name": "MozHost",
  "url": "https://mozhost.shop",
  "image": "https://mozhost.shop/mozhost.png",
  "logo": "https://mozhost.shop/mozhost.png",
  "description": "MozHost é uma plataforma moçambicana especializada em hospedagem de Bots e APIs, desenvolvida pela empresa Eliobros Tech.",
  "serviceType": ["Hospedagem de Bots", "Hospedagem de APIs", "Serviços Cloud"],
  "provider": {
    "@type": "Organization",
    "name": "Eliobros Tech",
    "url": "https://eliobrostech.com",
    "logo": "https://mozhost.shop/mozhost.png",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "MZ"
    }
  },
  "areaServed": ["Moçambique", "África"],
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "MZN",
    "lowPrice": "120",
    "highPrice": "890",
    "offerCount": "4"
  }
}
        `}</script>

        {/* SCHEMA 2 - Planos */}
        <script type="application/ld+json">{`
{
  "@context": "https://schema.org",
  "@type": "OfferCatalog",
  "name": "Planos de Hospedagem MozHost",
  "url": "https://mozhost.shop",
  "itemListElement": [
    {
      "@type": "Offer",
      "name": "Plano Starter",
      "price": "120",
      "priceCurrency": "MZN",
      "description": "Hospedagem básica para Bots.",
      "availability": "https://schema.org/InStock"
    },
    {
      "@type": "Offer",
      "name": "Plano Pro",
      "price": "290",
      "priceCurrency": "MZN",
      "description": "Hospedagem avançada para Bots e APIs.",
      "availability": "https://schema.org/InStock"
    },
    {
      "@type": "Offer",
      "name": "Plano Gold",
      "price": "550",
      "priceCurrency": "MZN",
      "description": "Alta performance para Bots 24/7.",
      "availability": "https://schema.org/InStock"
    },
    {
      "@type": "Offer",
      "name": "Plano Cloud Premium",
      "price": "890",
      "priceCurrency": "MZN",
      "description": "Hospedagem de alto desempenho em nuvem.",
      "availability": "https://schema.org/InStock"
    }
  ]
}
        `}</script>

        {/* SCHEMA 3 - FAQ */}
        <script type="application/ld+json">{`
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "O que é a MozHost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A MozHost é uma plataforma moçambicana especializada em hospedagem de Bots e APIs desenvolvida pela Eliobros Tech."
      }
    },
    {
      "@type": "Question",
      "name": "Quais serviços a MozHost oferece?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A MozHost oferece hospedagem de Bots, hospedagem de APIs, monitoramento 24/7 e suporte rápido."
      }
    },
    {
      "@type": "Question",
      "name": "Posso hospedar meu Bot do WhatsApp na MozHost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sim. A MozHost suporta hospedagem de Bots do WhatsApp, Telegram e outras plataformas."
      }
    },
    {
      "@type": "Question",
      "name": "A MozHost funciona 24 horas?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sim. A MozHost fornece uptime estável e suporte contínuo para Bots e APIs."
      }
    }
  ]
}
        `}</script>

        {/* SCHEMA 4 - Organização */}
        <script type="application/ld+json">{`
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Eliobros Tech",
  "url": "https://eliobrostech.com",
  "logo": "https://mozhost.shop/mozhost.png",
  "description": "Empresa moçambicana de tecnologia especializada em desenvolvimento de softwares, hospedagem e soluções inovadoras.",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "MZ"
  }
}
        `}</script>
      </head>

      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
