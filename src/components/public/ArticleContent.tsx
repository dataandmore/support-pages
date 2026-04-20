import { tiptapToHTML } from "@/lib/tiptap-to-html"

interface ArticleContentProps {
  content: unknown
}

export function ArticleContent({ content }: ArticleContentProps) {
  let html = ""
  try {
    html = tiptapToHTML(content)
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
