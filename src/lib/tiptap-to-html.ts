/**
 * Pure-function Tiptap JSON → HTML serialiser.
 *
 * No browser APIs, no happy-dom, no Tiptap extensions needed —
 * safe to call in any Node.js server environment.
 */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeInline(nodes: any[]): string {
  if (!nodes) return ""
  return nodes
    .map((node) => {
      if (node.type === "text") {
        let text = esc(node.text ?? "")
        const marks: string[] = (node.marks ?? []).map((m: { type: string; attrs?: Record<string, string> }) => m.type)
        const markAttrs = Object.fromEntries(
          (node.marks ?? []).map((m: { type: string; attrs?: Record<string, string> }) => [m.type, m.attrs ?? {}])
        )
        if (marks.includes("bold")) text = `<strong>${text}</strong>`
        if (marks.includes("italic")) text = `<em>${text}</em>`
        if (marks.includes("underline")) text = `<u>${text}</u>`
        if (marks.includes("code")) text = `<code>${text}</code>`
        if (marks.includes("highlight")) text = `<mark>${text}</mark>`
        if (marks.includes("strike")) text = `<s>${text}</s>`
        if (marks.includes("link")) {
          const href = esc(markAttrs.link?.href ?? "#")
          const target = markAttrs.link?.target ? ` target="${esc(markAttrs.link.target)}"` : ""
          text = `<a href="${href}"${target}>${text}</a>`
        }
        return text
      }
      if (node.type === "hardBreak") return "<br>"
      if (node.type === "image") {
        const src = esc(node.attrs?.src ?? "")
        const alt = esc(node.attrs?.alt ?? "")
        return `<img src="${src}" alt="${alt}">`
      }
      return ""
    })
    .join("")
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeBlock(nodes: any[]): string {
  if (!nodes) return ""
  return nodes
    .map((node) => {
      switch (node.type) {
        case "paragraph":
          return `<p>${serializeInline(node.content ?? [])}</p>`

        case "heading": {
          const lvl = node.attrs?.level ?? 2
          const align = node.attrs?.textAlign ? ` style="text-align:${node.attrs.textAlign}"` : ""
          return `<h${lvl}${align}>${serializeInline(node.content ?? [])}</h${lvl}>`
        }

        case "bulletList":
          return `<ul>${(node.content ?? []).map((li: { content: unknown[] }) => `<li>${serializeBlock(li.content ?? [])}</li>`).join("")}</ul>`

        case "orderedList":
          return `<ol>${(node.content ?? []).map((li: { content: unknown[] }) => `<li>${serializeBlock(li.content ?? [])}</li>`).join("")}</ol>`

        case "listItem":
          return serializeBlock(node.content ?? [])

        case "blockquote":
          return `<blockquote>${serializeBlock(node.content ?? [])}</blockquote>`

        case "codeBlock": {
          const code = (node.content ?? []).map((t: { text: string }) => esc(t.text ?? "")).join("")
          return `<pre><code>${code}</code></pre>`
        }

        case "image": {
          const src = esc(node.attrs?.src ?? "")
          const alt = esc(node.attrs?.alt ?? "")
          const title = node.attrs?.title ? ` title="${esc(node.attrs.title)}"` : ""
          return `<img src="${src}" alt="${alt}"${title}>`
        }

        case "horizontalRule":
          return "<hr>"

        case "table": {
          const rows = (node.content ?? []).map((row: { content: unknown[] }) => {
            const cells = (row.content ?? []).map((cell: { type: string; attrs?: Record<string, unknown>; content: unknown[] }) => {
              const tag = cell.type === "tableHeader" ? "th" : "td"
              const colspan = cell.attrs?.colspan && cell.attrs.colspan !== 1 ? ` colspan="${cell.attrs.colspan}"` : ""
              const rowspan = cell.attrs?.rowspan && cell.attrs.rowspan !== 1 ? ` rowspan="${cell.attrs.rowspan}"` : ""
              return `<${tag}${colspan}${rowspan}>${serializeBlock(cell.content ?? [])}</${tag}>`
            }).join("")
            return `<tr>${cells}</tr>`
          }).join("")
          return `<table><tbody>${rows}</tbody></table>`
        }

        case "videoEmbed": {
          const src = esc(node.attrs?.src ?? "")
          const title = esc(node.attrs?.title ?? "Video")
          if (!src) return ""
          return `<div class="video-embed-wrapper"><iframe src="${src}" title="${title}" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>`
        }

        // Fallback: try treating unknown nodes as inline containers
        default:
          if (node.content) return serializeBlock(node.content)
          return ""
      }
    })
    .join("\n")
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tiptapToHTML(doc: any): string {
  if (!doc || !doc.content) return ""
  return serializeBlock(doc.content)
}
