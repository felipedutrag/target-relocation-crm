import type { Metadata } from "next";
import { buildArticleMetadata, renderArticlePage } from "@/components/blog/blog-route-helpers";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return buildArticleMetadata(slug, "es");
}

export default async function EsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return renderArticlePage(slug, "es");
}
