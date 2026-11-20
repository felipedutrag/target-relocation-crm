import type { Metadata } from "next";
import { getIndexMetadata, renderBlogIndexPage } from "@/components/blog/blog-route-helpers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = getIndexMetadata("pt");

export default async function BlogIndexPage() {
  return renderBlogIndexPage("pt");
}
