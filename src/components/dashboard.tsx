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

type RosterMember = {
    id: string
    name: string
    realm: string
    class: string
    spec: string | null
    last_dps: number | null
    last_seen_in_game: string | null
    last_sim_time: string | null
}

// Data Fetching Component (Server Component)
export async function Dashboard() {

    // Fetch roster members
    const { data: roster } = await supabase
        .from('roster')
        .select('*')
        .order('name')

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
        <div className="space-y-12">
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

            {/* Raid Roster Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold text-indigo-400">Raid Roster</h2>
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-950">
                            <TableRow className="border-slate-800">
                                <TableHead className="text-slate-400">#</TableHead>
                                <TableHead className="text-slate-400">Name</TableHead>
                                <TableHead className="text-slate-400">Realm</TableHead>
                                <TableHead className="text-slate-400">Class</TableHead>
                                <TableHead className="text-slate-400">Spec</TableHead>
                                <TableHead className="text-right text-slate-400">Avg DPS</TableHead>
                                <TableHead className="text-slate-400">Last Seen (Game)</TableHead>
                                <TableHead className="text-slate-400">Last Sim</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roster && roster.length > 0 ? (
                                (roster as RosterMember[]).map((r, idx) => (
                                    <TableRow key={r.id} className="border-slate-800 hover:bg-slate-800/50">
                                        <TableCell className="text-slate-500 font-mono text-xs">{idx + 1}</TableCell>
                                        <TableCell className="font-bold text-slate-200">{r.name}</TableCell>
                                        <TableCell className="text-slate-400 text-sm">{r.realm}</TableCell>
                                        <TableCell className="text-slate-400 text-sm">{r.class}</TableCell>
                                        <TableCell className="text-slate-400 text-sm">{r.spec || '-'}</TableCell>
                                        <TableCell className="text-right font-mono text-emerald-400">
                                            {r.last_dps ? r.last_dps.toLocaleString() : '-'}
                                        </TableCell>
                                        <TableCell className="text-slate-400 text-xs">
                                            {r.last_seen_in_game ? new Date(r.last_seen_in_game).toLocaleDateString() : '-'}
                                        </TableCell>
                                        <TableCell className="text-slate-400 text-xs">
                                            {r.last_sim_time ? new Date(r.last_sim_time).toLocaleDateString() : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-slate-500 italic">
                                        No roster members added yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </section>
        </div>
    )
}
