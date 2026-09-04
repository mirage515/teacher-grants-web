"use client"

import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import CountUp from "react-countup"
import PanelCard from "../ui/PanelCard"
import DashboardTabs from "../ui/DashboardTabs"
import {
  dedupePaperPublications,
  DEFAULT_PAPER_FILTERS,
  filterPaperPublications,
  getPaperDepartments,
  getPaperJournalCategories,
  getPaperSchoolYears,
  getSsciScieBucketCounts,
  getPaperTeachers,
  getPaperTrendSeries,
  getPublicationCountByCategory,
} from "../../lib/papers"
import { PaperFilters, PaperPublication, PaperRecord } from "../../types/paper"

type Props = {
  records: PaperRecord[]
}

type TeacherSearchItem = {
  name: string
}

type SummaryCardProps = {
  title: string
  value: number
  accent: string
}

type DistributionDatum = {
  name: string
  value: number
}

type CollaborationNode = {
  name: string
  papers: number
  x: number
  y: number
  radius: number
  color: string
}

type CollaborationLink = {
  source: string
  target: string
  count: number
}

type CollaborationGraphData = {
  nodes: CollaborationNode[]
  links: CollaborationLink[]
}

type TrendDatum = {
  year: string
  totalPapers: number
  firstAuthorPapers: number
  correspondingAuthorPapers: number
  firstOrCorrespondingPapers: number
  internalCoauthorPapers: number
  ssciOnlyPapers: number
  scieOnlyPapers: number
  ssciAndSciePapers: number
}

type ChartTooltipProps = {
  active?: boolean
  payload?: Array<{
    color?: string
    dataKey?: string
    name?: string
    value?: number | string
  }>
  label?: string | number
}

type TrendSeriesKey =
  | "totalPapers"
  | "firstAuthorPapers"
  | "correspondingAuthorPapers"
  | "firstOrCorrespondingPapers"
  | "internalCoauthorPapers"
  | "ssciOnlyPapers"
  | "scieOnlyPapers"
  | "ssciAndSciePapers"

type TrendDotProps = {
  cx?: number
  cy?: number
  fill?: string
  stroke?: string
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
]

function shortenLabel(value: string, limit = 10) {
  return value.length > limit ? `${value.slice(0, limit)}...` : value
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

function JournalCategoryMultiSelect({
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
      ? "全部收錄分類"
      : value.length === 1
        ? value[0]
        : `已選 ${value.length} 類`

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-left text-sm text-white outline-none transition hover:bg-white/10 focus:border-violet-300 md:text-base"
      >
        <span className="truncate">{label}</span>
        <span className={`text-slate-300 transition ${isOpen ? "rotate-180" : ""}`}>
          ⌄
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[70] rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-[0_24px_70px_rgba(2,8,23,0.45)] backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm text-slate-300">
              {value.length ? `已選 ${value.length} 類` : "未限定分類"}
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

function CountOnlyTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(2,6,23,0.92)] px-3 py-2 text-sm text-slate-50 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
      {payload[0]?.value}篇
    </div>
  )
}

