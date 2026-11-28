// nivo chart wrappers. Every chart sits on a white panel with grey grid lines
// and the same three brand colours, so mixed charts still look like one system.
import type { ReactNode } from "react";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";

const CHART_COLORS = ["#005098", "#289030", "#101D29", "#64748B", "#94A3B8"];

const axis = {
  tickColor: "#E2E8F0",
  tickTextColor: "#64748B",
  legendColor: "#64748B",
};

export interface SeriesPoint {
  x: string;
  y: number;
}

export interface Series {
  id: string;
  data: SeriesPoint[];
}

interface ChartFrameProps {
  height?: number;
  empty?: boolean;
}

function Frame({ height = 280, empty, children }: ChartFrameProps & { children: ReactNode }) {
  if (empty) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-500">
        No data in this period yet.
      </div>
    );
  }
  return (
    <div style={{ height }} className="w-full">
      {children}
    </div>
  );
}

const commonProps = {
  margin: { top: 12, right: 20, bottom: 46, left: 64 },
  enableGridX: false,
  animate: false,
};

// Multi-series line chart (trends, cumulative totals).
export function TrendChart({
  series,
  formatValue = (v: number) => String(v),
  height = 300,
  yLegend,
}: {
  series: Series[];
  formatValue?: (v: number) => string;
  height?: number;
  yLegend?: string;
}) {
  const empty = series.every((s) => s.data.length === 0);
  return (
    <Frame height={height} empty={empty}>
      <ResponsiveLine
        data={series}
        colors={CHART_COLORS.slice(0, series.length)}
        {...commonProps}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", stacked: false, min: "auto" }}
        curve="monotoneX"
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: 0,
          format: (v) => {
            const s = String(v);
            return s.length > 7 ? s.slice(5) : s;
          },
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          format: formatValue,
          legend: yLegend,
          legendPosition: "middle",
          legendOffset: -52,
        }}
        pointSize={0}
        enableTouchCrosshair
        useMesh
        legends={[
          {
            anchor: "top-right",
            direction: "row",
            itemWidth: 110,
            itemHeight: 18,
            symbolShape: "circle",
            itemTextColor: "#475569",
            translateX: 4,
            translateY: -8,
          },
        ]}
        theme={{
          axis: {
            domain: { line: { stroke: "#E2E8F0" } },
            ticks: { ...axis, text: { fontSize: 11, fill: "#64748B" } },
            legend: { text: { fontSize: 11, fill: "#64748B" } },
          },
          tooltip: {
            container: {
              background: "#FFFFFF",
              color: "#101D29",
              fontSize: 12,
              border: "1px solid #E2E8F0",
              borderRadius: 6,
              boxShadow: "0 4px 14px rgba(16,29,41,.12)",
            },
          },
        }}
      />
    </Frame>
  );
}

// Single-series bars (bookings per day, payments per day, top debtors).
export function BarsChart({
  data,
  formatValue = (v: number) => String(v),
  height = 260,
  color = "#005098",
  yLegend,
}: {
  data: { label: string; value: number }[];
  formatValue?: (v: number) => string;
  height?: number;
  color?: string;
  yLegend?: string;
}) {
  const empty = data.length === 0 || data.every((d) => !d.value);
  return (
    <Frame height={height} empty={empty}>
      <ResponsiveBar
        data={data}
        keys={["value"]}
        indexBy="label"
        margin={{ top: 12, right: 16, bottom: 46, left: 64 }}
        padding={0.25}
        colors={color}
        animate={false}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: data.length > 12 ? -45 : 0,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          format: formatValue,
          legend: yLegend,
          legendPosition: "middle",
          legendOffset: -52,
        }}
        enableLabel={false}
        theme={{
          axis: {
            domain: { line: { stroke: "#E2E8F0" } },
            ticks: { text: { fontSize: 11, fill: "#64748B" } },
            legend: { text: { fontSize: 11, fill: "#64748B" } },
          },
          tooltip: {
            container: {
              background: "#FFFFFF",
              color: "#101D29",
              fontSize: 12,
              border: "1px solid #E2E8F0",
              borderRadius: 6,
            },
          },
        }}
        tooltip={({ value, indexValue }) => (
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow">
            <span className="text-slate-500">{indexValue}</span>
            <div className="font-semibold text-brand-navy">{formatValue(Number(value))}</div>
          </div>
        )}
      />
    </Frame>
  );
}

// Donut for shares (collections by method, ageing split).
export function DonutChart({
  data,
  formatValue = (v: number) => String(v),
  height = 260,
}: {
  data: { id: string; value: number }[];
  formatValue?: (v: number) => string;
  height?: number;
}) {
  const empty = data.length === 0 || data.every((d) => !d.value);
  return (
    <Frame height={height} empty={empty}>
      <ResponsivePie
        data={data}
        colors={CHART_COLORS}
        margin={{ top: 10, right: 110, bottom: 10, left: 110 }}
        innerRadius={0.62}
        padAngle={1.5}
        activeOuterRadiusOffset={6}
        animate={false}
        enableArcLinkLabels
        arcLinkLabelsTextColor="#475569"
        arcLinkLabelsThickness={1}
        legends={[
          {
            anchor: "right",
            direction: "column",
            justify: false,
            translateX: 90,
            itemWidth: 90,
            itemHeight: 18,
            itemsSpacing: 6,
            symbolShape: "circle",
          },
        ]}
        tooltip={({ datum }) => (
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow">
            <span className="text-slate-500">{String(datum.id)}</span>
            <div className="font-semibold text-brand-navy">
              {formatValue(Number(datum.value))}
            </div>
          </div>
        )}
      />
    </Frame>
  );
}
