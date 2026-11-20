import { AppEntry } from "@/components/app-entry";
import { getLatestLandingPosts } from "@/lib/blog-queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const latestBlogPosts = await getLatestLandingPosts(3);
  return <AppEntry initialMode="landing" latestBlogPosts={latestBlogPosts} />;
}
