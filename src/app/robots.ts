import type { MetadataRoute } from "next";

const SITE_URL = "https://target-relocation-crm-production.up.railway.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/en/", "/es/"],
        disallow: ["/crm", "/crm/", "/login", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
