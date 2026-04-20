import { describe, it, expect } from "vitest"
import { isValidLocale, locales, localeNames, localeFlags } from "@/lib/i18n"

describe("isValidLocale", () => {
  it("accepts all 4 supported locales", () => {
    expect(isValidLocale("en")).toBe(true)
    expect(isValidLocale("da")).toBe(true)
    expect(isValidLocale("sv")).toBe(true)
    expect(isValidLocale("de")).toBe(true)
  })

  it("rejects unknown locale strings", () => {
    expect(isValidLocale("fr")).toBe(false)
    expect(isValidLocale("")).toBe(false)
    expect(isValidLocale("EN")).toBe(false)
    expect(isValidLocale("english")).toBe(false)
  })
})

describe("locales array", () => {
  it("contains exactly 4 locales", () => {
    expect(locales).toHaveLength(4)
    expect(locales).toContain("en")
    expect(locales).toContain("da")
    expect(locales).toContain("sv")
    expect(locales).toContain("de")
  })
})

describe("localeNames", () => {
  it("has a display name for every locale", () => {
    for (const locale of locales) {
      expect(localeNames[locale]).toBeTruthy()
      expect(typeof localeNames[locale]).toBe("string")
    }
  })
})

describe("localeFlags", () => {
  it("has a flag emoji for every locale", () => {
    for (const locale of locales) {
      expect(localeFlags[locale]).toBeTruthy()
    }
  })
})
