import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/admin/Sidebar"
import { AdminHeader } from "@/components/admin/AdminHeader"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/en/login")

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar role={session.user.role ?? "EDITOR"} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          userName={session.user.name ?? ""}
          userEmail={session.user.email ?? ""}
          userImage={session.user.image ?? undefined}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
