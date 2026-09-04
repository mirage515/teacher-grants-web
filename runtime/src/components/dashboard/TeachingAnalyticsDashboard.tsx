"use client"

import {
  ReactNode,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react"
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
  Treemap,
  XAxis,
  YAxis,
} from "recharts"
import DashboardTabs from "../ui/DashboardTabs"
import PanelCard from "../ui/PanelCard"
import {
  DEFAULT_TEACHING_FILTERS,
  filterTeachingBySelection,
  filterTeachingRecords,
  getCategory1PointShare,
  getCategory2PointShare,
  getCategory3PointShare,
  getTeachingApplicationRows,
  getTeachingCategory1,
  getTeachingCategory2,
  getTeachingCategory3,
  getTeachingCollaborations,
  getTeachingDepartments,
  getTeachingSummary,
  getTeachingTeachers,
  getTeachingYears,
  getTopDepartmentsByPoints,
} from "../../lib/teaching"
import { maskPersonName, maskPersonNames } from "../../lib/privacy"
import {
  TeachingFilters,
  TeachingHierarchySelection,
  TeachingRecord,
} from "../../types/teaching"

type Props = {
  records: TeachingRecord[]
}

type TeacherSearchItem = {
  name: string
}

type SummaryCardProps = {
  title: string
  value: number
  accent: string
  displayValue?: string
}

type TooltipPayload = {
  color?: string
  name?: string
  value?: number | string
  payload?: {
    name?: string
    points?: number
    amount?: number
    percentage?: number
    count?: number
  }
}

type ChartTooltipProps = {
  active?: boolean
  payload?: TooltipPayload[]
}

const CHART_COLORS = [
  "#4fd1c5",
  "#60a5fa",
  "#f59e0b",
  "#f472b6",
  "#34d399",
  "#818cf8",
  "#fb7185",
  "#22d3ee",
  "#f97316",
  "#a78bfa",
]

function shortenLabel(value: string, limit = 10) {
  return value.length > limit ? `${value.slice(0, limit)}...` : value
}

function extractCategoryCode(value: string) {
  const match = value.match(/^[A-D][0-9]+(?:-[0-9]+)?/)
  return match?.[0] ?? shortenLabel(value, 8)
}

function formatAmount(value: number) {
  return `${value.toLocaleString()}元`
}

function formatPercentage(value: number) {
  return `(${value.toFixed(2)}%)`
}

function maskCollaborationLabel(value: string) {
  return value
    .split(/\s+(?:\?|×|x)\s+/i)
    .map((name) => maskPersonName(name))
    .join(" × ")
}

function SummaryCard({ title, value, accent, displayValue }: SummaryCardProps) {
  return (
    <PanelCard className="border-white/10">
      <p className="mb-2 text-sm text-slate-200">{title}</p>
      <div className="flex items-end justify-between gap-3">
        <p className="whitespace-nowrap text-2xl font-bold text-white md:text-3xl">
          {displayValue ?? (
            <CountUp
              key={`${title}-${value}`}
              end={value}
              duration={1.1}
              separator="," 
              decimals={Number.isInteger(value) ? 0 : 1}
            />
          )}
        </p>
        <span className="h-3 w-10 rounded-full" style={{ backgroundColor: accent }} />
      </div>
    </PanelCard>
  )
}

function SimpleTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  const item = payload[0]
  const points = Number(item.payload?.points ?? item.value ?? 0)
  const amount = Number(item.payload?.amount ?? 0)
  const percentage = Number(item.payload?.percentage ?? 0)

  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(2,6,23,0.92)] px-4 py-3 text-sm text-slate-50 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
      <p className="font-medium text-white">{item.payload?.name ?? item.name}</p>
      <p className="mt-1 text-cyan-200">{points.toLocaleString()} 點</p>
      {amount > 0 ? <p className="text-slate-300">NT$ {amount.toLocaleString()}</p> : null}
      {percentage > 0 ? <p className="text-slate-300">{percentage.toFixed(1)}%</p> : null}
    </div>
  )
}

function CollaborationTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  const item = payload[0]
  const count = Number(item.payload?.count ?? item.value ?? 0)
  const points = Number(item.payload?.points ?? 0)

  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(2,6,23,0.92)] px-4 py-3 text-sm text-slate-50 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
      <p className="font-medium text-white">{item.payload?.name ?? item.name}</p>
      <p className="mt-1 text-emerald-300">{count} 件共同申請</p>
      <p className="text-slate-300">{points.toLocaleString()} 點</p>
    </div>
  )
}

function DistributionBarChart({
  title,
  data,
  accent,
  onSelect,
  selectedName,
  action,
  useCodeLabel = true,
}: {
  title: string
  data: Array<{ name: string; points: number; amount?: number; percentage?: number }>
  accent: string
  onSelect?: (name: string) => void
  selectedName?: string
  action?: ReactNode
  useCodeLabel?: boolean
}) {
  const chartHeight = Math.max(320, data.length * 44)

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

      <div className="min-w-0 w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 12, left: 8, bottom: 10 }}>
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
              width={180}
              interval={0}
              tick={{ fill: "#e2e8f0", fontSize: 12 }}
              tickFormatter={(value) =>
                useCodeLabel ? extractCategoryCode(String(value)) : shortenLabel(String(value), 12)
              }
              axisLine={false}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.08)" }} content={<SimpleTooltip />} />
            <Bar
              dataKey="points"
              radius={[0, 12, 12, 0]}
              barSize={26}
              animationDuration={900}
              onClick={(entry) => onSelect?.(String(entry.name))}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`${entry.name}-${index}`}
                  fill={selectedName === entry.name ? "#f8fafc" : accent}
                  opacity={selectedName && selectedName !== entry.name ? 0.45 : 1}
                  cursor={onSelect ? "pointer" : "default"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  )
}

function TreemapTile(props: {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  index?: number
  onSelect?: (name: string) => void
  selectedName?: string
}) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    name = "",
    index = 0,
    onSelect,
    selectedName,
  } = props

  if (width < 52 || height < 40) return null

  return (
    <g onClick={() => onSelect?.(name)} style={{ cursor: onSelect ? "pointer" : "default" }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={12}
        ry={12}
        fill={CHART_COLORS[index % CHART_COLORS.length]}
        fillOpacity={selectedName && selectedName !== name ? 0.45 : 0.92}
        stroke="rgba(255,255,255,0.14)"
      />
      <foreignObject
        x={x + 8}
        y={y + 6}
        width={width - 16}
        height={height - 12}
        style={{ pointerEvents: "none" }}
      >
        <div className="flex h-full items-start">
          <span className="text-sm font-semibold text-white">{extractCategoryCode(name)}</span>
        </div>
      </foreignObject>
    </g>
  )
}

function CategoryTreemap({
  title,
  data,
  onSelect,
  selectedName,
  action,
}: {
  title: string
  data: Array<{ name: string; points: number; percentage?: number }>
  onSelect?: (name: string) => void
  selectedName?: string
  action?: ReactNode
}) {
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

      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data.map((item) => ({ ...item, value: item.points }))}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="rgba(255,255,255,0.12)"
            content={<TreemapTile onSelect={onSelect} selectedName={selectedName} />}
          >
            <Tooltip content={<SimpleTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  )
}

