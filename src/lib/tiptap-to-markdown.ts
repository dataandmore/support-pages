/**
 * Pure-function Tiptap JSON → Markdown serialiser.
 * Safe to call in any Node.js server environment.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeInline(nodes: any[]): string {
  if (!nodes) return ""
  return nodes
    .map((node) => {
      if (node.type === "text") {
        let text: string = node.text ?? ""
        const marks: string[] = (node.marks ?? []).map(
          (m: { type: string }) => m.type
        )
        const markAttrs = Object.fromEntries(
          (node.marks ?? []).map(
            (m: { type: string; attrs?: Record<string, string> }) => [
              m.type,
              m.attrs ?? {},
            ]
          )
        )
        if (marks.includes("code")) return `\`${text}\``
        if (marks.includes("bold")) text = `**${text}**`
        if (marks.includes("italic")) text = `*${text}*`
        if (marks.includes("strike")) text = `~~${text}~~`
        if (marks.includes("link")) {
          const href = markAttrs.link?.href ?? "#"
          text = `[${text}](${href})`
        }
        return text
      }
      if (node.type === "hardBreak") return "  \n"
      if (node.type === "image") {
        const src = node.attrs?.src ?? ""
        const alt = node.attrs?.alt ?? ""
        return `![${alt}](${src})`
      }
      return ""
    })
    .join("")
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeBlock(nodes: any[], indent = ""): string {
  if (!nodes) return ""
  return nodes
    .map((node) => {
      switch (node.type) {
        case "paragraph":
          return `${indent}${serializeInline(node.content ?? [])}`

        case "heading": {
          const lvl = node.attrs?.level ?? 2
          const prefix = "#".repeat(lvl)
          return `${prefix} ${serializeInline(node.content ?? [])}`
        }

        case "bulletList":
          return (node.content ?? [])
            .map(
              (li: { content: unknown[] }) =>
                `${indent}- ${serializeBlock(li.content ?? [], indent + "  ").trim()}`
            )
            .join("\n")

        case "orderedList":
          return (node.content ?? [])
            .map(
              (li: { content: unknown[] }, i: number) =>
                `${indent}${i + 1}. ${serializeBlock(li.content ?? [], indent + "   ").trim()}`
            )
            .join("\n")

        case "listItem":
          return serializeBlock(node.content ?? [], indent)

        case "blockquote":
          return serializeBlock(node.content ?? [])
            .split("\n")
            .map((line: string) => `> ${line}`)
            .join("\n")

        case "codeBlock": {
          const lang = node.attrs?.language ?? ""
          const code = (node.content ?? [])
            .map((t: { text: string }) => t.text ?? "")
            .join("")
          return `\`\`\`${lang}\n${code}\n\`\`\``
        }

        case "image": {
          const src = node.attrs?.src ?? ""
          const alt = node.attrs?.alt ?? ""
          return `![${alt}](${src})`
        }

        case "horizontalRule":
          return "---"

        case "table": {
          const rows = (node.content ?? []) as Array<{
            content: Array<{
              type: string
              content: unknown[]
            }>
          }>
          if (rows.length === 0) return ""
          const tableRows = rows.map((row) =>
            (row.content ?? []).map((cell) =>
              serializeBlock(cell.content ?? []).trim().replace(/\n/g, " ")
            )
          )
          const colCount = tableRows[0]?.length ?? 0
          const header = `| ${tableRows[0]?.join(" | ") ?? ""} |`
          const separator = `| ${Array(colCount).fill("---").join(" | ")} |`
          const body = tableRows
            .slice(1)
            .map((row) => `| ${row.join(" | ")} |`)
            .join("\n")
          return [header, separator, body].filter(Boolean).join("\n")
        }

        case "videoEmbed": {
          const src = node.attrs?.src ?? ""
          const title = node.attrs?.title ?? "Video"
          return src ? `[${title}](${src})` : ""
        }

        default:
          if (node.content) return serializeBlock(node.content, indent)
          return ""
      }
    })
    .join("\n\n")
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tiptapToMarkdown(doc: any): string {
  if (!doc || !doc.content) return ""
  return serializeBlock(doc.content)
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
