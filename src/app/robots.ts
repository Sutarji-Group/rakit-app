import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Rakitan klien, area internal, dan endpoint API tidak boleh ter-index.
        // Ini sekaligus lapisan pertama proteksi scraping katalog (risiko R1).
        disallow: ['/rakit/', '/admin/', '/portal/', '/akun/', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
