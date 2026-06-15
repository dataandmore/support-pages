import { describe, it, expect } from "vitest"
import { canWrite, canManageUsers } from "@/lib/permissions"

// ---------------------------------------------------------------------------
// Test the credential shape validation logic that mirrors auth.ts
// We test pure validation logic without hitting the DB or NextAuth runtime.
// ---------------------------------------------------------------------------

function validateCredentials(
  credentials: Record<string, string> | undefined
): { email: string; password: string } | null {
  if (!credentials) return null
  const { email, password } = credentials
  if (typeof email !== "string" || !email.includes("@")) return null
  if (typeof password !== "string" || password.length < 6) return null
  return { email: email.toLowerCase().trim(), password }
}

describe("credential validation", () => {
  it("accepts valid email + password", () => {
    const result = validateCredentials({ email: "user@example.com", password: "secret123" })
    expect(result).not.toBeNull()
    expect(result?.email).toBe("user@example.com")
  })

  it("normalises email to lowercase", () => {
    const result = validateCredentials({ email: "User@Example.COM", password: "secret123" })
    expect(result?.email).toBe("user@example.com")
  })

  it("trims whitespace from email", () => {
    const result = validateCredentials({ email: "  user@example.com  ", password: "secret123" })
    expect(result?.email).toBe("user@example.com")
  })

  it("rejects missing credentials", () => {
    expect(validateCredentials(undefined)).toBeNull()
  })

  it("rejects email without @", () => {
    expect(validateCredentials({ email: "notanemail", password: "secret123" })).toBeNull()
  })

  it("rejects password shorter than 6 chars", () => {
    expect(validateCredentials({ email: "user@example.com", password: "abc" })).toBeNull()
  })

  it("rejects empty password", () => {
    expect(validateCredentials({ email: "user@example.com", password: "" })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Role hierarchy checks (mirrors middleware and API guard logic)
// ---------------------------------------------------------------------------

describe("role checks", () => {
  it("ADMIN can write and manage users", () => {
    expect(canWrite("ADMIN")).toBe(true)
    expect(canManageUsers("ADMIN")).toBe(true)
  })

  it("EDITOR can write but cannot manage users", () => {
    expect(canWrite("EDITOR")).toBe(true)
    expect(canManageUsers("EDITOR")).toBe(false)
  })

  it("VIEWER cannot write or manage users", () => {
    expect(canWrite("VIEWER")).toBe(false)
    expect(canManageUsers("VIEWER")).toBe(false)
  })

  it("undefined role cannot do anything", () => {
    expect(canWrite(undefined)).toBe(false)
    expect(canManageUsers(undefined)).toBe(false)
  })
})
