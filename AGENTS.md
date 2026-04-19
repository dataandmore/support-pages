<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:design-rules -->
# Design rules — non-negotiable

1. **NO ICONS** — never import or use any icon library (lucide-react, heroicons, react-icons, etc.).
   Use text, emoji, or CSS shapes instead. Remove any existing icons when touching a component.

2. **NO BLUE** — the brand colour is orange (#EC6E1E / #d4601a for hover).
   Never use any Tailwind `blue-*` class or blue hex value (#1d4ed8, #3b82f6, etc.).
   Colour palette: orange (#EC6E1E) for actions/links, dark charcoal (#2A2A2C) for headings,
   gray-* for neutral surfaces, orange-* for tints/backgrounds.
<!-- END:design-rules -->

<!-- BEGIN:dev-server -->
# Dev server

The support portal dev site runs at **http://localhost:3040**

Always start it with:
```
npm run dev -- --port 3040
```
<!-- END:dev-server -->
