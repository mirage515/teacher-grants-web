"use client"

import { ReactNode, useMemo, useState } from "react"
import CountUp from "react-countup"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import DashboardTabs from "../ui/DashboardTabs"
import PanelCard from "../ui/PanelCard"
import {
  DEFAULT_TEACHER_FILTERS,
  filterTeacherRecords,
  getDepartmentTeacherCounts,
  getRankDistribution,
  getTeacherDepartments,
  getTeacherEmploymentTypes,
  getTeacherEstablishmentTypes,
  getTeacherRanks,
  getTeacherSummary,
} from "../../lib/teachers"
import { PaperRecord } from "../../types/paper"
import { ProjectRecord } from "../../types/projects"
import { PatentRecord, TransferRecord } from "../../types/research-assets"
import { TeacherFilters, TeacherRecord } from "../../types/teachers"

type Props = {
  records: TeacherRecord[]
  paperRecords: PaperRecord[]
  projectRecords: ProjectRecord[]
  patentRecords: PatentRecord[]
  transferRecords: TransferRecord[]
}

type TooltipPayload = {
  name?: string
  value?: number | string
  dataKey?: string
  payload?: {
    name?: string
    count?: number
    percentage?: number
  }
}

type TooltipProps = {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

type ResearchRiskItem = {
  teacher: TeacherRecord
  projectCount: number
  projectAmount: number
  paperCount: number
  patentCount: number
  transferCount: number
  missingProject: boolean
  missingOutcome: boolean
}

const COLORS = ["#4fd1c5", "#60a5fa", "#f59e0b", "#f472b6", "#34d399", "#a78bfa"]

type PieLabelProps = {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  name?: string
  percent?: number
}

function shortenLabel(value: string, limit = 10) {
  return value.length > limit ? `${value.slice(0, limit)}...` : value
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

function getTermLabel(records: TeacherRecord[]) {
  const first = records[0]
  if (!first) return "目前資料"

  return `${first.academicYear}學年度${first.semester}學期`
}

function isLecturerOrAbove(record: TeacherRecord) {
  return ["講師", "助理教授", "副教授", "教授"].includes(record.appointmentRank)
}

function parseDate(value: string) {
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : new Date(timestamp)
}

function getServiceYears(record: TeacherRecord) {
  const startDate = parseDate(record.firstArrivalDate) ?? parseDate(record.appointmentDate)
  if (!startDate) return 0

  const diff = Date.now() - startDate.getTime()

  return Math.max(0, diff / (365.25 * 24 * 60 * 60 * 1000))
}

function formatWan(value: number) {
  const wan = value / 10000
  return `${Number.isInteger(wan) ? wan.toLocaleString() : wan.toFixed(1)}萬元`
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(2,6,23,0.92)] px-4 py-3 text-sm text-slate-50 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
      <p className="font-medium text-white">{label ?? payload[0].name}</p>
      <div className="mt-2 space-y-1">
        {payload.map((item) => {
          const value = Number(item.value ?? 0)
          if (!value) return null

          return (
            <p key={`${item.name}-${item.dataKey}`} className="text-cyan-100">
              {value.toLocaleString()} 位
            </p>
          )
        })}
      </div>
    </div>
  )
}

function RankTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null

  const item = payload[0]
  const data = item.payload ?? {}
  const count = Number(data.count ?? item.value ?? 0)
  const percentage = Number(data.percentage ?? 0)

  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(2,6,23,0.92)] px-4 py-3 text-sm text-slate-50 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
      <p className="font-medium text-white">{data.name ?? item.name}</p>
      <p className="mt-1 text-cyan-100">
        {count.toLocaleString()}位 ({percentage.toFixed(2)}%)
      </p>
    </div>
  )
}

function RankPieLabel({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  name = "",
  percent = 0,
}: PieLabelProps) {
  if (percent < 0.06) return null

  const radius = innerRadius + (outerRadius - innerRadius) * 0.58
  const radians = (-midAngle * Math.PI) / 180
  const x = cx + radius * Math.cos(radians)
  const y = cy + radius * Math.sin(radians)

  return (
    <text
      x={x}
      y={y}
      fill="#f8fafc"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-sm font-semibold"
      style={{ textShadow: "0 2px 8px rgba(2,6,23,0.72)" }}
    >
      {name}
    </text>
  )
}

