

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.





# Design rules — non-negotiable

1. **NO BLUE** — the brand colour is orange (#EC6E1E / #d4601a for hover).
  Never use any Tailwind `blue-`* class or blue hex value (#1d4ed8, #3b82f6, etc.).
   Colour palette: orange (#EC6E1E) for actions/links, dark charcoal (#2A2A2C) for headings,
   gray-* for neutral surfaces, orange-* for tints/backgrounds.





# Dev server

The support portal dev site runs at **[http://localhost:3040](http://localhost:3040)**

Always start it with:

```
npm run dev -- --port 3040
```





# Verification

Always verify implementation — start the dev server and confirm changes work as expected before reporting completion.

