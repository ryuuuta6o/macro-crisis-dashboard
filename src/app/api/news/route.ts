import { getMarketImpactNewsFeed } from "@/lib/news";

export const revalidate = 300;

export async function GET() {
  const feed = await getMarketImpactNewsFeed();

  return Response.json(feed.items, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      "X-News-Mode": feed.mode,
      "X-News-Fetched-At": feed.fetchedAt,
      "X-News-Latest-Published-At": feed.latestPublishedAt ?? "unknown",
    },
  });
}
