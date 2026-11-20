import type { Metadata } from "next";
import { getIndexMetadata, renderBlogIndexPage } from "@/components/blog/blog-route-helpers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = getIndexMetadata("es");

export default async function EsBlogIndexPage() {
  return renderBlogIndexPage("es");
}
