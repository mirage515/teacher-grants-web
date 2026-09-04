import Image from "next/image"
import Link from "next/link"
import {
  Award,
  BookOpenText,
  BriefcaseBusiness,
  GraduationCap,
  UsersRound,
} from "lucide-react"

const dashboards = [
  {
    href: "/grants",
    title: "獎補助分析",
    subtitle: "掌握教師獎補助投入、系所分布與年度變化。",
    icon: Award,
    accent: "#4fd1c5",
  },
  {
    href: "/teaching",
    title: "教學精進",
    subtitle: "分析教學獎勵主類、次類、細項與教師參與情形。",
    icon: GraduationCap,
    accent: "#f59e0b",
  },
  {
    href: "/papers",
    title: "論文發表",
    subtitle: "檢視期刊論文、收錄分類、作者角色與合著情形。",
    icon: BookOpenText,
    accent: "#60a5fa",
  },
  {
    href: "/projects",
    title: "計畫承接",
    subtitle: "追蹤教師與系所承接計畫類型、金額與清單。",
    icon: BriefcaseBusiness,
    accent: "#f472b6",
  },
  {
    href: "/teachers",
    title: "教師聘任",
    subtitle: "了解專兼任、職級、系所人力與研究評鑑風險。",
    icon: UsersRound,
    accent: "#34d399",
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#12233f] text-white">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1920px] flex-col px-4 py-6 md:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(135deg,#102a4c_0%,#12233f_42%,#18223a_72%,#10283f_100%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-45 [background-image:linear-gradient(rgba(125,211,252,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.14)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="portal-scanline pointer-events-none absolute inset-x-0 top-20 -z-10 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
        <div className="portal-orbit pointer-events-none absolute left-[8%] top-[18%] -z-10 h-56 w-56 rounded-full border border-cyan-200/12" />
        <div className="portal-orbit pointer-events-none absolute bottom-[14%] right-[10%] -z-10 h-72 w-72 rounded-full border border-emerald-200/10 [animation-delay:-5s]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.18),rgba(52,211,153,0.08)_38%,transparent_68%)] blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 -z-10 h-56 bg-gradient-to-t from-[#0b1628]/90 to-transparent" />

        <section className="flex flex-1 items-start justify-center pt-8 pb-10 md:pt-10">
          <div className="w-full max-w-6xl">
            <div className="mb-14 flex flex-col items-center text-center md:mb-16">
              <div className="mb-3 px-5 pb-3 pt-0">
                <Image
                  src="/CGIT_logo.svg"
                  alt="長庚科技大學"
                  width={210}
                  height={74}
                  priority
                  className="h-auto w-[170px] md:w-[210px]"
                />
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                教師教研數據管理平台
              </h1>
              <h2 className="sr-only">
                選擇分析儀錶板
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
              {dashboards.map((dashboard, index) => {
                const Icon = dashboard.icon

                return (
                  <Link
                    key={dashboard.href}
                    href={dashboard.href}
                    className="portal-card group relative min-h-[260px] overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(150deg,rgba(15,23,42,0.70),rgba(30,41,59,0.46))] px-5 pb-5 pt-4 shadow-[0_24px_80px_rgba(2,8,23,0.28)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/24 hover:bg-white/10"
                  >
                    <div
                      className="absolute -right-14 -top-14 h-36 w-36 rounded-full opacity-20 blur-2xl transition group-hover:opacity-35"
                      style={{ backgroundColor: dashboard.accent }}
                    />
                    <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition group-hover:opacity-100" />
                    <div
                      className="portal-icon-shell mb-8"
                      style={{
                        "--portal-accent": dashboard.accent,
                        animationDelay: `${180 + index * 90}ms`,
                      } as React.CSSProperties}
                    >
                      <span className="portal-icon-shadow" />
                      <span className="portal-icon-ring" />
                      <span className="portal-icon-spark portal-icon-spark-a" />
                      <span className="portal-icon-spark portal-icon-spark-b" />
                      <div className="portal-icon-core">
                        <Icon className="h-6 w-6" strokeWidth={1.8} />
                      </div>
                    </div>

                    <div className="relative">
                      <h3 className="text-xl font-bold text-white md:text-2xl">
                        {dashboard.title}
                      </h3>
                      <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-300">
                        {dashboard.subtitle}
                      </p>
                    </div>

                    <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Enter
                      </span>
                      <span
                        className="h-3 w-12 rounded-full transition group-hover:w-16"
                        style={{ backgroundColor: dashboard.accent }}
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
