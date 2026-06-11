export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0])
  const lines = rows.map(row =>
    headers.map(h => {
      const val = row[h] ?? ""
      return typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))
        ? `"${val.replace(/"/g, '""')}"`
        : String(val)
    }).join(",")
  )
  return [headers.join(","), ...lines].join("\n")
}