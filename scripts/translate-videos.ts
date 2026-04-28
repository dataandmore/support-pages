/**
 * One-time script to:
 * 1. Fix English typos in video titles/descriptions
 * 2. Translate all sv/da/de VideoTranslation rows into proper Swedish/Danish/German
 *
 * Run: DATABASE_URL="postgresql://..." npx tsx scripts/translate-videos.ts
 */

import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

interface Update {
  id: string
  title: string
  description: string | null
}

// ─── English typo fixes (applied to ALL locales) ─────────────────────────────

const TITLE_FIXES: [RegExp, string][] = [
  [/^Introduciotn to D\/M PP$/, "Introduction to the D&M Privacy Platform"],
  [/^Personal Accoutn Deletion tool$/, "Personal Account Deletion Tool"],
  [/^Product \|\s{2,}Data Minimization Manager Overview$/, "Product | Data Minimization Manager Overview"],
  [/^global admin$/, "Global Admin"],
]

// ─── Translations by title (after English fixes are applied) ─────────────────

type Locale = "sv" | "da" | "de"

const translations: Record<Locale, Record<string, { title: string; description: string | null }>> = {
  sv: {
    "Data Minimization Manager Overview": {
      title: "Översikt över Data Minimization Manager",
      description: "Lär dig hur Data Minimization Manager låter dig definiera datapolicyer och lagringsregler, och automatiskt hanterar icke-kompatibla dokument som innehåller löneinformation, jobbansökningar, GDPR artikel 9-data och annat känsligt innehåll.",
    },
    "Privacy Manager Setup Guide": {
      title: "Installationsguide för Privacy Manager",
      description: "Steg-för-steg-guide för installation av Data & More Privacy Manager — som täcker installation, källanslutning och initial konfiguration för att komma igång med din efterlevnadsövervakning.",
    },
    "Privacy Platform": {
      title: "Privacy Platform",
      description: "En översikt av den kompletta Data & More Privacy Platform, som visar hur den automatiskt identifierar känsliga och personliga uppgifter i Exchange, SharePoint, OneDrive, filresurser och mer.",
    },
    "PrivacyMonitor | Dashboard": {
      title: "PrivacyMonitor | Instrumentpanel",
      description: null,
    },
    "Introduction to the D&M Privacy Platform": {
      title: "Introduktion till Data & More Privacy Platform",
      description: "En introduktion till Data & More Privacy Platform — vad den gör, hur den fungerar och varför det är viktigt att skydda ostrukturerade personuppgifter i din organisation för GDPR-efterlevnad.",
    },
    "Product | Data Minimization Manager Overview": {
      title: "Produkt | Översikt över Data Minimization Manager",
      description: "Lär dig hur Data Minimization Manager låter dig definiera datapolicyer och lagringsregler, och automatiskt hanterar icke-kompatibla dokument i hela din Microsoft 365-miljö.",
    },
    "DataSubject Manager™": {
      title: "DataSubject Manager™",
      description: "En guide till DataSubject Manager™ — som gör det möjligt för din organisation att effektivt hantera GDPR-registerutdrag genom att omedelbart lokalisera alla personuppgifter i anslutna datakällor.",
    },
    "CoPilot Privacy Protection": {
      title: "CoPilot Privacy Protection",
      description: "Upptäck hur Data & More skyddar din Microsoft Copilot-installation genom att säkerställa att AI bara har tillgång till data den har behörighet att se — och förhindrar att känsliga personuppgifter exponeras i Copilot-svar.",
    },
    "Personal Account Deletion Tool": {
      title: "Verktyg för personlig kontoborttagning",
      description: "Hur du använder verktyget för personlig kontoborttagning för att låta enskilda medarbetare granska och radera sina egna icke-kompatibla personuppgifter — vilket minskar DPO:ns arbetsbelastning och ger medarbetarna kontroll över rensningsprocessen.",
    },
    "Mastering Privacy with the Personal Data Deletion Tool": {
      title: "Bemästra integritetsskydd med verktyget för personlig databorttagning",
      description: "Bästa praxis för att rulla ut verktyget för personlig databorttagning i din organisation — som ger medarbetarna möjlighet att ta ansvar för sin egen datahygien med minimalt IT-engagemang.",
    },
    "Data Privacy Classification": {
      title: "Klassificering av dataintegritet",
      description: "En djupdykning i Data & Mores automatiska dataklassificeringsmotor, som använder en kombination av taxonomier, RegEx och Natural Language Processing (NLP) för att identifiera och märka känsliga personuppgifter enligt GDPR och interna policyer.",
    },
  },

  da: {
    "Data Minimization Manager Overview": {
      title: "Oversigt over Data Minimization Manager",
      description: "Lær hvordan Data Minimization Manager lader dig definere datapolitikker og opbevaringsregler, og automatisk håndterer ikke-kompatible dokumenter med lønoplysninger, jobansøgninger, GDPR artikel 9-data og andet følsomt indhold.",
    },
    "Privacy Manager Setup Guide": {
      title: "Opsætningsguide til Privacy Manager",
      description: "Trin-for-trin opsætningsguide til Data & More Privacy Manager — dækkende installation, kildetilslutning og indledende konfiguration for at komme i gang med din compliance-overvågning.",
    },
    "Privacy Platform": {
      title: "Privacy Platform",
      description: "En oversigt over den fulde Data & More Privacy Platform, der viser hvordan den automatisk identificerer følsomme og personlige data på tværs af Exchange, SharePoint, OneDrive, fildrev og mere.",
    },
    "PrivacyMonitor | Dashboard": {
      title: "PrivacyMonitor | Dashboard",
      description: null,
    },
    "Introduction to the D&M Privacy Platform": {
      title: "Introduktion til Data & More Privacy Platform",
      description: "En introduktion til Data & More Privacy Platform — hvad den gør, hvordan den virker, og hvorfor det er vigtigt at beskytte ustrukturerede persondata på tværs af din organisation for GDPR-overholdelse.",
    },
    "Product | Data Minimization Manager Overview": {
      title: "Produkt | Oversigt over Data Minimization Manager",
      description: "Lær hvordan Data Minimization Manager lader dig definere datapolitikker og opbevaringsregler, og automatisk håndterer ikke-kompatible dokumenter på tværs af hele dit Microsoft 365-miljø.",
    },
    "DataSubject Manager™": {
      title: "DataSubject Manager™",
      description: "En guide til DataSubject Manager™ — der gør det muligt for din organisation effektivt at besvare GDPR-anmodninger om registerindsigt ved øjeblikkeligt at lokalisere alle persondata i tilsluttede datakilder.",
    },
    "CoPilot Privacy Protection": {
      title: "CoPilot Privacy Protection",
      description: "Opdag hvordan Data & More beskytter din Microsoft Copilot-installation ved at sikre, at AI kun har adgang til data, den har tilladelse til at se — og forhindrer følsomme persondata i at blive vist i Copilot-svar.",
    },
    "Personal Account Deletion Tool": {
      title: "Værktøj til personlig kontosletning",
      description: "Sådan bruger du værktøjet til personlig kontosletning, der lader den enkelte medarbejder gennemgå og slette sine egne ikke-kompatible persondata — hvilket reducerer DPO'ens arbejdsbyrde og giver medarbejderne kontrol over oprydningsprocessen.",
    },
    "Mastering Privacy with the Personal Data Deletion Tool": {
      title: "Mestring af privatlivsbeskyttelse med værktøjet til personlig datasletning",
      description: "Bedste praksis for udrulning af værktøjet til personlig datasletning i din organisation — der giver medarbejderne mulighed for at tage ansvar for deres egen datahygiejne med minimal IT-involvering.",
    },
    "Data Privacy Classification": {
      title: "Klassificering af dataprivathed",
      description: "Et dybt dyk ned i Data & Mores automatiske dataklassificeringsmotor, der bruger en kombination af taksonomier, RegEx og Natural Language Processing (NLP) til at identificere og mærke følsomme persondata i henhold til GDPR og interne politikker.",
    },
    "D&M for Purview": {
      title: "D&M til Purview",
      description: null,
    },
  },

  de: {
    "Data Minimization Manager Overview": {
      title: "Überblick über den Data Minimization Manager",
      description: "Erfahren Sie, wie der Data Minimization Manager Ihnen ermöglicht, Datenrichtlinien und Aufbewahrungsregeln zu definieren und nicht-konforme Dokumente mit Gehaltsinformationen, Bewerbungen, DSGVO-Artikel-9-Daten und anderen sensiblen Inhalten automatisch zu verarbeiten.",
    },
    "Privacy Manager Setup Guide": {
      title: "Einrichtungsanleitung für den Privacy Manager",
      description: "Schritt-für-Schritt-Einrichtungsanleitung für den Data & More Privacy Manager — umfasst Installation, Quellenverbindung und Erstkonfiguration, um Ihre Compliance-Überwachung in Betrieb zu nehmen.",
    },
    "Privacy Platform": {
      title: "Privacy Platform",
      description: "Ein Überblick über die vollständige Data & More Privacy Platform, der zeigt, wie sie automatisch sensible und personenbezogene Daten in Exchange, SharePoint, OneDrive, Dateifreigaben und mehr identifiziert.",
    },
    "PrivacyMonitor | Dashboard": {
      title: "PrivacyMonitor | Dashboard",
      description: null,
    },
    "Introduction to the D&M Privacy Platform": {
      title: "Einführung in die Data & More Privacy Platform",
      description: "Eine Einführung in die Data & More Privacy Platform — was sie leistet, wie sie funktioniert und warum der Schutz unstrukturierter personenbezogener Daten in Ihrer Organisation für die DSGVO-Konformität wichtig ist.",
    },
    "Product | Data Minimization Manager Overview": {
      title: "Produkt | Überblick über den Data Minimization Manager",
      description: "Erfahren Sie, wie der Data Minimization Manager Ihnen ermöglicht, Datenrichtlinien und Aufbewahrungsregeln zu definieren und nicht-konforme Dokumente in Ihrer gesamten Microsoft 365-Umgebung automatisch zu verarbeiten.",
    },
    "DataSubject Manager™": {
      title: "DataSubject Manager™",
      description: "Ein Leitfaden zum DataSubject Manager™ — der es Ihrer Organisation ermöglicht, DSGVO-Auskunftsanfragen effizient zu beantworten, indem alle gespeicherten personenbezogenen Daten in verbundenen Datenquellen sofort lokalisiert werden.",
    },
    "CoPilot Privacy Protection": {
      title: "CoPilot Privacy Protection",
      description: "Erfahren Sie, wie Data & More Ihre Microsoft Copilot-Bereitstellung schützt, indem sichergestellt wird, dass KI nur auf Daten zugreift, auf die sie zugreifen darf — und verhindert, dass sensible personenbezogene Daten in Copilot-Antworten auftauchen.",
    },
    "Personal Account Deletion Tool": {
      title: "Tool zur persönlichen Kontolöschung",
      description: "So verwenden Sie das Tool zur persönlichen Kontolöschung, damit einzelne Mitarbeiter ihre eigenen nicht-konformen personenbezogenen Daten überprüfen und löschen können — was die Arbeitslast des DSB reduziert und die Mitarbeiter im Bereinigungsprozess befähigt.",
    },
    "Mastering Privacy with the Personal Data Deletion Tool": {
      title: "Datenschutz meistern mit dem Tool zur persönlichen Datenlöschung",
      description: "Best Practices für die Einführung des Tools zur persönlichen Datenlöschung in Ihrer Organisation — damit Mitarbeiter Verantwortung für ihre eigene Datenhygiene übernehmen können, mit minimalem IT-Aufwand.",
    },
    "Data Privacy Classification": {
      title: "Klassifizierung des Datenschutzes",
      description: "Ein tiefer Einblick in die automatische Datenklassifizierungsengine von Data & More, die eine Kombination aus Taxonomien, RegEx und Natural Language Processing (NLP) verwendet, um sensible personenbezogene Daten gemäß DSGVO und internen Richtlinien zu identifizieren und zu kennzeichnen.",
    },
  },
}

