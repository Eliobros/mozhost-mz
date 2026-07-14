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

/**
 * Metadata raiz do MozHost.
 *
 * Melhorias SEO aplicadas nesta versão:
 *  - `metadataBase` para que og:url e canonical resolvam sempre para mozhost.shop
 *  - `title.default` + `title.template` para que sub-pages possam herdar
 *    título formatado (%s | MozHost) sem ficar todas iguais à home
 *  - `alternates.canonical` substituindo o antigo CanonicalUrl client component
 *  - `openGraph.locale = 'pt_MZ'` para reforçar busca local em Moçambique
 *  - `formatDetection`, `applicationName`, e bloco twitter completo
 *
 * Os schemas JSON-LD de FAQ e OfferCatalog foram MOVIDOS para as páginas
 * correspondentes (/docs/faq e /docs/precos) para não criar sinais de
 * keyword-stuffing ao Google. O LocalBusiness fica aqui pois descreve a empresa.
 *
 * IMPORTANTE sobre assets:
 * O único ficheiro de imagem efetivamente em /public/ é /mozhost.png.
 * Referenciamos apenas este em icons/openGraph/twitter para evitar 404s.
 * Quando criares os assets dedicados (mozhost-og.png 1200x630, mozhost-180.png,
 * mozhost-192.png, mozhost-512.png) basta atualizar este ficheiro.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://mozhost.shop"),
  title: {
    default: "MozHost - Hospedagem de Bots e APIs em Moçambique",
    template: "%s | MozHost",
  },
  description:
    "MozHost é a primeira plataforma moçambicana especializada em hospedagem de Bots (WhatsApp, Telegram, Discord) e APIs. Paga com M-Pesa, e-Mola ou MercadoPago.",
  keywords: [
    "hospedagem de bots",
    "hospedagem Moçambique",
    "moçambique",
    "whatsapp bot",
    "telegram bot",
    "discord bot",
    "apis",
    "node js",
    "python",
    "php mysql",
    "docker",
    "cloud hosting",
    "M-Pesa",
    "e-Mola",
    "MercadoPago",
    "eliobros tech",
  ],
  authors: [{ name: "Eliobros Tech", url: "https://eliobrostech.com" }],
  creator: "Eliobros Tech",
  publisher: "Eliobros Tech",
  applicationName: "MozHost",
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  alternates: {
    canonical: "/",
    languages: {
      "pt-MZ": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_MZ",
    url: "/",
    siteName: "MozHost",
    title: "MozHost - Hospedagem de Bots e APIs em Moçambique",
    description:
      "Hospede seus bots WhatsApp, Telegram e APIs na plataforma moçambicana mais simples. Paga com M-Pesa ou e-Mola.",
    images: ["/mozhost.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "MozHost - Hospedagem de Bots e APIs em Moçambique",
    description:
      "Hospede seus bots WhatsApp, Telegram e APIs na plataforma moçambicana mais simples.",
    images: ["/mozhost.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [{ url: "/mozhost.png", sizes: "any", type: "image/png" }],
    apple: "/mozhost.png",
    shortcut: "/mozhost.png",
  },
  manifest: "/manifest.json",
  verification: {
    google: "9Z-qwaWlaNaIYeLBjeovB7hQYEW8eguNYFNi2CFjubg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-MZ">
      <head>
        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Favicon + Theme color */}
        <link rel="icon" href="/mozhost.png" />
        <link rel="apple-touch-icon" href="/mozhost.png" />
        <meta name="theme-color" content="#3B82F6" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />

        {/* LocalBusiness - reforça SEO regional MZ (organização + endereço local).
            Schema único e centralizado para evitar keyword-stuffing ao Google. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "@id": "https://mozhost.shop#organization",
              name: "MozHost",
              alternateName: "Eliobros Tech - MozHost",
              url: "https://mozhost.shop",
              logo: "https://mozhost.shop/mozhost.png",
              image: "https://mozhost.shop/mozhost.png",
              description:
                "Plataforma moçambicana de hospedagem de bots (WhatsApp, Telegram, Discord) e APIs com isolamento Docker e pagamento local via M-Pesa/e-Mola.",
              telephone: "+258-86-284-0075",
              email: "mozhost@topaziocoin.online",
              priceRange: "MT$",
              address: {
                "@type": "PostalAddress",
                addressCountry: "MZ",
                addressLocality: "Maputo",
              },
              areaServed: [
                { "@type": "Country", name: "Moçambique" },
                { "@type": "Continent", name: "África" },
              ],
              availableLanguage: ["Portuguese", "pt-MZ"],
              sameAs: ["https://eliobrostech.com"],
              openingHoursSpecification: {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ],
                opens: "00:00",
                closes: "23:59",
              },
            }),
          }}
        />

	<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1077950338507301"
     crossOrigin="anonymous"></script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
