import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { AdminDashboard } from './admin-client'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/')
    }

    const meta = user.user_metadata
    // Hardcoded check
    const isAdmin = (
        meta.full_name === "dan.s." ||
        meta.name === "dan.s." ||
        meta.preferred_username === "dan.s." ||
        meta.user_name === "dan.s." ||
        meta.custom_claims?.global_name === "dan.s." // Discord sometimes uses global_name
    )

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-950 text-red-500 p-20 flex flex-col items-center">
                <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
                <p className="text-slate-400">You are logged in as:</p>
                <div className="bg-slate-900 p-4 rounded mt-4 font-mono text-sm max-w-lg overflow-auto">
                    {JSON.stringify(meta, null, 2)}
                </div>
                <p className="mt-8 text-slate-500">Contact the system administrator.</p>
            </div>
        )
    }

    // Fetch Data
    const { data: roster } = await supabase.from('roster').select('*').order('name')
    const { data: queue } = await supabase.from('sim_queue').select('*, roster(*)').order('created_at', { ascending: false })

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
                <AdminDashboard
                    roster={roster || []}
                    queue={queue || []}
                    currentUserDetail={meta.full_name || meta.username || "Admin"}
                />
            </div>
        </main>
    )
}
