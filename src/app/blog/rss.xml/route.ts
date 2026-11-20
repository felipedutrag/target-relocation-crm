import { getPublishedBlogIndex } from "@/lib/blog-queries";

export const dynamic = "force-dynamic";

import { SITE_URL } from "@/lib/site-url";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = (await getPublishedBlogIndex("pt")).slice(0, 30);

  const itemsXml = posts
    .map((p) => {
      const link = `${SITE_URL}${p.canonical_path || `/${p.slug}`}`;
      const pubDate = new Date(p.published_at || p.updated_at || Date.now()).toUTCString();
      return `<item>
  <title>${escapeXml(p.title)}</title>
  <link>${escapeXml(link)}</link>
  <guid isPermaLink="true">${escapeXml(link)}</guid>
  <pubDate>${pubDate}</pubDate>
  <category>${escapeXml(p.category)}</category>
  <description>${escapeXml(p.direct_answer)}</description>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Target Relocation — Blog Técnico de Imigração Corporativa e Global Mobility</title>
    <link>${SITE_URL}/blog</link>
    <description>Guias técnicos e artigos regulatórios para RH e Global Mobility no Brasil e Américas.</description>
    <language>pt-BR</language>
    ${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
