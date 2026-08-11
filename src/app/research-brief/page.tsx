import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "朝3分市場ブリーフ | 試験配信",
  description: "今日の変化、市場が見落としやすいズレ、次の警戒線を3分で確認する試験ブリーフ。",
};

const format = [
  { number: "01", title: "今日の天気", text: "世界経済の現在地を、晴れ・くもり・雨・嵐で短く確認します。", href: "/weather#today-weather" },
  { number: "02", title: "今日変わった3つ", text: "信号色・変化速度に加え、市場が見落としやすいズレを3件の中に含めます。", href: "/weather#today-changes" },
  { number: "03", title: "次に点灯する候補", text: "予測ではなく、次に確認する指標と警戒線までの距離を示します。", href: "/weather#next-trigger" },
  { number: "04", title: "数字と出典を確認する", text: "プロ版で現在値、観測日、閾値、取得元を確認できます。", href: "/weather#evidence-links" },
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
          <p className="text-xs font-bold tracking-[0.2em] text-cyan-300">20営業日の試験運用</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">朝3分で、市場のズレを見落とさない。</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
            公開データの一覧ではなく「何が変わった・なぜ重要・次に何を見る」を固定フォーマットで届ける実証運用です。速報競争ではなく、見出しになりにくい変化の発見を検証します。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="https://x.com/ryugukozou" target="_blank" rel="noreferrer" className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-slate-950">試験配信への参加をXで連絡</a>
            <a href="https://x.com/ryugukozou" target="_blank" rel="noreferrer" className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-6 py-3 text-center text-sm font-bold text-cyan-100">動画・記事向け資料を相談</a>
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-500">現在は需要検証期間です。自動売買、個別銘柄の推奨、価格予測は提供しません。</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {format.map((item) => (
            <Link key={item.number} href={item.href} className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 transition hover:border-cyan-300/20 hover:bg-white/[0.065]">
              <span className="font-mono text-xs text-cyan-300">{item.number}</span>
              <h2 className="mt-3 text-xl font-black">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{item.text}</p>
              <span className="mt-4 block text-xs font-bold text-cyan-200">該当箇所を見る →</span>
            </Link>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <article id="founding-reader" className="scroll-mt-8 rounded-3xl border border-white/10 bg-white/[0.045] p-6 sm:p-8">
            <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-300">個人向け</p>
            <h2 className="mt-2 text-2xl font-black">創設メンバープラン</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">現在の試験配信は無料です。20日間の検証後、継続価値が確認できた場合のみ月額980円の創設メンバー枠を案内します。</p>
            <ul className="mt-5 space-y-3 text-sm text-slate-400">
              <li><Link href="/weather#today-weather" className="hover:text-cyan-200">「今日の天気」を短く配信</Link></li>
              <li><Link href="/weather#today-changes" className="hover:text-cyan-200">「今日変わった3つ」を配信（市場のズレを含む）</Link></li>
              <li><Link href="/weather#next-trigger" className="hover:text-cyan-200">「次に点灯する候補」と警戒線を配信</Link></li>
              <li><Link href="/weather#evidence-links" className="hover:text-cyan-200">「数字と出典を確認する」リンクを添付</Link></li>
            </ul>
            <p className="mt-5 border-t border-white/[0.08] pt-4 text-xs leading-6 text-slate-500">「世界経済の現在地」は無料公開のままです。有料化を検討するのは、重要部分を毎朝選び、読みに行かなくても受け取れる配信サービスです。</p>
          </article>
          <article id="research-pack-pilot" className="scroll-mt-8 rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.055] p-6 sm:p-8">
            <p className="text-[10px] font-bold tracking-[0.18em] text-cyan-300">YouTube・記事・ニュースレター運営者向け</p>
            <h2 className="mt-2 text-2xl font-black">動画・記事制作者向けプラン</h2>
            <p className="mt-2 text-xs font-bold text-cyan-200">現在は試験提供中</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">金融情報を発信する人が、動画や記事を作るための調査時間を減らすプランです。重要な変化を選び、根拠付きの図と解説下書きをまとめて渡します。</p>
            <ul className="mt-5 space-y-3 text-sm text-slate-400">
              <li><strong className="text-slate-200">届くもの：</strong>出典・観測日・警戒線付きの図版</li>
              <li><strong className="text-slate-200">テーマ：</strong>今週の重要な変化と市場のズレ3件</li>
              <li><strong className="text-slate-200">制作補助：</strong>動画・記事に使える短い解説下書き</li>
              <li><strong className="text-slate-200">料金：</strong>試験導入は初月1万円、通常価格案は月額3万円</li>
            </ul>
          </article>
        </section>

        <section className="mt-6 rounded-3xl border border-amber-300/15 bg-amber-300/[0.04] p-6 text-sm leading-7 text-slate-400">
          <strong className="text-amber-100">検証の合格条件</strong>
          <p className="mt-2">20営業日継続できること、読者から返信・保存・クリックが発生すること、動画・記事制作者向けの試験導入または個人の予約購入が実際に成立すること。この条件を満たした機能だけを自動化します。</p>
        </section>
      </div>
    </main>
  );
}
