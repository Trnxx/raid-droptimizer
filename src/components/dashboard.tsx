import { supabase } from "@/lib/supabase"
import { RosterTable } from "./roster-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Skull } from "lucide-react"

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

    // Fetch roster members with all details needed
    const { data: roster } = await supabase
        .from('roster')
        .select('*')
        .order('name')

    // Fetch top upgrades (increased limit for raid-wide aggregation)
    const { data: upgrades } = await supabase
        .from('loot_upgrades')
        .select('*')
        .order('percent_increase', { ascending: false })
        .limit(200)

    // Group by Boss and calculate total value
    const bossValue: Record<string, { totalDps: number, upgradeCount: number }> = {}
    const upgradesByBoss = (upgrades as Upgrade[] || []).reduce((acc, curr) => {
        const boss = curr.boss_name || "Unknown"
        if (!acc[boss]) acc[boss] = []
        acc[boss].push(curr)

        if (!bossValue[boss]) bossValue[boss] = { totalDps: 0, upgradeCount: 0 }
        bossValue[boss].totalDps += curr.dps_increase
        bossValue[boss].upgradeCount += 1

        return acc
    }, {} as Record<string, Upgrade[]>)

    const sortedBossesByValue = Object.entries(bossValue)
        .sort(([, a], [, b]) => b.totalDps - a.totalDps)

    return (
        <div className="space-y-12">
            {/* Raid-Wide Value Summary */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold text-indigo-400">Raid-Wide Value per Boss</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedBossesByValue.length > 0 ? (
                        sortedBossesByValue.map(([boss, stats]) => (
                            <div key={boss} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center group transition-all hover:border-slate-700">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 shrink-0 group-hover:bg-slate-700 transition-colors">
                                        <Skull className="w-6 h-6 text-slate-500" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">{boss}</div>
                                        <div className="text-2xl font-bold text-white">+{Math.round(stats.totalDps).toLocaleString()} <span className="text-sm font-normal text-slate-500">DPS</span></div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 uppercase">Upgrades</div>
                                    <div className="text-lg font-bold text-indigo-400">{stats.upgradeCount}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-500 italic col-span-full">No boss data available yet.</p>
                    )}
                </div>
            </section>

            {/* Upgrades by Boss Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold text-indigo-400">Top Upgrades by Boss</h2>

                {Object.keys(upgradesByBoss).length === 0 && (
                    <p className="text-slate-500 text-center py-8">Upload a Droptimizer sim to see upgrades here.</p>
                )}

                {Object.entries(upgradesByBoss).sort().map(([boss, items]) => (
                    <div key={boss} className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center gap-3">
                            <Skull className="w-5 h-5 text-indigo-500 opacity-50" />
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

            {/* Raid Roster Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold text-indigo-400">Raid Roster</h2>
                <RosterTable roster={roster || []} />
            </section>
        </div>
    )
}
