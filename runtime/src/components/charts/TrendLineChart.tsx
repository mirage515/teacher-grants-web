"use client"

import { ReactNode, useMemo, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import PanelCard from "../ui/PanelCard"

type TrendRow = {
  year: string
  [key: string]: string | number
}

type TrendLineChartProps = {
  data: TrendRow[]
  mode: "subcategory" | "teacher"
  selectedSubcategory: string
  selectedSeriesKey?: string
  onSelectSeries?: (name: string) => void
  action?: ReactNode
  colorMap?: Record<string, string>
  seriesOrder?: string[]
}

type TooltipPayloadItem = {
  value?: number
  dataKey?: string
  name?: string
  color?: string
}

type CustomTooltipProps = {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  mode: "subcategory" | "teacher"
  lockedLegendKey?: string | null
}

const COLORS = [
  "#4fd1c5",
  "#f59e0b",
  "#60a5fa",
  "#f472b6",
  "#34d399",
  "#f97316",
  "#a78bfa",
  "#22d3ee",
  "#fb7185",
  "#38bdf8",
  "#c084fc",
  "#facc15",
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-TW").format(value)
}

function CustomTooltip({
  active,
  payload,
  label,
  mode,
  lockedLegendKey,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const current =
    (lockedLegendKey
      ? payload.find(
          (item) =>
            String(item.name || item.dataKey || "") === String(lockedLegendKey)
        )
      : undefined) ?? payload.find((item) => item.value != null)

  if (!current || current.value == null) return null

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 shadow-2xl">
      <div className="text-sm text-slate-300">年度 {label}</div>
      <div
        className="mt-1 text-sm font-medium"
        style={{ color: current.color || "#fff" }}
      >
        {mode === "teacher" ? "教師" : "次項目"} {String(current.name || current.dataKey || "")}
      </div>
      <div className="mt-1 text-base font-semibold text-white">
        NT$ {formatCurrency(Number(current.value))}
      </div>
    </div>
  )
}

export default function TrendLineChart({
  data,
  mode,
  selectedSubcategory,
  selectedSeriesKey = "",
  onSelectSeries,
  action,
  colorMap,
  seriesOrder = [],
}: TrendLineChartProps) {
  const [hoveredLegendKey, setHoveredLegendKey] = useState<string | null>(null)
  const [lockedLegendKey, setLockedLegendKey] = useState<string | null>(null)

  const activeLegendKey = selectedSeriesKey || lockedLegendKey || hoveredLegendKey

  const seriesKeys = useMemo(() => {
    const keys = Array.from(
      new Set(
        data.flatMap((row) => Object.keys(row).filter((key) => key !== "year"))
      )
    )

    if (seriesOrder.length === 0) return keys

    const orderMap = new Map(seriesOrder.map((key, index) => [key, index]))
    return keys.sort((a, b) => {
      const aOrder = orderMap.get(a) ?? Number.MAX_SAFE_INTEGER
      const bOrder = orderMap.get(b) ?? Number.MAX_SAFE_INTEGER

      if (aOrder !== bOrder) return aOrder - bOrder
      return a.localeCompare(b, "zh-Hant")
    })
  }, [data, seriesOrder])

  const title =
    mode === "teacher"
      ? `${selectedSubcategory || "教師"}三年趨勢`
      : "次項目三年趨勢"

  return (
    <PanelCard className="min-w-0 border-fuchsia-300/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white md:text-xl">{title}</h2>
        <div className="flex items-center gap-2">
          {action}
          {lockedLegendKey && (
            <button
              type="button"
              onClick={() => {
                setLockedLegendKey(null)
                setHoveredLegendKey(null)
              }}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10"
            >
              取消鎖定
            </button>
          )}
        </div>
      </div>

      <div className="min-w-0 h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 18, right: 18, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
            <XAxis
              dataKey="year"
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(value) => `${Math.round(Number(value) / 10000)}萬`}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              content={
                <CustomTooltip mode={mode} lockedLegendKey={lockedLegendKey} />
              }
            />

            {seriesKeys.map((key, index) => {
              const isActive = !activeLegendKey || activeLegendKey === key
              const isHidden = !!lockedLegendKey && lockedLegendKey !== key
              const color = colorMap?.[key] ?? COLORS[index % COLORS.length]

              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stroke={color}
                  strokeWidth={activeLegendKey === key ? 3.5 : 2.25}
                  strokeOpacity={isActive ? 1 : 0.16}
                  hide={isHidden}
                  dot={{ r: activeLegendKey === key ? 4 : 3, opacity: isActive ? 1 : 0.16 }}
                  activeDot={{ r: 6 }}
                  animationDuration={1100}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
        {seriesKeys.map((key, index) => {
          const isActive = !activeLegendKey || activeLegendKey === key
          const color = colorMap?.[key] ?? COLORS[index % COLORS.length]

          return (
            <button
              key={key}
              type="button"
              className="flex items-center gap-2 rounded-2xl border border-white/6 bg-white/[0.04] px-3 py-2 text-left transition hover:bg-white/[0.08]"
              onMouseEnter={() => {
                if (!lockedLegendKey) setHoveredLegendKey(key)
              }}
              onMouseLeave={() => {
                if (!lockedLegendKey) setHoveredLegendKey(null)
              }}
              onClick={() => {
                if (onSelectSeries) {
                  setLockedLegendKey(null)
                  onSelectSeries(key)
                } else {
                  setLockedLegendKey((prev) => (prev === key ? null : key))
                }
                setHoveredLegendKey(null)
              }}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: color,
                  opacity: isActive ? 1 : 0.3,
                }}
              />
              <span
                className="truncate text-sm"
                style={{
                  color: isActive ? "#e2e8f0" : "rgba(226,232,240,0.38)",
                  fontWeight: activeLegendKey === key ? 700 : 500,
                }}
              >
                {key}
              </span>
            </button>
          )
        })}
      </div>
    </PanelCard>
  )
}