export default function TeachingAnalyticsDashboard({ records }: Props) {
  const [filters, setFilters] = useState<TeachingFilters>(DEFAULT_TEACHING_FILTERS)
  const [teacherKeyword, setTeacherKeyword] = useState("")
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false)
  const [selection, setSelection] = useState<TeachingHierarchySelection>({
    category1: "",
    category2: "",
    category3: "",
  })
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [showDetails, setShowDetails] = useState(false)
  const [showTeacherAmountDistribution, setShowTeacherAmountDistribution] = useState(false)
  const teacherBoxRef = useRef<HTMLDivElement | null>(null)

  const teacherSearch = useDeferredValue(teacherKeyword)
  const onPointerDownOutside = useEffectEvent((event: MouseEvent) => {
    if (
      teacherBoxRef.current &&
      !teacherBoxRef.current.contains(event.target as Node)
    ) {
      setTeacherDropdownOpen(false)
    }
  })

  useEffect(() => {
    document.addEventListener("mousedown", onPointerDownOutside)
    return () => document.removeEventListener("mousedown", onPointerDownOutside)
  }, [])

  const years = useMemo(() => getTeachingYears(records), [records])

  const departmentSourceRecords = useMemo(
    () =>
      records.filter(
        (record) => !filters.year || record.year === filters.year
      ),
    [records, filters.year]
  )

  const departments = useMemo(
    () => getTeachingDepartments(departmentSourceRecords),
    [departmentSourceRecords]
  )

  const teacherSourceRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          (!filters.year || record.year === filters.year) &&
          (!filters.department || record.department === filters.department) &&
          (!filters.category1 || record.category1 === filters.category1) &&
          (!filters.category2 || record.category2 === filters.category2) &&
          (!filters.category3 || record.category3 === filters.category3)
      ),
    [
      records,
      filters.year,
      filters.department,
      filters.category1,
      filters.category2,
      filters.category3,
    ]
  )

  const teachers = useMemo<TeacherSearchItem[]>(
    () => getTeachingTeachers(teacherSourceRecords).map((name) => ({ name })),
    [teacherSourceRecords]
  )
  const teacherOptions = useMemo(() => {
    const keyword = teacherSearch.trim()
    if (!keyword) return teachers

    return teachers.filter((teacher) => teacher.name.includes(keyword))
  }, [teachers, teacherSearch])
  const category1Options = useMemo(
    () => getTeachingCategory1(departmentSourceRecords),
    [departmentSourceRecords]
  )

  const effectiveFilters = useMemo(() => {
    const nextDepartment = departments.includes(filters.department)
      ? filters.department
      : ""
    const optionSourceRecords = records.filter(
      (record) =>
        (!filters.year || record.year === filters.year) &&
        (!nextDepartment || record.department === nextDepartment)
    )
    const nextCategory1 = category1Options.includes(filters.category1) ? filters.category1 : ""
    const nextCategory2Options = getTeachingCategory2(optionSourceRecords, nextCategory1)
    const nextCategory2 = nextCategory2Options.includes(filters.category2) ? filters.category2 : ""
    const nextCategory3Options = getTeachingCategory3(
      optionSourceRecords,
      nextCategory1,
      nextCategory2
    )
    const nextCategory3 = nextCategory3Options.includes(filters.category3) ? filters.category3 : ""
    const teacherNames = teachers.map((teacher) => teacher.name)
    const nextTeacher = teacherNames.includes(filters.teacherName) ? filters.teacherName : ""

    return {
      year: filters.year,
      department: nextDepartment,
      teacherName: nextTeacher,
      category1: nextCategory1,
      category2: nextCategory2,
      category3: nextCategory3,
    } satisfies TeachingFilters
  }, [filters, records, departments, category1Options, teachers])

  const filteredRecords = useMemo(
    () => filterTeachingRecords(records, effectiveFilters),
    [records, effectiveFilters]
  )

  const category2Options = useMemo(
    () => getTeachingCategory2(filteredRecords, effectiveFilters.category1),
    [filteredRecords, effectiveFilters.category1]
  )

  const category1Share = useMemo(() => getCategory1PointShare(filteredRecords), [filteredRecords])

  const effectiveSelection = useMemo(() => {
    const nextCategory1 =
      selection.category1 && filteredRecords.some((record) => record.category1 === selection.category1)
        ? selection.category1
        : ""

    const nextCategory2 =
      selection.category2 &&
      filteredRecords.some(
        (record) =>
          (!nextCategory1 || record.category1 === nextCategory1) &&
          record.category2 === selection.category2
      )
        ? selection.category2
        : ""

    const nextCategory3 =
      selection.category3 &&
      filteredRecords.some(
        (record) =>
          (!nextCategory1 || record.category1 === nextCategory1) &&
          (!nextCategory2 || record.category2 === nextCategory2) &&
          record.category3 === selection.category3
      )
        ? selection.category3
        : ""

    return {
      category1: nextCategory1,
      category2: nextCategory2,
      category3: nextCategory3,
    }
  }, [filteredRecords, selection])

  const category2Share = useMemo(
    () => getCategory2PointShare(filteredRecords, effectiveSelection.category1),
    [filteredRecords, effectiveSelection.category1]
  )

  const category3Share = useMemo(
    () =>
      getCategory3PointShare(
        filteredRecords,
        effectiveSelection.category1,
        effectiveSelection.category2
      ),
    [filteredRecords, effectiveSelection.category1, effectiveSelection.category2]
  )

  const category3Display = useMemo(
    () => (effectiveSelection.category2 ? category3Share : category3Share.slice(0, 10)),
    [category3Share, effectiveSelection.category2]
  )

  const scopedRecords = useMemo(
    () => filterTeachingBySelection(filteredRecords, effectiveSelection),
    [filteredRecords, effectiveSelection]
  )

  const summary = useMemo(() => getTeachingSummary(scopedRecords), [scopedRecords])

  const effectiveDepartmentSelection = useMemo(
    () =>
      selectedDepartment &&
      scopedRecords.some((record) => record.department === selectedDepartment)
        ? selectedDepartment
        : "",
    [scopedRecords, selectedDepartment]
  )

  const departmentDistribution = useMemo(
    () =>
      getTopDepartmentsByPoints(scopedRecords, 999).map((item) => ({
        name: item.name,
        points: item.points,
        amount: item.amount,
      })),
    [scopedRecords]
  )

  const detailScopedRecords = useMemo(
    () =>
      effectiveDepartmentSelection
        ? scopedRecords.filter(
            (record) => record.department === effectiveDepartmentSelection
          )
        : scopedRecords,
    [effectiveDepartmentSelection, scopedRecords]
  )

  const collaborationScopedRecords = useMemo(() => {
    const baseFilters = {
      ...effectiveFilters,
      teacherName: "",
    }

    const teacherAgnosticRecords = filterTeachingRecords(records, baseFilters)
    const teacherAgnosticScopedRecords = filterTeachingBySelection(
      teacherAgnosticRecords,
      effectiveSelection
    )

    return effectiveDepartmentSelection
      ? teacherAgnosticScopedRecords.filter(
          (record) => record.department === effectiveDepartmentSelection
        )
      : teacherAgnosticScopedRecords
  }, [
    effectiveDepartmentSelection,
    effectiveFilters,
    effectiveSelection,
    records,
  ])

  const collaborations = useMemo(
    () =>
      getTeachingCollaborations(
        collaborationScopedRecords,
        12,
        effectiveFilters.teacherName || undefined
      ).map((item) => ({
        name: maskCollaborationLabel(item.pair),
        count: item.count,
        points: item.points,
      })),
    [collaborationScopedRecords, effectiveFilters.teacherName]
  )

  const detailApplicationIds = useMemo(
    () => new Set(detailScopedRecords.map((record) => `${record.year}::${record.applicationId}`)),
    [detailScopedRecords]
  )

  const detailDisplayRecords = useMemo(
    () =>
      collaborationScopedRecords.filter((record) =>
        detailApplicationIds.has(`${record.year}::${record.applicationId}`)
      ),
    [collaborationScopedRecords, detailApplicationIds]
  )

  const detailRows = useMemo(
    () => getTeachingApplicationRows(detailDisplayRecords).slice(0, 12),
    [detailDisplayRecords]
  )

  const teacherAmountDistribution = useMemo(() => {
    const totals = new Map<string, number>()
    const totalAmount = detailScopedRecords.reduce(
      (sum, record) => sum + record.amount,
      0
    )

    detailScopedRecords.forEach((record) => {
      totals.set(
        record.teacherName,
        (totals.get(record.teacherName) ?? 0) + record.amount
      )
    })

    return Array.from(totals.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [detailScopedRecords])

  function handleFilterChange(key: keyof TeachingFilters, value: string) {
    setFilters((current) => {
      const next = { ...current, [key]: value }
      if (key === "category1") {
        next.category2 = ""
        next.category3 = ""
      }
      if (key === "category2") {
        next.category3 = ""
      }

      const validTeachers = getTeachingTeachers(
        records.filter(
          (record) =>
            (!next.year || record.year === next.year) &&
            (!next.department || record.department === next.department) &&
            (!next.category1 || record.category1 === next.category1) &&
            (!next.category2 || record.category2 === next.category2) &&
            (!next.category3 || record.category3 === next.category3)
        )
      )

      if (next.teacherName && !validTeachers.includes(next.teacherName)) {
        next.teacherName = ""
        setTeacherKeyword("")
      }

      if (key === "teacherName") {
        setTeacherKeyword(value)
      }

      if (key !== "teacherName" && !next.teacherName) {
        setTeacherKeyword("")
      }

      return next
    })
  }

  function handleTeacherSelect(name: string) {
    handleFilterChange("teacherName", name)
    setTeacherKeyword("")
    setTeacherDropdownOpen(false)
  }

  function resetFilters() {
    setFilters(DEFAULT_TEACHING_FILTERS)
    setTeacherKeyword("")
    setTeacherDropdownOpen(false)
    setSelection({ category1: "", category2: "", category3: "" })
    setSelectedDepartment("")
    setShowDetails(false)
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#12233f] text-white">
      <div className="relative mx-auto flex w-full max-w-[1920px] flex-col gap-6 px-4 py-6 md:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.12),transparent_28%)] blur-3xl" />

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-cyan-200/80 md:text-sm">
              Teaching Analytic Dashboard
            </p>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl xl:text-4xl">
              教學精進儀錶板
            </h1>
          </div>

          <DashboardTabs />
        </div>

        <div className="space-y-4">
          <PanelCard className="relative z-30 overflow-visible border-white/10">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-sm text-slate-100">年度</label>
                <select
                  value={effectiveFilters.year}
                  onChange={(event) =>
                    handleFilterChange("year", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-300 md:text-base"
                >
                  <option value="" className="text-black">
                    全部年度
                  </option>
                  {years.map((year) => (
                    <option key={year} value={year} className="text-black">
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-100">系所</label>
                <select
                  value={effectiveFilters.department}
                  onChange={(event) => handleFilterChange("department", event.target.value)}
                  className="w-full rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300 md:text-base"
                >
                  <option value="" className="text-black">全部系所</option>
                  {departments.map((department) => (
                    <option key={department} value={department} className="text-black">
                      {department}
                    </option>
                  ))}
                </select>
              </div>

              <div ref={teacherBoxRef} className="relative z-40">
                <label className="mb-2 block text-sm text-slate-100">教師</label>

                <button
                  type="button"
                  onClick={() => setTeacherDropdownOpen((current) => !current)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-left text-sm text-white outline-none transition hover:border-emerald-300 focus:border-emerald-300 md:text-base"
                >
                  <span
                    className={
                      effectiveFilters.teacherName ? "text-white" : "text-slate-300"
                    }
                  >
                    {effectiveFilters.teacherName
                      ? maskPersonName(effectiveFilters.teacherName)
                      : "全部教師"}
                  </span>
                  <svg
                    className={`h-5 w-5 text-white transition-transform ${
                      teacherDropdownOpen ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {teacherDropdownOpen ? (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-400/20 bg-[#18304f] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                    <div className="border-b border-slate-400/20 p-2">
                      <input
                        type="text"
                        value={teacherKeyword}
                        onChange={(event) => {
                          setTeacherKeyword(event.target.value)
                          if (filters.teacherName) {
                            handleFilterChange("teacherName", "")
                          }
                        }}
                        placeholder="輸入教師姓名搜尋"
                        className="w-full rounded-xl border border-slate-400/20 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-300/70 focus:border-emerald-300 md:text-base"
                      />
                    </div>

                    <div className="max-h-64 overflow-y-auto p-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleFilterChange("teacherName", "")
                          setTeacherKeyword("")
                          setTeacherDropdownOpen(false)
                        }}
                        className="w-full rounded-xl px-3 py-3 text-left text-sm text-slate-100 transition hover:bg-white/10 md:text-base"
                      >
                        全部教師
                      </button>

                      {teacherOptions.length > 0 ? (
                        teacherOptions.map((teacher) => (
                          <button
                            key={teacher.name}
                            type="button"
                            onClick={() => handleTeacherSelect(teacher.name)}
                            className="w-full rounded-xl px-3 py-3 text-left text-sm text-slate-100 transition hover:bg-white/10 md:text-base"
                          >
                            {maskPersonName(teacher.name)}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-slate-300">
                          找不到符合條件的教師
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-100">獎勵主類</label>
                <select
                  value={effectiveFilters.category1}
                  onChange={(event) => handleFilterChange("category1", event.target.value)}
                  className="w-full rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-300 md:text-base"
                >
                  <option value="" className="text-black">全部獎勵主類</option>
                  {category1Options.map((item) => (
                    <option key={item} value={item} className="text-black">
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-100">獎勵次類</label>
                <select
                  value={effectiveFilters.category2}
                  onChange={(event) => handleFilterChange("category2", event.target.value)}
                  className="w-full rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 md:text-base"
                >
                  <option value="" className="text-black">全部獎勵次類</option>
                  {category2Options.map((item) => (
                    <option key={item} value={item} className="text-black">
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-2xl border border-cyan-300/45 bg-cyan-300/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/15 md:w-auto md:px-6"
                >
                  重設篩選
                </button>
              </div>
            </div>
          </PanelCard>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard title="總點數" value={summary.totalPoints} accent="#4fd1c5" />
            <SummaryCard
              title="總金額"
              value={summary.totalAmount}
              accent="#60a5fa"
              displayValue={`NT$ ${summary.totalAmount.toLocaleString()}`}
            />
            <SummaryCard title="申請件數" value={summary.applicationCount} accent="#f59e0b" />
            <SummaryCard title="共同申請件數" value={summary.collaborativeApplicationCount} accent="#f472b6" />
            <SummaryCard title="申請教師數" value={summary.teacherCount} accent="#34d399" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <PanelCard className="border-white/10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white md:text-xl">主類點數占比</h2>
                {effectiveSelection.category1 ? (
                  <button
                    type="button"
                    onClick={() => setSelection({ category1: "", category2: "", category3: "" })}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                  >
                    清除選項
                  </button>
                ) : null}
              </div>

              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={category1Share}
                      dataKey="points"
                      nameKey="name"
                      innerRadius={68}
                      outerRadius={118}
                      paddingAngle={2}
                      onClick={(entry) =>
                        setSelection({
                          category1: String(entry.name),
                          category2: "",
                          category3: "",
                        })
                      }
                    >
                      {category1Share.map((entry, index) => (
                        <Cell
                          key={`${entry.name}-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          opacity={
                            effectiveSelection.category1 && effectiveSelection.category1 !== entry.name
                              ? 0.45
                              : 1
                          }
                          cursor="pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<SimpleTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-2">
                {category1Share.map((item, index) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() =>
                      setSelection({
                        category1: item.name,
                        category2: "",
                        category3: "",
                      })
                    }
                    className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-left transition hover:bg-white/8"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="text-sm text-slate-100">{item.name}</span>
                    </div>
                    <span className="text-sm text-cyan-100">{item.percentage.toFixed(1)}%</span>
                  </button>
                ))}
              </div>
            </PanelCard>

            <CategoryTreemap
              title="次類點數分布"
              data={category2Share}
              action={
                effectiveSelection.category2 ? (
                  <button
                    type="button"
                    onClick={() => setSelection((current) => ({ ...current, category2: "", category3: "" }))}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                  >
                    清除選項
                  </button>
                ) : null
              }
              onSelect={(name) => {
                const matchedCategory1 = Array.from(
                  new Set(
                    filteredRecords
                      .filter((record) => record.category2 === name)
                      .map((record) => record.category1)
                  )
                )

                setSelection((current) => ({
                  category1:
                    current.category1 || (matchedCategory1.length === 1 ? matchedCategory1[0] : ""),
                  category2: name,
                  category3: "",
                }))
              }}
              selectedName={effectiveSelection.category2}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DistributionBarChart
              title="細項點數分布"
              data={category3Display}
              accent="#60a5fa"
              action={
                effectiveSelection.category3 ? (
                  <button
                    type="button"
                    onClick={() => setSelection((current) => ({ ...current, category3: "" }))}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                  >
                    清除選項
                  </button>
                ) : null
              }
              onSelect={(name) =>
                setSelection((current) => ({
                  category1: current.category1,
                  category2: current.category2,
                  category3: name,
                }))
              }
              selectedName={effectiveSelection.category3}
            />

            <DistributionBarChart
              title="系所點數分布"
              data={departmentDistribution}
              accent="#f59e0b"
              action={
                effectiveDepartmentSelection ? (
                  <button
                    type="button"
                    onClick={() => setSelectedDepartment("")}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                  >
                    清除選項
                  </button>
                ) : null
              }
              onSelect={setSelectedDepartment}
              selectedName={effectiveDepartmentSelection}
              useCodeLabel={false}
            />
          </div>

          {effectiveFilters.teacherName ? (
            <PanelCard className="border-white/10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white md:text-xl">共同申請合作關係</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  {collaborations.length} 組
                </span>
              </div>

              {collaborations.length ? (
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={collaborations} layout="vertical" margin={{ top: 10, right: 8, left: 8, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                      <XAxis type="number" tick={{ fill: "#cbd5e1", fontSize: 12 }} allowDecimals={false} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={170} interval={0} tick={{ fill: "#e2e8f0", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CollaborationTooltip />} />
                      <Bar dataKey="count" radius={[0, 12, 12, 0]} barSize={24}>
                        {collaborations.map((entry, index) => (
                          <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[420px] items-center justify-center rounded-[24px] border border-white/8 bg-white/5 text-sm text-slate-300">
                  目前條件下沒有共同申請資料。
                </div>
              )}
            </PanelCard>
          ) : null}

          <PanelCard className="border-white/10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white md:text-xl">具體事項</h2>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDetails((current) => !current)}
                  className="rounded-2xl border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-300/15"
                >
                  {showDetails ? "收合具體事項" : "顯示具體事項"}
                </button>
              </div>
            </div>

            {showDetails ? (
              <div className="space-y-3">
                {detailRows.length ? (
                  detailRows.map((row) => (
                    <div
                      key={`${row.year}-${row.applicationId}-${row.category3}-${row.teachers.join("-")}`}
                      className="rounded-[24px] border border-white/8 bg-white/5 p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
                          {row.year}年度
                        </span>
                        <span className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-xs text-slate-200">
                          {row.teachers.length > 1 ? "共同" : "單獨"}
                        </span>
                        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
                          {row.category1}
                        </span>
                        <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-100">
                          {row.category2}
                        </span>
                        <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-xs text-fuchsia-100">
                          {row.category3}
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-start">
                        <div>
                          <p className="text-sm text-slate-200">
                            <span className="text-slate-400">教師：</span>
                            {maskPersonNames(row.teachers)}
                          </p>
                          <p className="mt-1 text-sm text-slate-200">
                            <span className="text-slate-400">系所：</span>
                            {row.department}
                          </p>
                        </div>

                        <div className="text-sm text-slate-100">
                          <p>{row.totalPoints.toLocaleString()} 點</p>
                          <p className="mt-1 text-slate-300">NT$ {row.totalAmount.toLocaleString()}</p>
                        </div>

                        <div className="text-xs text-slate-400">編號 {row.applicationId}</div>
                      </div>

                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-300">{row.outcomeSummary}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
                    目前條件下沒有可顯示的具體事項。
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
                點選上方篩選或圖表後，再展開查看具體事項。
              </div>
            )}
          </PanelCard>

          <PanelCard className="border-white/10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white md:text-xl">教師金額分布</h2>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowTeacherAmountDistribution((current) => !current)
                  }
                  className="rounded-2xl border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-300/15"
                >
                  {showTeacherAmountDistribution
                    ? "收合教師金額分布"
                    : "顯示教師金額分布"}
                </button>
              </div>
            </div>

            {showTeacherAmountDistribution ? (
              teacherAmountDistribution.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                  {teacherAmountDistribution.map((item) => (
                    <div
                      key={item.name}
                      className="flex min-h-[96px] flex-col justify-center rounded-[24px] border border-white/8 bg-white/5 px-4 py-2.5"
                    >
                      <p className="text-sm font-medium text-slate-100">
                        {maskPersonName(item.name)}
                      </p>
                      <p className="mt-2 text-sm font-medium leading-5 text-cyan-100">
                        {formatAmount(item.amount)}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-slate-300">
                        {formatPercentage(item.percentage)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
                  目前條件下沒有可顯示的教師金額分布。
                </div>
              )
            ) : (
              <div className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
                點選上方篩選或圖表後，再展開查看教師金額分布。
              </div>
            )}
          </PanelCard>
        </div>
      </div>
    </main>
  )
}
