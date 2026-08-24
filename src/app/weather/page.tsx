import type { Metadata } from "next";
import { getContagionWatchData } from "@/lib/contagion-watch";
import { getDashboardData } from "@/lib/fred";
import { getMarketImpactNewsFeed } from "@/lib/news";
import { WeatherBriefDashboard } from "./weather-brief-dashboard";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "世界経済の現在地 | Macro Signal",
  description:
    "毎朝3分で、今日変わった3つ、市場が見落としやすいズレ、次の警戒線を確認できます。",
};

export default async function WeatherPage() {
  const [dashboard, newsFeed, contagion] = await Promise.all([
    getDashboardData(),
    getMarketImpactNewsFeed(),
    getContagionWatchData(),
  ]);

  return (
    <WeatherBriefDashboard
      dashboard={dashboard}
      news={newsFeed.items}
      contagion={contagion}
    />
  );
}
