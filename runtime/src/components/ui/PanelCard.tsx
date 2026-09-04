import { ReactNode } from "react"

type Props = {
  children: ReactNode
  className?: string
}

export default function PanelCard({ children, className = "" }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(9,16,30,0.78))] p-5 shadow-[0_24px_70px_rgba(2,8,23,0.28)] backdrop-blur-xl ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,209,197,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.12),transparent_28%)]" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
