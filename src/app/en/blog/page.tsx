import type { Metadata } from "next";
import { getIndexMetadata, renderBlogIndexPage } from "@/components/blog/blog-route-helpers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = getIndexMetadata("en");

export default async function EnBlogIndexPage() {
  return renderBlogIndexPage("en");
}