function TrendTooltip({
  active,
  payload,
  label,
  hoveredSeriesKey,
  selectedSeriesKey,
}: ChartTooltipProps & {
  hoveredSeriesKey: TrendSeriesKey | null
  selectedSeriesKey: TrendSeriesKey | null
}) {
  if (!active || !payload?.length) return null

  const targetSeriesKey = hoveredSeriesKey ?? selectedSeriesKey
  const items = payload
    .filter((item) => item.name && item.value !== undefined && item.value !== null)
    .filter((item) =>
      targetSeriesKey ? item.dataKey === targetSeriesKey : payload.length === 1
    )

  if (!items.length) return null

  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(2,6,23,0.92)] px-4 py-3 text-sm text-slate-50 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
      <div className="font-semibold text-white">{label}年</div>
      <div className="mt-2 space-y-1.5 text-slate-100">
        {items.map((item) => (
          <div key={`${String(item.dataKey)}-${item.name}`}>
            <span style={{ color: item.color ?? "#e2e8f0" }}>
              {item.name}: {item.value}篇
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SummaryCard({ title, value, accent }: SummaryCardProps) {
  return (
    <PanelCard className="border-white/10">
      <p className="mb-2 text-sm text-slate-200">{title}</p>
      <div className="flex items-end justify-between gap-3">
        <p className="text-2xl font-bold text-white md:text-3xl">
          <CountUp end={value} duration={1.1} separator="," />
        </p>
        <span
          className="h-3 w-10 rounded-full"
          style={{ backgroundColor: accent }}
        />
      </div>
    </PanelCard>
  )
}

function TrendChart({ data }: { data: TrendDatum[] }) {
  const [hoveredSeriesKey, setHoveredSeriesKey] = useState<TrendSeriesKey | null>(
    null
  )
  const [selectedSeriesKey, setSelectedSeriesKey] =
    useState<TrendSeriesKey | null>(null)

  function toggleSeries(key: TrendSeriesKey) {
    setSelectedSeriesKey((current) => (current === key ? null : key))
  }

  const series = [
    { key: "totalPapers", label: "去重後論文篇數", color: "#4fd1c5" },
    { key: "firstAuthorPapers", label: "第一作者篇數", color: "#60a5fa" },
    { key: "correspondingAuthorPapers", label: "通訊作者篇數", color: "#f59e0b" },
    {
      key: "firstOrCorrespondingPapers",
      label: "第一/通訊作者篇數",
      color: "#f472b6",
    },
    { key: "internalCoauthorPapers", label: "校內合著篇數", color: "#34d399" },
    { key: "ssciOnlyPapers", label: "SSCI only", color: "#38bdf8" },
    { key: "scieOnlyPapers", label: "SCIE only", color: "#f59e0b" },
    { key: "ssciAndSciePapers", label: "SSCI + SCIE", color: "#a78bfa" },
  ] satisfies Array<{ key: TrendSeriesKey; label: string; color: string }>

  return (
    <PanelCard className="min-w-0 border-cyan-300/12">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-white md:text-xl">近三年趨勢</h2>
        {selectedSeriesKey ? (
          <button
            type="button"
            onClick={() => setSelectedSeriesKey(null)}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-100 transition hover:bg-white/10"
          >
            清除選項
          </button>
        ) : null}
      </div>

      <div className="min-w-0 h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            onMouseLeave={() => setHoveredSeriesKey(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
            <XAxis
              dataKey="year"
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              shared={false}
              trigger="hover"
              cursor={false}
              content={
                <TrendTooltip
                  hoveredSeriesKey={hoveredSeriesKey}
                  selectedSeriesKey={selectedSeriesKey}
                />
              }
              contentStyle={{
                backgroundColor: "rgba(2, 6, 23, 0.92)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "18px",
                color: "#fff",
              }}
            />
            {series.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                hide={selectedSeriesKey !== null && selectedSeriesKey !== item.key}
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={selectedSeriesKey === item.key ? 4 : 3}
                tabIndex={-1}
                focusable="false"
                dot={(props: TrendDotProps) => {
                  if (props.cx == null || props.cy == null) return null

                  return (
                    <g>
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={4}
                        fill={props.fill ?? item.color}
                        stroke={item.color}
                        strokeWidth={0}
                        tabIndex={-1}
                        focusable="false"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => toggleSeries(item.key)}
                        style={{ cursor: "pointer" }}
                      />
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={12}
                        fill="transparent"
                        tabIndex={-1}
                        focusable="false"
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setHoveredSeriesKey(item.key)}
                        onMouseLeave={() => setHoveredSeriesKey(null)}
                        onClick={() => toggleSeries(item.key)}
                        style={{ cursor: "pointer" }}
                      />
                    </g>
                  )
                }}
                activeDot={(props: TrendDotProps) => {
                  if (props.cx == null || props.cy == null) return null

                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={6}
                      fill={item.color}
                      stroke={item.color}
                      strokeWidth={0}
                      tabIndex={-1}
                      focusable="false"
                      style={{ pointerEvents: "none" }}
                    />
                  )
                }}
                onClick={() => toggleSeries(item.key)}
                style={{ cursor: "pointer" }}
                animationDuration={900}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

    </PanelCard>
  )
}

function CategoryDistributionChart({
  data,
  activeCategories,
  onToggleCategory,
  onClearCategories,
}: {
  data: DistributionDatum[]
  activeCategories: string[]
  onToggleCategory: (category: string) => void
  onClearCategories: () => void
}) {
  return (
    <PanelCard className="min-w-0 border-emerald-300/12">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white md:text-xl">
          收錄分類分布
        </h2>
        {activeCategories.length ? (
          <button
            type="button"
            onClick={onClearCategories}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
          >
            清除選項
          </button>
        ) : null}
      </div>

      <div className="min-w-0 h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 10, left: 10, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fill: "#e2e8f0", fontSize: 13 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CountOnlyTooltip />}
              cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
              contentStyle={{
                backgroundColor: "rgba(2, 6, 23, 0.92)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "18px",
                color: "#fff",
              }}
            />
            <Bar
              dataKey="value"
              radius={[0, 12, 12, 0]}
              barSize={26}
              onClick={(entry) => {
                if (!entry || typeof entry.name !== "string") return
                onToggleCategory(entry.name)
              }}
              style={{ cursor: "pointer" }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`category-${entry.name}-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  fillOpacity={
                    activeCategories.length === 0 ||
                    activeCategories.includes(entry.name)
                      ? 1
                      : 0.3
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  )
}

function CollaborationNetworkChart({
  data,
  selectedTeacher,
}: {
  data: CollaborationGraphData
  selectedTeacher: string
}) {
  const nodeMap = new Map(data.nodes.map((node) => [node.name, node]))
  const maxLinkCount = Math.max(...data.links.map((link) => link.count), 1)

  return (
    <PanelCard className="min-w-0 border-violet-300/12">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white md:text-xl">
          校內合著情形
        </h2>
      </div>

      {selectedTeacher && data.nodes.length ? (
        <div className="min-w-0 h-[420px] w-full overflow-hidden rounded-2xl border border-white/6 bg-white/[0.035]">
          <svg viewBox="0 0 720 420" className="h-full w-full" role="img" aria-label="校內合著關聯圖">
            <defs>
              <filter id="paperNodeGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {data.links.map((link) => {
              const source = nodeMap.get(link.source)
              const target = nodeMap.get(link.target)
              if (!source || !target) return null

              const deltaX = target.x - source.x
              const deltaY = target.y - source.y
              const distance = Math.hypot(deltaX, deltaY) || 1
              const unitX = deltaX / distance
              const unitY = deltaY / distance
              const sourceX = source.x + unitX * source.radius
              const sourceY = source.y + unitY * source.radius
              const targetX = target.x - unitX * target.radius
              const targetY = target.y - unitY * target.radius
              const isSelectedLink =
                !!selectedTeacher &&
                (link.source === selectedTeacher || link.target === selectedTeacher)

              return (
                <g key={`${link.source}-${link.target}`}>
                  <line
                    x1={sourceX}
                    y1={sourceY}
                    x2={targetX}
                    y2={targetY}
                    stroke={isSelectedLink ? "rgba(52,211,153,0.84)" : "rgba(148,163,184,0.34)"}
                    strokeWidth={Math.max(1.25, (link.count / maxLinkCount) * 7)}
                    strokeLinecap="round"
                  />
                  <title>{`${link.source} - ${link.target}: ${link.count} 篇`}</title>
                </g>
              )
            })}

            {data.nodes.map((node) => {
              const isSelected = selectedTeacher === node.name

              return (
                <g key={node.name} transform={`translate(${node.x} ${node.y})`}>
                  <circle
                    r={node.radius + 7}
                    fill={node.color}
                    opacity={isSelected ? 0.22 : 0.1}
                    filter="url(#paperNodeGlow)"
                  />
                  <circle
                    r={node.radius}
                    fill={node.color}
                    opacity={isSelected ? 1 : 0.92}
                    stroke={isSelected ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.28)"}
                    strokeWidth={isSelected ? 3 : 1.4}
                  />
                  <text
                    y={node.radius + 18}
                    textAnchor="middle"
                    className="fill-slate-100 text-[13px] font-semibold"
                  >
                    {shortenLabel(node.name, 8)}
                  </text>
                  <text y={7} textAnchor="middle" className="fill-white text-[18px] font-bold">
                    {node.papers}
                  </text>
                  <title>{`${node.name}: ${node.papers} 篇`}</title>
                </g>
              )
            })}
          </svg>
        </div>
      ) : (
        <div className="flex h-full min-h-[404px] items-center justify-center rounded-2xl border border-white/6 bg-white/[0.04] px-6 text-center text-sm leading-7 text-slate-300">
          {selectedTeacher
            ? "目前條件下沒有可顯示的校內合著資料。"
            : "選擇某位教師後，這裡會顯示該教師的校內合著情形。"}
        </div>
      )}
    </PanelCard>
  )
}

function formatApaAuthors(teacherNames: string[]) {
  if (teacherNames.length === 0) return ""
  if (teacherNames.length === 1) return teacherNames[0]
  if (teacherNames.length === 2) return `${teacherNames[0]} & ${teacherNames[1]}`

  return `${teacherNames.slice(0, -1).join(", ")}, & ${teacherNames.at(-1)}`
}

function formatApaReference(publication: PaperPublication) {
  const authors = formatApaAuthors(publication.teacherNames)
  return `${authors}. (${publication.publicationYear}). ${publication.title}. ${publication.journalName}.`
}

function PublicationList({
  publications,
}: {
  publications: PaperPublication[]
}) {
  return (
    <div className="space-y-3">
      {publications.map((publication, index) => (
        <div
          key={publication.paperKey}
          className="rounded-2xl border border-white/6 bg-white/[0.04] px-4 py-4 text-sm leading-7 text-slate-100"
        >
          <span className="mr-2 text-slate-400">{index + 1}.</span>
          {formatApaReference(publication)}
        </div>
      ))}
    </div>
  )
}

function TeacherPublicationRank({
  data,
  isOpen,
  onToggleOpen,
  selectedTeacher,
  onSelectTeacher,
}: {
  data: Array<{ name: string; count: number }>
  isOpen: boolean
  onToggleOpen: () => void
  selectedTeacher: string
  onSelectTeacher: (name: string) => void
}) {
  return (
    <PanelCard className="border-white/10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white md:text-xl">
          教師發表數量排行
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {data.length} 位
          </span>
          <button
            type="button"
            onClick={onToggleOpen}
            className="rounded-2xl border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-300/15"
          >
            {isOpen ? "收合教師排行" : "顯示教師排行"}
          </button>
        </div>
      </div>

      {isOpen ? (
        data.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {data.map((item, index) => (
              <button
                key={item.name}
                type="button"
                onClick={() => onSelectTeacher(item.name)}
                className={`rounded-[24px] border px-4 py-3 text-left transition ${
                  selectedTeacher === item.name
                    ? "border-cyan-300/45 bg-cyan-300/12"
                    : "border-white/8 bg-white/5 hover:bg-white/8"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-semibold text-slate-200">
                    #{index + 1}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-base font-semibold text-slate-100">
                    {item.count} 篇
                  </span>
                </div>
                <p className="mt-3 text-base font-semibold text-white">
                  {item.name}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
            目前條件下沒有可顯示的教師排行。
          </div>
        )
      ) : (
        <div className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
          展開後可依目前篩選條件查看教師發表數量排行。
        </div>
      )}
    </PanelCard>
  )
}