function SummaryCard({
  title,
  value,
  accent,
  suffix = "",
}: {
  title: string
  value: number
  accent: string
  suffix?: string
}) {
  return (
    <PanelCard className="border-white/10">
      <p className="mb-2 text-sm text-slate-200">{title}</p>
      <div className="flex items-end justify-between gap-3">
        <p className="text-3xl font-bold text-white">
          <CountUp key={`${title}-${value}`} end={value} decimals={value % 1 ? 1 : 0} duration={1.1} separator="," />
          {suffix}
        </p>
        <span className="h-3 w-10 rounded-full" style={{ backgroundColor: accent }} />
      </div>
    </PanelCard>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-100">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300 md:text-base"
      >
        <option value="" className="text-black">
          全部{label}
        </option>
        {options.map((option) => (
          <option key={option} value={option} className="text-black">
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

function RankMultiSelect({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const label =
    value.length === 0
      ? "全部職級"
      : value.length === 1
        ? value[0]
        : `已選 ${value.length} 類`

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-left text-sm text-white outline-none transition hover:bg-white/10 focus:border-fuchsia-300 md:text-base"
      >
        <span className="truncate">{label}</span>
        <span className={`text-slate-300 transition ${isOpen ? "rotate-180" : ""}`}>⌄</span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[70] rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-[0_24px_70px_rgba(2,8,23,0.45)] backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm text-slate-300">
              {value.length ? `已選 ${value.length} 類` : "未限定職級"}
            </span>
            {value.length ? (
              <button
                type="button"
                onClick={() => {
                  onChange([])
                  setIsOpen(false)
                }}
                className="text-sm text-cyan-100 transition hover:text-white"
              >
                清除
              </button>
            ) : null}
          </div>
          <div className="max-h-64 space-y-2 overflow-auto pr-1">
            {options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-start gap-2 rounded-xl px-2 py-1.5 text-base text-slate-100 transition hover:bg-white/8"
              >
                <input
                  type="checkbox"
                  checked={value.includes(option)}
                  onChange={() => onChange(toggleValue(value, option))}
                  className="mt-1 accent-cyan-300"
                />
                <span className="leading-6">{option}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            完成
          </button>
        </div>
      ) : null}
    </div>
  )
}

function HorizontalBarChart({
  title,
  data,
  selectedNames = [],
  action,
  onSelect,
}: {
  title: string
  data: Array<{ name: string; count: number }>
  selectedNames?: string[]
  action?: ReactNode
  onSelect?: (name: string) => void
}) {
  const chartHeight = Math.max(320, data.length * 42)

  return (
    <PanelCard className="min-w-0 border-white/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white md:text-xl">{title}</h2>
        <div className="flex items-center gap-2">
          {action}
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {data.length} 項
          </span>
        </div>
      </div>
      <div className="w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, left: 28, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
            <XAxis type="number" tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={132}
              interval={0}
              tick={{ fill: "#e2e8f0", fontSize: 13 }}
              tickFormatter={(value) => shortenLabel(String(value), 9)}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar
              dataKey="count"
              radius={[0, 14, 14, 0]}
              onClick={(item) => {
                const name = String(item.name ?? "")
                if (name) onSelect?.(name)
              }}
            >
              {data.map((item, index) => {
                const isSelected = selectedNames.includes(item.name)

                return (
                  <Cell
                    key={item.name}
                    cursor={onSelect ? "pointer" : "default"}
                    fill={COLORS[index % COLORS.length]}
                    opacity={selectedNames.length && !isSelected ? 0.42 : 1}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  )
}

function RankPieChart({
  data,
  selectedNames,
  action,
  onToggle,
}: {
  data: Array<{ name: string; count: number }>
  selectedNames: string[]
  action?: ReactNode
  onToggle: (name: string) => void
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  const chartData = data.map((item) => ({
    ...item,
    percentage: total > 0 ? (item.count / total) * 100 : 0,
  }))

  return (
    <PanelCard className="min-w-0 border-white/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white md:text-xl">職級分布</h2>
        <div className="flex items-center gap-2">
          {action}
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {total} 位
          </span>
        </div>
      </div>

      <div className="relative h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={142}
              innerRadius={0}
              label={<RankPieLabel />}
              labelLine={false}
              paddingAngle={1}
              stroke="rgba(15,23,42,0.86)"
              strokeWidth={2}
              onClick={(item) => onToggle(String(item.name ?? ""))}
            >
              {chartData.map((item, index) => {
                const isSelected = selectedNames.includes(item.name)

                return (
                  <Cell
                    key={item.name}
                    cursor="pointer"
                    fill={COLORS[index % COLORS.length]}
                    opacity={selectedNames.length && !isSelected ? 0.38 : 0.96}
                  />
                )
              })}
            </Pie>
            <Tooltip content={<RankTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  )
}

function TeacherList({ records }: { records: TeacherRecord[] }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <PanelCard className="border-white/10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white md:text-xl">教師清單</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {records.length} 位
          </span>
          <button
            type="button"
            onClick={() => setShowDetails((current) => !current)}
            className="rounded-2xl border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-300/15"
          >
            {showDetails ? "收合教師清單" : "顯示教師清單"}
          </button>
        </div>
      </div>

      {showDetails ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {records.slice(0, 120).map((record) => (
            <div key={record.id} className="rounded-[24px] border border-white/8 bg-white/5 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-medium text-cyan-100">
                  {record.appointmentRank || "未填職級"}
                </span>
                <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-200">
                  {record.employmentType || "未填專兼任"}
                </span>
                <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-200">
                  {record.establishmentType || "未填編制"}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-white">{record.name}</h3>
              <p className="mt-1 text-sm text-slate-300">{record.department}</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-200">
                <p>年齡：{record.age ? `${record.age} 歲` : "未填"}</p>
                <p>聘任日期：{record.appointmentDate || "未填"}</p>
                <p>最早到校日：{record.firstArrivalDate || "未填"}</p>
                <p>最高學歷：{record.highestDegree || "未填"}｜{record.highestSchool || "未填學校"}</p>
                <p>行政職：{record.adminRole || "無"}</p>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/20 p-3">
                <p className="mb-1 text-xs text-slate-400">學術專長及研究</p>
                <p className="line-clamp-3 text-sm leading-6 text-slate-100">
                  {record.specialty || "未填"}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
          需要檢視教師個別聘任、學歷與專長時，再展開教師清單。
        </div>
      )}
    </PanelCard>
  )
}

function ResearchRiskList({ items }: { items: ResearchRiskItem[] }) {
  const [showDetails, setShowDetails] = useState(false)
  const highRiskCount = items.filter((item) => item.missingProject && item.missingOutcome).length
  const mediumRiskCount = items.length - highRiskCount
  const riskStyles = {
    high: {
      card: "border-rose-200/35 border-l-4 border-l-rose-300 bg-rose-500/15 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.08)]",
      badge: "bg-rose-300/20 text-rose-50 ring-1 ring-rose-200/25",
    },
    medium: {
      card: "border-amber-200/35 border-l-4 border-l-amber-300 bg-amber-400/15 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.08)]",
      badge: "bg-amber-300/20 text-amber-50 ring-1 ring-amber-200/25",
    },
  }

  return (
    <PanelCard className="border-rose-200/20">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white md:text-xl">研究評鑑風險名單</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-rose-200/25 bg-rose-500/15 px-3 py-1 text-rose-50">
              高風險 {highRiskCount}
            </span>
            <span className="rounded-full border border-amber-200/25 bg-amber-400/15 px-3 py-1 text-amber-50">
              中風險 {mediumRiskCount}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-rose-200/20 bg-rose-300/10 px-3 py-1 text-xs text-rose-100">
            {items.length} 位
          </span>
          <button
            type="button"
            onClick={() => setShowDetails((current) => !current)}
            className="rounded-2xl border border-rose-300/35 bg-rose-300/10 px-3 py-2 text-xs text-rose-100 transition hover:bg-rose-300/15"
          >
            {showDetails ? "收合風險名單" : "顯示風險名單"}
          </button>
        </div>
      </div>

      {showDetails ? (
        items.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const isHighRisk = item.missingProject && item.missingOutcome
              const riskLabel =
                isHighRisk ? "高風險" : "中風險"
              const riskStyle = isHighRisk ? riskStyles.high : riskStyles.medium

              return (
                <div
                  key={item.teacher.id}
                  className={`rounded-[24px] border p-4 ${riskStyle.card}`}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${riskStyle.badge}`}>
                      {riskLabel}
                    </span>
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-200">
                      {item.teacher.appointmentRank}
                    </span>
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-200">
                      {item.teacher.department}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white">{item.teacher.name}</h3>
                  <div className="mt-3 grid gap-2 text-sm text-slate-200">
                    <p>
                      計畫件數：{item.projectCount} 件
                      {item.projectCount > 0 ? `(${formatWan(item.projectAmount)})` : ""}
                    </p>
                    <p>
                      研究成果：期刊論文 {item.paperCount} 篇；專利 {item.patentCount} 件；技術移轉 {item.transferCount} 件
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
            目前篩選條件下，沒有符合風險條件的專任講師以上教師。
          </div>
        )
      ) : (
        <div className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
          需要檢視缺少計畫案或研究成果的教師時，再展開風險名單。
        </div>
      )}
    </PanelCard>
  )
}

export default function FacultyStaffingDashboard({
  records,
  paperRecords,
  projectRecords,
  patentRecords,
  transferRecords,
}: Props) {
  const [filters, setFilters] = useState<TeacherFilters>(DEFAULT_TEACHER_FILTERS)
  const [selectedDepartment, setSelectedDepartment] = useState("")

  const filteredRecords = useMemo(() => filterTeacherRecords(records, filters), [records, filters])
  const scopedRecords = useMemo(
    () =>
      filteredRecords.filter(
        (record) => !selectedDepartment || record.department === selectedDepartment
      ),
    [filteredRecords, selectedDepartment]
  )

  const summary = useMemo(() => getTeacherSummary(scopedRecords), [scopedRecords])
  const departments = useMemo(() => getTeacherDepartments(records), [records])
  const employmentTypes = useMemo(() => getTeacherEmploymentTypes(records), [records])
  const establishmentTypes = useMemo(() => getTeacherEstablishmentTypes(records), [records])
  const ranks = useMemo(() => getTeacherRanks(records), [records])
  const termLabel = useMemo(() => getTermLabel(records), [records])

  const departmentCounts = useMemo(() => getDepartmentTeacherCounts(filteredRecords, 12), [filteredRecords])
  const rankChartBaseRecords = useMemo(
    () =>
      filterTeacherRecords(records, {
        ...filters,
        appointmentRanks: [],
      }),
    [records, filters]
  )
  const rankScopedRecords = useMemo(
    () =>
      rankChartBaseRecords.filter(
        (record) => !selectedDepartment || record.department === selectedDepartment
      ),
    [rankChartBaseRecords, selectedDepartment]
  )
  const rankDistribution = useMemo(() => getRankDistribution(rankScopedRecords), [rankScopedRecords])
  const researchRiskItems = useMemo(() => {
    const paperCounts = new Map<string, number>()
    const projectStats = new Map<string, { count: number; amount: number }>()
    const patentCounts = new Map<string, number>()
    const transferCounts = new Map<string, number>()

    paperRecords.forEach((paper) => {
      if (paper.appointmentType !== "專任") return
      paperCounts.set(paper.teacherName, (paperCounts.get(paper.teacherName) ?? 0) + 1)
    })

    projectRecords.forEach((project) => {
      const current = projectStats.get(project.teacherName) ?? { count: 0, amount: 0 }
      current.count += 1
      current.amount += project.totalAmount
      projectStats.set(project.teacherName, current)
    })

    patentRecords.forEach((patent) => {
      patentCounts.set(patent.teacherName, (patentCounts.get(patent.teacherName) ?? 0) + 1)
    })

    transferRecords.forEach((transfer) => {
      transferCounts.set(
        transfer.teacherName,
        (transferCounts.get(transfer.teacherName) ?? 0) + 1
      )
    })

    return scopedRecords
      .filter(
        (record) =>
          record.employmentType === "專任" &&
          isLecturerOrAbove(record) &&
          getServiceYears(record) >= 3 &&
          record.age < 62
      )
      .map((teacher) => {
        const project = projectStats.get(teacher.name) ?? { count: 0, amount: 0 }
        const paperCount = paperCounts.get(teacher.name) ?? 0
        const patentCount = patentCounts.get(teacher.name) ?? 0
        const transferCount = transferCounts.get(teacher.name) ?? 0

        return {
          teacher,
          projectCount: project.count,
          projectAmount: project.amount,
          paperCount,
          patentCount,
          transferCount,
          missingProject: project.count === 0,
          missingOutcome: paperCount + patentCount + transferCount === 0,
        }
      })
      .filter((item) => item.missingProject || item.missingOutcome)
      .sort((a, b) => {
        const aMissing = Number(a.missingProject) + Number(a.missingOutcome)
        const bMissing = Number(b.missingProject) + Number(b.missingOutcome)

        if (bMissing !== aMissing) return bMissing - aMissing
        return a.teacher.department.localeCompare(b.teacher.department, "zh-Hant")
      })
  }, [paperRecords, patentRecords, projectRecords, scopedRecords, transferRecords])

  function handleFilterChange<Key extends keyof TeacherFilters>(
    key: Key,
    value: TeacherFilters[Key]
  ) {
    setFilters((current) => ({ ...current, [key]: value }))
    setSelectedDepartment("")
  }

  function resetFilters() {
    setFilters(DEFAULT_TEACHER_FILTERS)
    setSelectedDepartment("")
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#12233f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_30%),radial-gradient(circle_at_70%_20%,rgba(96,165,250,0.12),transparent_28%),linear-gradient(135deg,#0b1d35_0%,#0f172a_54%,#1f1b2e_100%)]" />

      <section className="relative mx-auto flex w-full max-w-[1920px] flex-col gap-6 px-4 py-6 md:px-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-cyan-200/80 md:text-sm">
              Faculty Staffing Dashboard
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl xl:text-4xl">
              教師聘任儀錶板
            </h1>
          </div>
          <DashboardTabs />
        </header>

        <PanelCard className="z-50 overflow-visible border-white/10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-50">
              {termLabel}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_0.95fr_0.95fr_1fr_auto]">
            <FilterSelect
              label="系所"
              value={filters.department}
              options={departments}
              onChange={(value) => handleFilterChange("department", value)}
            />
            <FilterSelect
              label="專兼任"
              value={filters.employmentType}
              options={employmentTypes}
              onChange={(value) => handleFilterChange("employmentType", value)}
            />
            <FilterSelect
              label="編制"
              value={filters.establishmentType}
              options={establishmentTypes}
              onChange={(value) => handleFilterChange("establishmentType", value)}
            />
            <div>
              <label className="mb-2 block text-sm text-slate-100">職級</label>
              <RankMultiSelect
                options={ranks}
                value={filters.appointmentRanks}
                onChange={(value) => handleFilterChange("appointmentRanks", value)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full rounded-2xl border border-cyan-300/35 bg-cyan-300/10 px-4 py-3 text-base font-medium text-cyan-100 transition hover:bg-cyan-300/16 xl:min-w-[132px]"
              >
                重設篩選
              </button>
            </div>
          </div>
        </PanelCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard title="教師總數" value={summary.total} accent="#4fd1c5" />
          <SummaryCard title="專任教師" value={summary.fullTime} accent="#60a5fa" />
          <SummaryCard title="兼任教師" value={summary.partTime} accent="#f59e0b" />
          <SummaryCard title="編制內" value={summary.inEstablishment} accent="#34d399" />
          <SummaryCard title="平均年齡" value={summary.averageAge} accent="#a78bfa" suffix=" 歲" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <HorizontalBarChart
            title="系所教師數"
            data={departmentCounts}
            selectedNames={selectedDepartment ? [selectedDepartment] : []}
            onSelect={(name) => setSelectedDepartment((current) => (current === name ? "" : name))}
            action={
              selectedDepartment ? (
                <button
                  type="button"
                  onClick={() => setSelectedDepartment("")}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  清除選項
                </button>
              ) : null
            }
          />
          <RankPieChart
            data={rankDistribution}
            selectedNames={filters.appointmentRanks}
            onToggle={(name) => {
              if (name) {
                handleFilterChange("appointmentRanks", toggleValue(filters.appointmentRanks, name))
              }
            }}
            action={
              filters.appointmentRanks.length ? (
                <button
                  type="button"
                  onClick={() => handleFilterChange("appointmentRanks", [])}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  清除選項
                </button>
              ) : null
            }
          />
        </div>

        <TeacherList records={scopedRecords} />
        <ResearchRiskList items={researchRiskItems} />
      </section>
    </main>
  )
}
