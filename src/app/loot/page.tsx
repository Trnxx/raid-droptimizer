import { getLootHistory } from "../admin/actions";
import { getRecentWeeks } from "@/lib/raid-data";
import { RAID_DATA } from "@/lib/raid-data";
import { Skull, User, Package, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function LootPage(props: { searchParams: Promise<{ week?: string }> }) {
    const searchParams = await props.searchParams;
    const weeks = getRecentWeeks(6); // Show last 6 weeks
    const currentWeek = searchParams.week || weeks[0];
    const history = await getLootHistory(currentWeek);

    // Group history by boss for easy display
    const lootByBoss = history.reduce((acc: any, curr: any) => {
        if (!acc[curr.boss_name]) acc[curr.boss_name] = [];
        acc[curr.boss_name].push(curr);
        return acc;
    }, {});

    return (
        <main className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-4">
                        <Link href="/" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-sm font-medium transition-colors w-fit">
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </Link>
                        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600">
                            Loot History
                        </h1>
                        <p className="text-slate-500 mt-2">Historical gear assignments by raid week.</p>
                    </div>
                </div>

                {/* Week Selection Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-900">
                    {weeks.map(w => (
                        <Link
                            key={w}
                            href={`?week=${encodeURIComponent(w)}`}
                            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${currentWeek === w
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                                }`}
                        >
                            {w.replace('Week of ', '')}
                        </Link>
                    ))}
                </div>

                {/* Boss List */}
                <div className="grid grid-cols-1 gap-8">
                    {RAID_DATA.map(boss => {
                        const bossLoot = lootByBoss[boss.bossName] || [];
                        return (
                            <section key={boss.bossName} className="space-y-4">
                                <div className="flex items-center gap-3 border-l-4 border-indigo-500 pl-4 py-1">
                                    <div className="w-10 h-10 bg-slate-900 rounded border border-slate-800 flex items-center justify-center">
                                        <Skull className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-100">{boss.bossName}</h2>
                                    <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">
                                        {bossLoot.length} Items Dropped
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {bossLoot.length > 0 ? (
                                        bossLoot.map((item: any) => (
                                            <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 hover:border-slate-700 transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden border border-slate-700">
                                                    {item.roster?.thumbnail_url ? (
                                                        <img src={item.roster.thumbnail_url} alt={item.roster.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-5 h-5 text-slate-600" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs text-slate-500 flex items-center gap-1 uppercase tracking-tighter">
                                                        <Package className="w-3 h-3" /> {item.item_name}
                                                    </div>
                                                    <div className="font-bold text-indigo-400 truncate">
                                                        {item.roster?.name || "Unknown"}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full border border-dashed border-slate-800 rounded-xl py-6 text-center text-slate-600 italic text-sm">
                                            No loot recorded for this boss this week.
                                        </div>
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
