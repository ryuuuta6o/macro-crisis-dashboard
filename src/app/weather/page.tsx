import type { Metadata } from "next";
import { WeatherBriefDashboard } from "./weather-brief-dashboard";

export const metadata: Metadata = {
  title: "世界経済の現在地 | Macro Signal",
  description:
    "毎朝3分で、今日変わった3つ、市場が見落としやすいズレ、次の警戒線を確認できます。",
};

export default function WeatherPage() {
  return <WeatherBriefDashboard />;
}
