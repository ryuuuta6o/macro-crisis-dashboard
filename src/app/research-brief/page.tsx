import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Macro Signal Research Brief | 試験配信",
  description: "今日の変化、市場が見落としやすいズレ、次の警戒線を3分で確認する試験ブリーフ。",
};

const format = [
  { number: "01", title: "今日変わった3つ", text: "高いまま動かない指標ではなく、信号色・変化速度・複数市場への波及を優先します。" },
  { number: "02", title: "市場が見ていないズレ", text: "株価と信用、VIXと国債、公開市場とPrivate Creditの温度差を一つだけ言語化します。" },
  { number: "03", title: "次に点灯する線", text: "予測ではなく、どの公表値・閾値を次に確認するかを出典付きで示します。" },
] as const;

export default function ResearchBriefPage() {
  return (
    <main className="min-h-screen bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.12),transparent_34%),radial-gradient(circle_at_82%_16%,rgba(59,130,246,0.09),transparent_30%)]" />
      <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <Link href="/" className="text-sm font-black tracking-[0.08em]">MACRO SIGNAL</Link>
          <Link href="/weather" className="text-xs text-cyan-200">世界経済の現在地へ</Link>
        </nav>

        <header className="py-14 sm:py-20">
          <p className="text-xs font-bold tracking-[0.2em] text-cyan-300">20-BUSINESS-DAY PILOT</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">朝3分で、市場のズレを見落とさない。</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
            公開データの一覧ではなく「何が変わった・なぜ重要・次に何を見る」を固定フォーマットで届ける実証運用です。速報競争ではなく、見出しになりにくい変化の発見を検証します。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="https://x.com/ryugukozou" target="_blank" rel="noreferrer" className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-slate-950">試験配信への参加をXで連絡</a>
            <a href="https://x.com/ryugukozou" target="_blank" rel="noreferrer" className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-6 py-3 text-center text-sm font-bold text-cyan-100">B2B試験導入を相談</a>
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-500">現在は需要検証期間です。自動売買、個別銘柄の推奨、価格予測は提供しません。</p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {format.map((item) => (
            <article key={item.number} className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
              <span className="font-mono text-xs text-cyan-300">{item.number}</span>
              <h2 className="mt-3 text-xl font-black">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 sm:p-8">
            <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-300">FOR INDIVIDUALS</p>
            <h2 className="mt-2 text-2xl font-black">Founding Reader</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">20日間の試験配信後、継続価値が確認できた場合のみ月額980円の創設メンバー枠を案内します。</p>
            <ul className="mt-5 space-y-3 text-sm text-slate-400">
              <li>今日の有意な変化3件</li><li>市場の温度差・見落とし1件</li><li>次の公表値と警戒線</li><li>根拠データと観測日のリンク</li>
            </ul>
          </article>
          <article className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.055] p-6 sm:p-8">
            <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-300">FOR MEDIA / CREATORS</p>
            <h2 className="mt-2 text-2xl font-black">Research Pack Pilot</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">金融系動画、ニュースレター、投資コミュニティ向け。初月1万円で、図版・出典・解説の実務価値を検証します。</p>
            <ul className="mt-5 space-y-3 text-sm text-slate-400">
              <li>出典・観測日・閾値付き指標カード</li><li>週次の市場のズレ3テーマ</li><li>動画・記事向けの短い解説原稿</li><li>通常価格案：月額3万円</li>
            </ul>
          </article>
        </section>

        <section className="mt-6 rounded-3xl border border-amber-300/15 bg-amber-300/[0.04] p-6 text-sm leading-7 text-slate-400">
          <strong className="text-amber-100">検証の合格条件</strong>
          <p className="mt-2">20営業日継続できること、読者から返信・保存・クリックが発生すること、B2B試験導入または個人の予約購入が実際に成立すること。この条件を満たした機能だけを自動化します。</p>
        </section>
      </div>
    </main>
  );
}
