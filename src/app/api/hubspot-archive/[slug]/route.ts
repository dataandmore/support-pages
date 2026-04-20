import { NextRequest, NextResponse } from "next/server"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

// CSS that restores HubSpot's Bootstrap 2 grid + common widget wrappers.
// Without this the .row-fluid / .span12 / .dnd-* divs produce no layout
// and the page looks like a wall of unstyled text.
const GRID_CSS = `
/* ── HubSpot Bootstrap-2 grid (minimal) ─────────────────────── */
.row-fluid-wrapper, .row-fluid { display: block; width: 100%; box-sizing: border-box; }
.span12 { display: block; width: 100%; box-sizing: border-box; }
.widget-span, .dnd-column, .dnd-row, .dnd-section, .dnd-module { display: block; }
.hs_cos_wrapper { display: block; }
/* Remove Bootstrap container max-widths that constrain width inside iframe */
.container-fluid { width: 100%; padding: 0; }
/* HubSpot inline images sometimes have width/height attrs — clamp them */
img { max-width: 100% !important; height: auto !important; }
/* Hide leftover HubSpot UI chrome (subscription forms, CTA, etc.) */
.hs-cta-wrapper, .hs-cta-node, .hs-blog-subscribe { display: none !important; }
`

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Sanitise — only allow slug-safe characters to prevent path traversal
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return new NextResponse("Not found", { status: 404 })
  }

  const filePath = join(process.cwd(), "public", "hubspot-archive", `${slug}.html`)
  if (!existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 })
  }

  let html = readFileSync(filePath, "utf-8")

  // Inject the grid CSS right before </head>
  html = html.replace("</head>", `<style>${GRID_CSS}</style>\n</head>`)

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Allow iframe from same origin, no caching needed
      "Cache-Control": "no-store",
    },
  })
}
