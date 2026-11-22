import { TargetLandingPage } from "@/components/landing/target-landing-page";
import { getLatestLandingPosts } from "@/lib/blog-queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const latestBlogPosts = await getLatestLandingPosts(3);
  return <TargetLandingPage latestBlogPosts={latestBlogPosts} />;
}
