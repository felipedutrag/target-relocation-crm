import type { MetadataRoute } from "next";
import { getPublishedBlogIndex } from "@/lib/blog-queries";

export const dynamic = "force-dynamic";

import { SITE_URL } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedBlogIndex("pt");
  const now = new Date();

  const baseEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: {
          "pt-BR": `${SITE_URL}/blog`,
          "en-US": `${SITE_URL}/en/blog`,
          "es-MX": `${SITE_URL}/es/blog`,
        },
      },
    },
    {
      url: `${SITE_URL}/en/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/es/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
  ];

  const articleEntries: MetadataRoute.Sitemap = [];
  for (const p of posts) {
    const ptUrl = `${SITE_URL}${p.canonical_path || `/${p.slug}`}`;
    const enUrl = p.en_slug ? `${SITE_URL}/en/${p.en_slug}` : `${SITE_URL}/en/${p.slug}`;
    const esUrl = p.es_slug ? `${SITE_URL}/es/${p.es_slug}` : `${SITE_URL}/es/${p.slug}`;
    const lastMod = p.updated_at ? new Date(p.updated_at) : now;
    const languages = { "pt-BR": ptUrl, "en-US": enUrl, "es-MX": esUrl };

    articleEntries.push({
      url: ptUrl,
      lastModified: lastMod,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages },
    });

    if (p.en_slug) {
      articleEntries.push({
        url: enUrl,
        lastModified: lastMod,
        changeFrequency: "weekly",
        priority: 0.75,
        alternates: { languages },
      });
    }

    if (p.es_slug) {
      articleEntries.push({
        url: esUrl,
        lastModified: lastMod,
        changeFrequency: "weekly",
        priority: 0.75,
        alternates: { languages },
      });
    }
  }

  return [...baseEntries, ...articleEntries];
}
