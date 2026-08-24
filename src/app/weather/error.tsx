"use client";

export default function WeatherError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#020713] px-4 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-rose-300/20 bg-white/[0.05] p-7">
        <p className="text-[10px] font-bold tracking-[0.2em] text-rose-300">
          DATA FETCH ERROR
        </p>
        <h1 className="mt-3 text-2xl font-black">市場データを取得できませんでした</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          「取得中」のままにはせず、取得失敗を明示しています。少し時間をおいて再試行してください。
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 min-h-11 rounded-xl border border-white/10 bg-white/[0.06] px-5 text-sm font-bold hover:bg-white/[0.1]"
        >
          もう一度読み込む
        </button>
      </section>
    </main>
  );
}
