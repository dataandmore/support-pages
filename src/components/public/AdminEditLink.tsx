"use client"

import { useSession } from "next-auth/react"
import { Pencil } from "lucide-react"
import Link from "next/link"

interface AdminEditLinkProps {
  href: string
}

export function AdminEditLink({ href }: AdminEditLinkProps) {
  const { data: session } = useSession()
  const isAdmin = session?.user && ["ADMIN", "EDITOR"].includes(session.user.role ?? "")

  if (!isAdmin) return null

  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      title="Edit"
      className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-white/80 backdrop-blur-sm text-gray-400 hover:text-[#EC6E1E] hover:bg-white transition-colors shadow-sm opacity-0 group-hover:opacity-100"
    >
      <Pencil className="w-3.5 h-3.5" />
    </Link>
  )
}
