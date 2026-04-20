import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/admin/Sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/en/login")

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar role={session.user.role ?? "EDITOR"} userEmail={session.user.email ?? ""} userName={session.user.name ?? ""} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
