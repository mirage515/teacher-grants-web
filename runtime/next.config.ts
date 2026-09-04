import path from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: currentDir,
  },
}

export default nextConfig
