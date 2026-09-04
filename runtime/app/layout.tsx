import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "教師獎補助儀表板",
  description: "整理 112 至 114 年教師獎補助資料的互動式分析儀表板。",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-Hant" className="h-full">
      <body>{children}</body>
    </html>
  )
}
