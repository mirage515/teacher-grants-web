"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import PanelCard from "../ui/PanelCard"

type ChartItem = {
  name: string
  amount: number
}

type Props = {
  data: ChartItem[]
}

const COLORS = [
  "#4fd1c5",
  "#f59e0b",
  "#60a5fa",
  "#f472b6",
  "#34d399",
  "#f97316",
  "#818cf8",
  "#fb7185",
]

export default function CategoryDonutChart({ data }: Props) {
  return (
    <PanelCard className="min-w-0 border-white/10">
      <h2 className="mb-5 text-lg font-semibold text-white md:text-xl">
        項目金額分布
      </h2>

      <div className="min-w-0 h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="45%"
              innerRadius={76}
              outerRadius={126}
              paddingAngle={3}
              animationDuration={900}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${entry.name}-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`NT$ ${Number(value ?? 0).toLocaleString()}`, "金額"]}
              contentStyle={{
                backgroundColor: "rgba(2, 6, 23, 0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "18px",
                color: "#ffffff",
                fontSize: "14px",
              }}
              labelStyle={{ color: "#ffffff", fontSize: "14px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid gap-2">
        {data.map((item, index) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.04] px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="inline-block h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="truncate text-sm font-medium text-slate-100">
                {item.name}
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-200">
              NT$ {item.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </PanelCard>
  )
}