function filterRecordsByPaperFilters(records: PaperRecord[], filters: PaperFilters) {
  return records.filter((record) => {
    const matchYear = !filters.schoolYear || record.schoolYear === filters.schoolYear
    const matchDepartment =
      !filters.department || record.department === filters.department
    const matchTeacher =
      !filters.teacherName || record.teacherName === filters.teacherName
    const matchCategory =
      filters.journalCategories.length === 0 ||
      filters.journalCategories.some((category) =>
        record.journalCategories.includes(category)
      )

    return matchYear && matchDepartment && matchTeacher && matchCategory
  })
}

function getCollaborationGraphData(
  publications: PaperPublication[],
  selectedTeacher: string,
  limit = 18
): CollaborationGraphData {
  const nodeCounts = new Map<string, number>()
  const linkCounts = new Map<string, { source: string; target: string; count: number }>()
  const collaborationPublications = publications.filter(
    (publication) =>
      publication.teacherNames.length > 1 &&
      (!selectedTeacher || publication.teacherNames.includes(selectedTeacher))
  )

  collaborationPublications.forEach((publication) => {
    const teachers = [...publication.teacherNames].sort((a, b) =>
      a.localeCompare(b, "zh-Hant")
    )

    teachers.forEach((teacher) => {
      nodeCounts.set(teacher, (nodeCounts.get(teacher) ?? 0) + 1)
    })

    for (let sourceIndex = 0; sourceIndex < teachers.length; sourceIndex += 1) {
      for (let targetIndex = sourceIndex + 1; targetIndex < teachers.length; targetIndex += 1) {
        const source = teachers[sourceIndex]
        const target = teachers[targetIndex]

        if (selectedTeacher && source !== selectedTeacher && target !== selectedTeacher) {
          continue
        }

        const key = `${source}::${target}`
        const current = linkCounts.get(key) ?? { source, target, count: 0 }
        current.count += 1
        linkCounts.set(key, current)
      }
    }
  })

  const rankedNames = Array.from(nodeCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hant"))
    .map(([name]) => name)

  const displayNames = selectedTeacher
    ? [selectedTeacher, ...rankedNames.filter((name) => name !== selectedTeacher).slice(0, limit - 1)]
    : rankedNames.slice(0, limit)
  const displayNameSet = new Set(displayNames)
  const displayLinks = Array.from(linkCounts.values())
    .filter((link) => displayNameSet.has(link.source) && displayNameSet.has(link.target))
    .sort((a, b) => b.count - a.count)

  const centerX = 360
  const centerY = 206
  const orbitRadius = 145
  const maxPapers = Math.max(...displayNames.map((name) => nodeCounts.get(name) ?? 0), 1)
  const orbitNames = selectedTeacher ? displayNames.filter((name) => name !== selectedTeacher) : displayNames

  const nodes = displayNames.map((name, index) => {
    const papers = nodeCounts.get(name) ?? 0
    const isSelected = selectedTeacher === name
    const orbitIndex = selectedTeacher ? orbitNames.indexOf(name) : index
    const angle =
      selectedTeacher && isSelected
        ? 0
        : -Math.PI / 2 + (Math.PI * 2 * orbitIndex) / Math.max(orbitNames.length, 1)
    const x = selectedTeacher && isSelected ? centerX : centerX + Math.cos(angle) * orbitRadius
    const y = selectedTeacher && isSelected ? centerY : centerY + Math.sin(angle) * orbitRadius

    return {
      name,
      papers,
      x,
      y,
      radius: 15 + Math.sqrt(papers / maxPapers) * 24,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }
  })

  return {
    nodes,
    links: displayLinks,
  }
}

export default function PaperPublicationsDashboard({ records }: Props) {
  const [filters, setFilters] = useState<PaperFilters>(DEFAULT_PAPER_FILTERS)
  const [teacherKeyword, setTeacherKeyword] = useState("")
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false)
  const [showTeacherRank, setShowTeacherRank] = useState(false)
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

  const fullTimeRecords = useMemo(
    () => records.filter((record) => record.appointmentType === "專任"),
    [records]
  )

  const schoolYears = useMemo(
    () => getPaperSchoolYears(fullTimeRecords),
    [fullTimeRecords]
  )
  const departments = useMemo(
    () => getPaperDepartments(fullTimeRecords),
    [fullTimeRecords]
  )

  const teacherSourceRecords = useMemo(() => {
    return filterRecordsByPaperFilters(fullTimeRecords, {
      ...filters,
      teacherName: "",
    })
  }, [fullTimeRecords, filters])

  const categorySourceRecords = useMemo(() => {
    return filterRecordsByPaperFilters(fullTimeRecords, {
      ...filters,
      journalCategories: [],
    })
  }, [fullTimeRecords, filters])

  const teachers = useMemo<TeacherSearchItem[]>(
    () => getPaperTeachers(teacherSourceRecords).map((name) => ({ name })),
    [teacherSourceRecords]
  )
  const teacherOptions = useMemo(() => {
    const keyword = teacherSearch.trim()
    if (!keyword) return teachers

    return teachers.filter((teacher) => teacher.name.includes(keyword))
  }, [teachers, teacherSearch])
  const journalCategories = useMemo(
    () => getPaperJournalCategories(categorySourceRecords),
    [categorySourceRecords]
  )

  const filteredPublications = useMemo(() => {
    const publications = dedupePaperPublications(fullTimeRecords)
    return filterPaperPublications(publications, filters)
  }, [fullTimeRecords, filters])

  const firstAuthorPaperCount = useMemo(
    () =>
      filteredPublications.filter(
        (publication) => publication.firstAuthors.length > 0
      ).length,
    [filteredPublications]
  )

  const correspondingPaperCount = useMemo(
    () =>
      filteredPublications.filter(
        (publication) => publication.correspondingAuthors.length > 0
      ).length,
    [filteredPublications]
  )

  const firstOrCorrespondingPaperCount = useMemo(
    () =>
      filteredPublications.filter((publication) =>
        publication.firstAuthors.some((author) =>
          publication.correspondingAuthors.includes(author)
        )
      ).length,
    [filteredPublications]
  )

  const internalCoauthorCount = useMemo(
    () =>
      filteredPublications.filter((publication) => publication.hasInternalCoauthor)
        .length,
    [filteredPublications]
  )

  const categoryDistribution = useMemo(
    () => getPublicationCountByCategory(filteredPublications),
    [filteredPublications]
  )

  const ssciScieBucketCounts = useMemo(
    () => getSsciScieBucketCounts(filteredPublications),
    [filteredPublications]
  )

  const trendSeries = useMemo(
    () => getPaperTrendSeries(filteredPublications),
    [filteredPublications]
  )

  const collaborationGraphData = useMemo(
    () => getCollaborationGraphData(filteredPublications, filters.teacherName),
    [filteredPublications, filters.teacherName]
  )

  const selectedTeacherPublications = useMemo(() => {
    if (!filters.teacherName) return []

    return filteredPublications
      .filter((publication) => publication.teacherNames.includes(filters.teacherName))
      .sort((a, b) => b.publicationYear - a.publicationYear)
  }, [filteredPublications, filters.teacherName])

  const teacherPublicationRank = useMemo(() => {
    const counts = new Map<string, number>()

    filteredPublications.forEach((publication) => {
      publication.teacherNames.forEach((teacher) => {
        counts.set(teacher, (counts.get(teacher) ?? 0) + 1)
      })
    })

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-Hant"))
  }, [filteredPublications])

  function handleFilterChange<K extends keyof PaperFilters>(
    key: K,
    value: PaperFilters[K]
  ) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }

      const validTeachers = getPaperTeachers(
        filterRecordsByPaperFilters(fullTimeRecords, {
          ...next,
          teacherName: "",
        })
      )

      if (next.teacherName && !validTeachers.includes(next.teacherName)) {
        next.teacherName = ""
        setTeacherKeyword("")
      }

      const validCategories = getPaperJournalCategories(
        filterRecordsByPaperFilters(fullTimeRecords, {
          ...next,
          journalCategories: [],
        })
      )

      next.journalCategories = next.journalCategories.filter((category) =>
        validCategories.includes(category)
      )

      if (key === "teacherName") {
        setTeacherKeyword(String(value))
      }

      if (key !== "teacherName" && !next.teacherName) {
        setTeacherKeyword("")
      }

      return next
    })
  }

  function handleTeacherSelect(name: string) {
    handleFilterChange("teacherName", name)
    setTeacherKeyword(name)
    setTeacherDropdownOpen(false)
  }

  function resetFilters() {
    setFilters(DEFAULT_PAPER_FILTERS)
    setTeacherKeyword("")
    setTeacherDropdownOpen(false)
  }

  function handleCategoryToggle(category: string) {
    handleFilterChange("journalCategories", toggleValue(filters.journalCategories, category))
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#12233f] text-white">
      <div className="relative mx-auto flex w-full max-w-[1920px] flex-col gap-6 px-4 py-6 md:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_30%)] blur-3xl" />

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-cyan-200/80 md:text-sm">
              Publications Analytic Dashboard
            </p>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl xl:text-4xl">
              期刊論文發表儀錶板
            </h1>
          </div>

          <DashboardTabs />
        </div>

        <div className="space-y-4">
          <PanelCard className="relative z-30 overflow-visible border-white/10">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-sm text-slate-100">年度</label>
                <select
                  value={filters.schoolYear}
                  onChange={(event) =>
                    handleFilterChange("schoolYear", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300 md:text-base"
                >
                  <option value="" className="text-black">
                    全部年度
                  </option>
                  {schoolYears.map((year) => (
                    <option key={year} value={year} className="text-black">
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-100">系所</label>
                <select
                  value={filters.department}
                  onChange={(event) =>
                    handleFilterChange("department", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-300 md:text-base"
                >
                  <option value="" className="text-black">
                    全部系所
                  </option>
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
                  onClick={() => setTeacherDropdownOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-left text-sm text-white outline-none transition hover:border-emerald-300 focus:border-emerald-300 md:text-base"
                >
                  <span className={filters.teacherName ? "text-white" : "text-slate-300"}>
                    {filters.teacherName || "全部教師"}
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

                {teacherDropdownOpen && (
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
                        placeholder="搜尋教師姓名"
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
                            {teacher.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-slate-300">
                          找不到符合的教師
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-100">收錄分類</label>
                <JournalCategoryMultiSelect
                  options={journalCategories}
                  value={filters.journalCategories}
                  onChange={(nextValue) =>
                    handleFilterChange("journalCategories", nextValue)
                  }
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20 md:text-base"
                >
                  重設篩選
                </button>
              </div>
            </div>
          </PanelCard>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="去重後論文篇數"
              value={filteredPublications.length}
              accent="#4fd1c5"
            />
            <SummaryCard
              title="SSCI only"
              value={ssciScieBucketCounts.ssciOnly}
              accent="#38bdf8"
            />
            <SummaryCard
              title="SCIE only"
              value={ssciScieBucketCounts.scieOnly}
              accent="#f59e0b"
            />
            <SummaryCard
              title="SSCI + SCIE"
              value={ssciScieBucketCounts.both}
              accent="#a78bfa"
            />
            <SummaryCard
              title="第一作者篇數"
              value={firstAuthorPaperCount}
              accent="#60a5fa"
            />
            <SummaryCard
              title="通訊作者篇數"
              value={correspondingPaperCount}
              accent="#f59e0b"
            />
            <SummaryCard
              title="第一/通訊作者篇數"
              value={firstOrCorrespondingPaperCount}
              accent="#f472b6"
            />
            <SummaryCard
              title="校內合著篇數"
              value={internalCoauthorCount}
              accent="#34d399"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <TrendChart data={trendSeries} />
            <CategoryDistributionChart
              data={categoryDistribution}
              activeCategories={filters.journalCategories}
              onToggleCategory={handleCategoryToggle}
              onClearCategories={() => handleFilterChange("journalCategories", [])}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <CollaborationNetworkChart
              data={collaborationGraphData}
              selectedTeacher={filters.teacherName}
            />

            {filters.teacherName ? (
              <PanelCard className="border-white/10">
                <h2 className="mb-4 text-lg font-semibold text-white md:text-xl">
                  著作清單（簡式）
                </h2>
                <PublicationList publications={selectedTeacherPublications} />
              </PanelCard>
            ) : (
              <PanelCard className="border-white/10">
                <h2 className="mb-4 text-lg font-semibold text-white md:text-xl">
                  著作清單（簡式）
                </h2>
                <div className="flex h-full min-h-[404px] items-center justify-center rounded-2xl border border-white/6 bg-white/[0.04] px-6 text-center text-sm leading-7 text-slate-300">
                  選擇某位教師後，這裡會顯示該教師的著作清單，並以 APA 格式列出。
                </div>
              </PanelCard>
            )}
          </section>

          <TeacherPublicationRank
            data={teacherPublicationRank}
            isOpen={showTeacherRank}
            onToggleOpen={() => setShowTeacherRank((current) => !current)}
            selectedTeacher={filters.teacherName}
            onSelectTeacher={handleTeacherSelect}
          />
        </div>
      </div>
    </main>
  )
}
