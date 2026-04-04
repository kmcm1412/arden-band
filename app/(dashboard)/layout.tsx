import DashboardGuard from '@/components/dashboard/DashboardGuard'
import DashboardShell from '@/components/dashboard/DashboardShell'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardGuard>
      <DashboardShell>{children}</DashboardShell>
    </DashboardGuard>
  )
}
