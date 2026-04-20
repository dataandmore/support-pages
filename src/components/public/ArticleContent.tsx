import { generateHTML } from "@tiptap/html"
import { StarterKit } from "@tiptap/starter-kit"
import { Image as TiptapImage } from "@tiptap/extension-image"
import { Link as TiptapLink } from "@tiptap/extension-link"
import { Underline as TiptapUnderline } from "@tiptap/extension-underline"
import { Table as TiptapTable } from "@tiptap/extension-table"
import { TableRow as TiptapTableRow } from "@tiptap/extension-table"
import { TableCell as TiptapTableCell } from "@tiptap/extension-table"
import { TableHeader as TiptapTableHeader } from "@tiptap/extension-table"
import { TextAlign as TiptapTextAlign } from "@tiptap/extension-text-align"
import { Highlight as TiptapHighlight } from "@tiptap/extension-highlight"
import { VideoEmbed } from "@/lib/tiptap-video-embed"

const extensions = [
  StarterKit,
  TiptapImage,
  TiptapLink,
  TiptapUnderline,
  TiptapTable,
  TiptapTableRow,
  TiptapTableCell,
  TiptapTableHeader,
  TiptapTextAlign.configure({ types: ["heading", "paragraph"] }),
  TiptapHighlight,
  VideoEmbed,
]

interface ArticleContentProps {
  content: unknown
}

export function ArticleContent({ content }: ArticleContentProps) {
  let html = ""
  try {
    html = generateHTML(content as Record<string, unknown>, extensions)
  } catch {
    html = "<p>Content unavailable.</p>"
  }

  // Strip a leading <h1> if the article starts with one (it duplicates the
  // <header> title already shown above the content block).
  html = html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/, "")

  return (
    <div
      className="article-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
