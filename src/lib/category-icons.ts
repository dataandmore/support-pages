import {
  Rocket, Wrench, BarChart3, Building2, Lock, RefreshCw, Clapperboard,
  BookOpen, FileText, HelpCircle, Settings, Users, Star,
  Zap, Package, Code, Database, Headphones, Mail, Megaphone,
  Shield, FolderOpen, Monitor, type LucideIcon,
} from "lucide-react"

// ─── Icon library ─────────────────────────────────────────────────────────────

export interface IconEntry { name: string; Icon: LucideIcon; label: string }

export const CATEGORY_ICONS: IconEntry[] = [
  { name: "Rocket",       Icon: Rocket,       label: "Rocket"    },
  { name: "Wrench",       Icon: Wrench,       label: "Wrench"    },
  { name: "BarChart3",    Icon: BarChart3,    label: "Chart"     },
  { name: "Building2",    Icon: Building2,    label: "Building"  },
  { name: "Lock",         Icon: Lock,         label: "Lock"      },
  { name: "RefreshCw",    Icon: RefreshCw,    label: "Updates"   },
  { name: "Clapperboard", Icon: Clapperboard, label: "Video"     },
  { name: "BookOpen",     Icon: BookOpen,     label: "Book"      },
  { name: "FileText",     Icon: FileText,     label: "Docs"      },
  { name: "HelpCircle",   Icon: HelpCircle,   label: "Help"      },
  { name: "Settings",     Icon: Settings,     label: "Settings"  },
  { name: "Users",        Icon: Users,        label: "Users"     },
  { name: "Star",         Icon: Star,         label: "Star"      },
  { name: "Zap",          Icon: Zap,          label: "Quick"     },
  { name: "Package",      Icon: Package,      label: "Package"   },
  { name: "Code",         Icon: Code,         label: "Code"      },
  { name: "Database",     Icon: Database,     label: "Database"  },
  { name: "Headphones",   Icon: Headphones,   label: "Support"   },
  { name: "Mail",         Icon: Mail,         label: "Email"     },
  { name: "Megaphone",    Icon: Megaphone,    label: "Announce"  },
  { name: "Shield",       Icon: Shield,       label: "Security"  },
  { name: "FolderOpen",   Icon: FolderOpen,   label: "Folder"    },
  { name: "Monitor",      Icon: Monitor,      label: "Monitor"   },
]

export function resolveIcon(name: string | null | undefined): LucideIcon | null {
  if (!name) return null
  return CATEGORY_ICONS.find((e) => e.name === name)?.Icon ?? null
}

/** Legacy emoji → Lucide icon name */
export const EMOJI_MAP: Record<string, string> = {
  "🚀": "Rocket",
  "🔧": "Wrench",
  "📊": "BarChart3",
  "🏢": "Building2",
  "🔒": "Lock",
  "🔄": "RefreshCw",
  "🎬": "Clapperboard",
}

/** Slug keyword → icon fallback */
export function iconBySlug(slug: string): LucideIcon {
  const s = slug.toLowerCase()
  if (s.includes("start") || s.includes("begin"))    return Rocket
  if (s.includes("setup") || s.includes("onboard"))  return Wrench
  if (s.includes("platform") || s.includes("using")) return BarChart3
  if (s.includes("org") || s.includes("roll"))        return Building2
  if (s.includes("secur") || s.includes("compli"))   return Lock
  if (s.includes("operat") || s.includes("update"))  return RefreshCw
  if (s.includes("video"))                            return Clapperboard
  return FolderOpen
}

/** Resolve any icon value (Lucide name, legacy emoji, or slug fallback) → LucideIcon */
export function getCategoryIcon(icon: string | null | undefined, slug: string): LucideIcon {
  if (icon) {
    const byName = resolveIcon(icon)
    if (byName) return byName
    const byEmoji = EMOJI_MAP[icon] ? resolveIcon(EMOJI_MAP[icon]) : null
    if (byEmoji) return byEmoji
  }
  return iconBySlug(slug)
}
