import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeWrapper from "@/components/ThemeWrapper";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  themeColor: "#D4AF37",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://meatcity.in"),
  title: {
    default: "MeatCity | Fresh Chicken, Mutton & Eggs in Navi Mumbai",
    template: "%s | MeatCity",
  },
  description:
    "Shop fresh chicken, mutton and eggs from MeatCity in Navi Mumbai. Browse available products and order online with express or scheduled delivery options.",
  applicationName: "MeatCity",
  authors: [{ name: "MeatCity", url: "https://meatcity.in" }],
  creator: "MeatCity",
  publisher: "MeatCity",
  keywords: [
    "fresh chicken navi mumbai",
    "fresh mutton turbhe",
    "buy eggs online navi mumbai",
    "halal meat delivery navi mumbai",
    "fresh meat shop near me",
    "meatcity turbhe",
    "meatcity navi mumbai",
  ],
  alternates: {
    canonical: "https://meatcity.in",
  },
  openGraph: {
    title: "MeatCity | Fresh Chicken, Mutton & Eggs in Navi Mumbai",
    description:
      "Shop fresh chicken, mutton and eggs from MeatCity in Navi Mumbai. Browse available products and order online with express or scheduled delivery options.",
    url: "https://meatcity.in",
    siteName: "MeatCity",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1920,
        height: 1280,
        alt: "MeatCity - Fresh Chicken, Mutton & Eggs in Navi Mumbai",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MeatCity | Fresh Chicken, Mutton & Eggs in Navi Mumbai",
    description:
      "Shop fresh chicken, mutton and eggs from MeatCity in Navi Mumbai. Browse available products and order online with express or scheduled delivery options.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
};

const homeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://meatcity.in/#website",
      "url": "https://meatcity.in",
      "name": "MeatCity",
      "description":
        "Fresh chicken, mutton and eggs retail and home delivery in Turbhe and Navi Mumbai.",
      "publisher": {
        "@id": "https://meatcity.in/#localbusiness",
      },
      "inLanguage": "en-IN",
    },
    {
      "@type": "LocalBusiness",
      "@id": "https://meatcity.in/#localbusiness",
      "name": "MeatCity",
      "image": "https://meatcity.in/og-image.png",
      "logo": "https://meatcity.in/icon.svg",
      "url": "https://meatcity.in",
      "telephone": "+91-7977630912",
      "priceRange": "₹₹",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "A/2 Room No.126, Shop No.2, Sector 20, Turbhe",
        "addressLocality": "Navi Mumbai",
        "addressRegion": "Maharashtra",
        "postalCode": "400705",
        "addressCountry": "IN",
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 19.0688,
        "longitude": 73.0189,
      },
      "areaServed": [
        {
          "@type": "AdministrativeArea",
          "name": "Turbhe, Navi Mumbai",
        },
        {
          "@type": "AdministrativeArea",
          "name": "Navi Mumbai, Maharashtra",
        },
      ],
      "currenciesAccepted": "INR",
      "paymentAccepted": "Cash, UPI, Credit Card, Debit Card",
      "slogan": "Meat that matters",
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "MeatCity Fresh Meat & Egg Catalog",
        "itemListElement": [
          {
            "@type": "OfferCatalog",
            "name": "Fresh Chicken Cuts",
          },
          {
            "@type": "OfferCatalog",
            "name": "Fresh Mutton Cuts",
          },
          {
            "@type": "OfferCatalog",
            "name": "Fresh Farm Eggs",
          },
          {
            "@type": "OfferCatalog",
            "name": "Fresh Seafood & Fish",
          },
          {
            "@type": "OfferCatalog",
            "name": "Ready To Cook Marinades",
          },
        ],
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MeatCity" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData) }}
        />
      </head>
      <body className="bg-[#F8F9FA] min-h-screen">
        <ThemeWrapper>{children}</ThemeWrapper>
      </body>
    </html>
  );
}
