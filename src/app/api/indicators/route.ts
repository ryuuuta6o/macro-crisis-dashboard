import { getDashboardData } from "@/lib/fred";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return Response.json(await getDashboardData(), {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
