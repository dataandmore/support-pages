import { redirect } from "next/navigation"

// The article editor already handles all locale tabs (EN/DA/SV/DE) on the
// main article edit page. This route exists for deep-linking from the article
// list but simply redirects to the unified editor.
export default async function ArticleTranslationsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/admin/articles/${id}`)
}
