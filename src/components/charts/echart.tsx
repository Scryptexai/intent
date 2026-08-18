"use client";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

/**
 * ECharts dimuat client-only via dynamic import → bundle halaman awal ringan;
 * skeleton tampil selama chunk chart diunduh.
 */
const EChartInner = dynamic(() => import("./echart-inner"), {
  ssr: false,
  loading: () => (
    <div className="w-full animate-pulse rounded-md bg-white/5" style={{ height: 260 }} aria-hidden />
  ),
});

export function EChart({ option, height = 260, className }: { option: EChartsOption; height?: number; className?: string }) {
  return (
    <div style={{ height }} className={className}>
      <EChartInner option={option} height={height} />
    </div>
  );
}
