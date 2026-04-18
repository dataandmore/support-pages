import { redirect } from "next/navigation"

// /[locale]/knowledge is the knowledge base root — identical to the locale
// homepage which already shows the category grid and hero search.
export default async function KnowledgePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}`)
}
