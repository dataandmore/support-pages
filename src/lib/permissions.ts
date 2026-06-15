export type Role = "ADMIN" | "EDITOR" | "VIEWER"

/** Users who can create or edit content (articles, videos, categories, media). */
export function canWrite(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "EDITOR"
}

export function canManageUsers(role: string | undefined | null): boolean {
  return role === "ADMIN"
}
