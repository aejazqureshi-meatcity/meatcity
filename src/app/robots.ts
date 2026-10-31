import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/_next/static/',
          '/_next/image/',
          '/icon.svg',
          '/manifest.json',
          '/llms.txt',
          '/og-image.png',
        ],
        disallow: [
          '/admin',
          '/admin/',
          '/admin-dev',
          '/admin-dev/',
          '/delivery',
          '/delivery/',
          '/cart',
          '/cart/',
          '/profile',
          '/profile/',
          '/invoice',
          '/invoice/',
          '/pending',
          '/pending/',
          '/login',
          '/login/',
          '/register',
          '/register/',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://meatcity.in/sitemap.xml',
  };
}
