import { ReportInput } from '@/components/report-input'
import { Dashboard } from '@/components/dashboard'
import { AuthButton } from '@/components/auth-button'



export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      {/* Top Bar */}
      <div className="absolute top-4 right-8">
        <AuthButton />
      </div>

      <div className="max-w-4xl mx-auto space-y-12">

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-indigo-400">
            Raid Loot Analyzer
          </h1>
          <p className="text-lg text-slate-400">
            Aggregate Droptimizer sims to determine the best upgrades for your raid team.
          </p>
        </div>

        {/* Action Section */}
        <ReportInput />

        {/* Dashboard */}
        <Dashboard />

      </div>
    </main>
  )
}
