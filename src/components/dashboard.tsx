import { supabase } from "@/lib/supabase"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

// Types
type Upgrade = {
    item_name: string
    character_name: string
    boss_name: string
    percent_increase: number
    dps_increase: number
}

// Data Fetching Component (Server Component)
export async function Dashboard() {

    // Fetch latest 50 reports for roster view
    const { data: reports } = await supabase
        .from('reports')
        .select('id, title, raidbots_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

    // Fetch top upgrades (global view for now)
    const { data: upgrades } = await supabase
        .from('loot_upgrades')
        .select('*')
        .order('percent_increase', { ascending: false })
        .limit(50)

    // Group by Boss
    const upgradesByBoss = (upgrades as Upgrade[] || []).reduce((acc, curr) => {
        const boss = curr.boss_name || "Unknown"
        if (!acc[boss]) acc[boss] = []
        acc[boss].push(curr)
        return acc
    }, {} as Record<string, Upgrade[]>)

    return (
        <div className="space-y-8">
            {/* Recent Reports Section */}
            <section className="bg-slate-900/40 p-6 rounded-xl border border-slate-800">
                <h2 className="text-xl font-semibold text-slate-200 mb-4">Recent Reports</h2>
                {reports && reports.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {reports.map(r => (
                            <div key={r.id} className="text-sm bg-slate-800 px-3 py-1 rounded-full text-slate-300">
                                {r.title}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 italic">No reports uploaded yet.</p>
                )}
            </section>

            {/* Upgrades by Boss Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold text-indigo-400">Top Upgrades by Boss</h2>

                {Object.keys(upgradesByBoss).length === 0 && (
                    <p className="text-slate-500 text-center py-8">Upload a Droptimizer sim to see upgrades here.</p>
                )}

                {Object.entries(upgradesByBoss).sort().map(([boss, items]) => (
                    <div key={boss} className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800">
                            <h3 className="font-bold text-lg text-slate-100">{boss}</h3>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px] text-slate-400">Player</TableHead>
                                    <TableHead className="text-slate-400">Item</TableHead>
                                    <TableHead className="text-right text-slate-400">% Upgrade</TableHead>
                                    <TableHead className="text-right text-slate-400">DPS Gain</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, idx) => (
                                    <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/50">
                                        <TableCell className="font-medium text-slate-200">
                                            {item.character_name}
                                        </TableCell>
                                        <TableCell className="text-indigo-300">
                                            {item.item_name}
                                        </TableCell>
                                        <TableCell className="text-right text-green-400 font-bold">
                                            {item.percent_increase.toFixed(2)}%
                                        </TableCell>
                                        <TableCell className="text-right text-slate-400 font-mono">
                                            +{Math.round(item.dps_increase)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ))}
            </section>
        </div>
    )
}
