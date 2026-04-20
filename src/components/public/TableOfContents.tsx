"use client"

import { useEffect, useState } from "react"

interface TocItem {
  id: string
  text: string
  level: number
}

export function TableOfContents() {
  const [items, setItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll(".prose h2, .prose h3")
    ) as HTMLElement[]

    const tocItems = headings.map((el) => {
      if (!el.id) {
        el.id = el.textContent?.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "") ?? ""
      }
      return {
        id: el.id,
        text: el.textContent ?? "",
        level: parseInt(el.tagName[1]),
      }
    })
    setItems(tocItems)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) setActiveId(visible[0].target.id)
      },
      { rootMargin: "0px 0px -60% 0px" }
    )
    headings.forEach((h) => observer.observe(h))
    return () => observer.disconnect()
  }, [])

  if (items.length === 0) return null

  return (
    <nav className="sticky top-24 text-sm">
      <p className="font-semibold text-gray-500 uppercase tracking-wide text-xs mb-3">
        On this page
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            style={{ paddingLeft: `${(item.level - 2) * 12}px` }}
          >
            <a
              href={`#${item.id}`}
              className={`block transition-colors hover:text-[#EC6E1E] ${
                activeId === item.id ? "text-[#EC6E1E] font-medium" : "text-gray-500"
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
