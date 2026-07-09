import type { Metadata } from "next";
import { WeatherDashboard } from "./weather-dashboard";

export const metadata: Metadata = {
  title: "世界経済天気予報 | Macro Signal",
  description:
    "新NISA勢のための世界経済天気予報。株価より先に見るべき危険信号を、毎朝1分でチェック。",
};

export default function WeatherPage() {
  return <WeatherDashboard />;
}
