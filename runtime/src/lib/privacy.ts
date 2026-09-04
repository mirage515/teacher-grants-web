export function maskPersonName(name: string) {
  const normalized = name.trim()
  const characters = Array.from(normalized)

  if (characters.length === 0) return ""
  if (characters.length === 1) return "O"
  if (characters.length === 2) return `${characters[0]}O`

  return `${characters[0]}${"O".repeat(characters.length - 2)}${
    characters[characters.length - 1]
  }`
}

export function maskPersonNames(names: string[], separator = "、") {
  return names.map((name) => maskPersonName(name)).join(separator)
}
