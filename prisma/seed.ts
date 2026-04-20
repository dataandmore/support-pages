import { PrismaClient, Role, Locale } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

process.loadEnvFile(".env.local")

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const categories = [
  {
    slug: "getting-started",
    icon: "🚀",
    position: 0,
    isGated: false,
    translations: {
      en: { name: "Getting Started", description: "New customers, PoC/Trial, first steps" },
      da: { name: "Kom godt i gang", description: "Nye kunder, PoC/prøveperiode, første skridt" },
      sv: { name: "Kom igång", description: "Nya kunder, PoC/provperiod, första steg" },
      de: { name: "Erste Schritte", description: "Neukunden, PoC/Test, erste Schritte" },
    },
  },
  {
    slug: "it-setup-onboarding",
    icon: "🔧",
    position: 1,
    isGated: false,
    translations: {
      en: { name: "IT Setup & Onboarding", description: "For IT admins: SaaS and on-premise setup" },
      da: { name: "IT-opsætning & onboarding", description: "Til IT-administratorer: SaaS og on-premise" },
      sv: { name: "IT-installation & onboarding", description: "För IT-administratörer: SaaS och on-premise" },
      de: { name: "IT-Einrichtung & Onboarding", description: "Für IT-Admins: SaaS und On-Premise" },
    },
  },
  {
    slug: "using-the-platform",
    icon: "📊",
    position: 2,
    isGated: false,
    translations: {
      en: { name: "Using the Platform", description: "Dashboard, reports, classification, clean-up flows" },
      da: { name: "Brug af platformen", description: "Dashboard, rapporter, klassifikation, oprydningsforløb" },
      sv: { name: "Använda plattformen", description: "Dashboard, rapporter, klassificering, rensningsflöden" },
      de: { name: "Plattform nutzen", description: "Dashboard, Berichte, Klassifizierung, Bereinigungsabläufe" },
    },
  },
  {
    slug: "organisation-rollout",
    icon: "🏢",
    position: 3,
    isGated: false,
    translations: {
      en: { name: "Organisation & Roll-out", description: "Project planning, templates, meeting agendas" },
      da: { name: "Organisation & udrulning", description: "Projektplanlægning, skabeloner, mødeagendaer" },
      sv: { name: "Organisation & utrullning", description: "Projektplanering, mallar, mötesdagordningar" },
      de: { name: "Organisation & Rollout", description: "Projektplanung, Vorlagen, Tagesordnungen" },
    },
  },
  {
    slug: "security-compliance",
    icon: "🔒",
    position: 4,
    isGated: true,
    translations: {
      en: { name: "Security & Compliance", description: "Security framework, CIS 18, GDPR" },
      da: { name: "Sikkerhed & compliance", description: "Sikkerhedsramme, CIS 18, GDPR" },
      sv: { name: "Säkerhet & efterlevnad", description: "Säkerhetsramverk, CIS 18, GDPR" },
      de: { name: "Sicherheit & Compliance", description: "Sicherheitsrahmen, CIS 18, DSGVO" },
    },
  },
  {
    slug: "operations-updates",
    icon: "🔄",
    position: 5,
    isGated: false,
    translations: {
      en: { name: "Operations & Updates", description: "Release notes and maintenance" },
      da: { name: "Drift & opdateringer", description: "Udgivelsesnoter og vedligeholdelse" },
      sv: { name: "Drift & uppdateringar", description: "Versionsanteckningar och underhåll" },
      de: { name: "Betrieb & Updates", description: "Versionshinweise und Wartung" },
    },
  },
  {
    slug: "video-library",
    icon: "🎬",
    position: 6,
    isGated: false,
    translations: {
      en: { name: "Video Library", description: "All product videos, events, and introductions" },
      da: { name: "Videobibliotek", description: "Alle produktvideoer, events og introduktioner" },
      sv: { name: "Videobibliotek", description: "Alla produktvideor, evenemang och introduktioner" },
      de: { name: "Videobibliothek", description: "Alle Produktvideos, Veranstaltungen und Einführungen" },
    },
  },
]

async function main() {
  console.log("🌱 Seeding database...")

  // Admin user
  const passwordHash = await bcrypt.hash("changeme123!", 12)
  const admin = await prisma.user.upsert({
    where: { email: "dj@dataandmore.com" },
    update: {},
    create: {
      email: "dj@dataandmore.com",
      name: "David Jung",
      passwordHash,
      role: Role.ADMIN,
    },
  })
  console.log(`✅ Admin user: ${admin.email}`)

  // Categories
  for (const cat of categories) {
    const { translations, ...data } = cat
    const category = await prisma.category.upsert({
      where: { slug: data.slug },
      update: { icon: data.icon, position: data.position, isGated: data.isGated },
      create: data,
    })

    for (const [locale, t] of Object.entries(translations)) {
      await prisma.categoryTranslation.upsert({
        where: {
          categoryId_locale: {
            categoryId: category.id,
            locale: locale as Locale,
          },
        },
        update: t,
        create: {
          categoryId: category.id,
          locale: locale as Locale,
          ...t,
        },
      })
    }
    console.log(`✅ Category: ${data.slug}`)
  }

  console.log("🎉 Seed complete")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
