"use client"

import { ReactNode } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import PanelCard from "../ui/PanelCard"

type ChartItem = {
  name: string
  amount: number
  percentage?: number
}

type Props = {
  data: ChartItem[]
  mode?: "subcategory" | "teacher"
  selectedSubcategory?: string
  selectedName?: string
  onSelect?: (name: string) => void
  action?: ReactNode
  colorMap?: Record<string, string>
}

export const SUBCATEGORY_CHART_COLORS = [
  "#4fd1c5",
  "#f59e0b",
  "#60a5fa",
  "#f472b6",
  "#34d399",
  "#f97316",
  "#2dd4bf",
  "#818cf8",
  "#fb7185",
  "#38bdf8",
]

export default function SubcategoryBarChart({
  data,
  mode = "subcategory",
  selectedSubcategory = "",
  selectedName = "",
  onSelect,
  action,
  colorMap,
}: Props) {
  const chartHeight =
    mode === "teacher"
      ? Math.max(440, data.length * 46)
      : Math.max(440, data.length * 40)

  const title =
    mode === "teacher" && selectedSubcategory
      ? `${selectedSubcategory}教師排序`
      : "次項目金額排序"

  return (
    <PanelCard className="min-w-0 border-emerald-300/10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white md:text-xl">{title}</h2>
        <div className="flex items-center gap-2">
          {action}
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {data.length} 筆
          </span>
        </div>
      </div>

      <div className="min-w-0 w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 12, left: 6, bottom: 10 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
            <XAxis
              type="number"
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
              tickFormatter={(value) => Number(value).toLocaleString()}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              interval={0}
              tick={{ fill: "#e2e8f0", fontSize: 13 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null

                const item = payload[0]?.payload as ChartItem

                return (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 shadow-2xl">
                    <p className="text-sm text-slate-300">{item.name}</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      NT$ {item.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-emerald-300">
                      佔比 {Number(item.percentage ?? 0).toFixed(2)}%
                    </p>
                  </div>
                )
              }}
            />
            <Bar
              dataKey="amount"
              radius={[0, 12, 12, 0]}
              animationDuration={1000}
              barSize={28}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${entry.name}-${index}`}
                  fill={
                    colorMap?.[entry.name] ??
                    SUBCATEGORY_CHART_COLORS[
                      index % SUBCATEGORY_CHART_COLORS.length
                    ]
                  }
                  opacity={selectedName && selectedName !== entry.name ? 0.36 : 1}
                  cursor={onSelect ? "pointer" : "default"}
                  onClick={() => onSelect?.(entry.name)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  )
}