async function main() {
  // Step 1: Fix English typos across ALL locales
  console.log("── Step 1: Fixing English typos ──")
  const allTranslations = await prisma.videoTranslation.findMany()

  for (const t of allTranslations) {
    let newTitle = t.title
    for (const [pattern, replacement] of TITLE_FIXES) {
      newTitle = newTitle.replace(pattern, replacement)
    }
    if (newTitle !== t.title) {
      await prisma.videoTranslation.update({
        where: { id: t.id },
        data: { title: newTitle },
      })
      console.log(`  Fixed [${t.locale}]: "${t.title}" → "${newTitle}"`)
    }
  }

  // Step 2: Translate non-English locales
  console.log("\n── Step 2: Translating sv / da / de ──")
  const nonEnglish = await prisma.videoTranslation.findMany({
    where: { locale: { in: ["sv", "da", "de"] } },
  })

  let updated = 0
  let skipped = 0

  for (const t of nonEnglish) {
    const locale = t.locale as Locale
    const localeMap = translations[locale]
    if (!localeMap) continue

    const match = localeMap[t.title]
    if (!match) {
      console.log(`  ⚠ No translation for [${locale}]: "${t.title}"`)
      skipped++
      continue
    }

    await prisma.videoTranslation.update({
      where: { id: t.id },
      data: {
        title: match.title,
        description: match.description,
      },
    })
    console.log(`  ✓ [${locale}] "${t.title}" → "${match.title}"`)
    updated++
  }

  // Step 3: Also fix English descriptions that reference the old typo titles
  console.log("\n── Step 3: Fixing English description for renamed titles ──")
  const enTypoFixes: Record<string, { title?: string; description?: string }> = {
    "Introduction to the D&M Privacy Platform": {
      description: "An introduction to the Data & More Privacy Platform — what it does, how it works, and why protecting unstructured personal data across your organization matters for GDPR compliance.",
    },
    "Personal Account Deletion Tool": {
      description: "How to use the Personal Account Deletion tool to let individual employees review and delete their own non-compliant personal data — reducing DPO workload and empowering employees in the clean-up process.",
    },
  }

  const enTranslations = await prisma.videoTranslation.findMany({ where: { locale: "en" } })
  for (const t of enTranslations) {
    const fix = enTypoFixes[t.title]
    if (fix) {
      await prisma.videoTranslation.update({
        where: { id: t.id },
        data: fix,
      })
      console.log(`  ✓ [en] Updated description for "${t.title}"`)
    }
  }

  console.log(`\nDone! Updated ${updated} translations, skipped ${skipped}.`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
