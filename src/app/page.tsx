import { ReportInput } from '@/components/report-input'
import { Dashboard } from '@/components/dashboard'
import { AuthButton } from '@/components/auth-button'
import Link from 'next/link'
import { History } from 'lucide-react'



export const dynamic = 'force-dynamic'

import { DifficultyFilter } from '@/components/difficulty-filter'

export default async function Home(props: { searchParams: Promise<{ difficulty?: string }> }) {
  const searchParams = await props.searchParams
  const difficulty = searchParams.difficulty || 'Heroic'

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
            Unbearable Loot Manager
          </h1>
          <div className="flex flex-col items-center gap-2">
            <p className="text-lg text-slate-400">
              Aggregate Droptimizer sims to determine the best upgrades for your raid team.
            </p>
            {/* Difficulty Filter */}
            <div className="mt-4">
              <DifficultyFilter />
            </div>
          </div>
          <div className="flex justify-center pt-2">
            <Link href="/loot" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 text-sm font-medium border border-indigo-500/30 px-4 py-2 rounded-full hover:bg-indigo-500/10 transition-all">
              <History className="w-4 h-4" /> View Loot History Log
            </Link>
          </div>
        </div>

        {/* Dashboard */}
        <Dashboard difficulty={difficulty} />

      </div>
    </main>
  )
}
