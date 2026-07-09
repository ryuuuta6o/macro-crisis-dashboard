import { getDashboardData } from "@/lib/fred";

export const revalidate = 900;

export async function GET() {
  return Response.json(await getDashboardData(), {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=900",
    },
  });
}
