'use client'

import { useState } from "react"
import { RAID_DATA, getCurrentRaidWeek, getRecentWeeks } from "@/lib/raid-data"
import { assignLoot, unassignLoot } from "../actions"
import { Button } from "@/components/ui/button"
import { Skull, Package, User, Plus, Trash2, ArrowRight, X } from "lucide-react"
import { DifficultySelector, Difficulty } from "@/components/difficulty-selector"

type Member = {
    id: string
    name: string
    thumbnail_url: string | null
}

type Assignment = {
    id: string
    roster_id: string
    boss_name: string
    item_name: string
    raid_week: string
    difficulty: string
    roster: { name: string }
}

export function LootManager({ roster, existingHistory }: { roster: Member[], existingHistory: Assignment[] }) {
    const weeks = getRecentWeeks(6)
    const [currentWeek, setCurrentWeek] = useState(weeks[0])
    const [selectedBoss, setSelectedBoss] = useState(RAID_DATA[0].bossName)
    const [difficulty, setDifficulty] = useState<Difficulty>("Heroic")
    const [assigningItemId, setAssigningItemId] = useState<number | null>(null)

    const historyForWeek = existingHistory.filter(h => h.raid_week === currentWeek && h.difficulty === difficulty)
    const currentBossData = RAID_DATA.find(b => b.bossName === selectedBoss)

    const handleAssign = async (memberId: string, itemName: string, itemId: number) => {
        const res = await assignLoot(memberId, selectedBoss, itemName, itemId, currentWeek, difficulty)
        if (!res.success) alert(res.message)
        else {
            setAssigningItemId(null)
        }
    }

    const handleUnassign = async (id: string) => {
        if (confirm("Remove this loot record?")) {
            await unassignLoot(id)
        }
    }

    return (
        <div className="space-y-8">
            {/* Week Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-800">
                {weeks.map(w => (
                    <button
                        key={w}
                        onClick={() => setCurrentWeek(w)}
                        className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${currentWeek === w
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                            }`}
                    >
                        {w.replace('Week of ', '')}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Boss Selector */}
                <div className="lg:col-span-1 space-y-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Select Boss</h3>
                    {RAID_DATA.map(b => (
                        <button
                            key={b.bossName}
                            onClick={() => setSelectedBoss(b.bossName)}
                            className={`w-full text-left p-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-all ${selectedBoss === b.bossName
                                ? 'bg-indigo-600/20 border border-indigo-500/50 text-indigo-300'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700'
                                }`}
                        >
                            <Skull className={`w-4 h-4 ${selectedBoss === b.bossName ? 'text-indigo-400' : 'text-slate-600'}`} />
                            {b.bossName}
                        </button>
                    ))}
                </div>

                {/* Loot Assignment Area */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <Package className="w-5 h-5 text-indigo-400" />
                                {selectedBoss} Loot Table
                            </h2>
                            <DifficultySelector current={difficulty} onSelect={setDifficulty} />
                        </div>
                        <div className="p-4 space-y-3">
                            {currentBossData?.items.map(item => (
                                <div key={item.id} className="space-y-3">
                                    <div className={`bg-slate-950/50 border ${assigningItemId === item.id ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'border-slate-800'} p-3 rounded-lg flex justify-between items-center group transition-all`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-900 rounded border border-slate-800 flex items-center justify-center shrink-0">
                                                <Package className="w-4 h-4 text-slate-700" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-200">{item.name}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">{item.slot}</div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={assigningItemId === item.id ? 'default' : 'secondary'}
                                            onClick={() => setAssigningItemId(assigningItemId === item.id ? null : item.id)}
                                            className="h-8 gap-1"
                                        >
                                            {assigningItemId === item.id ? (
                                                <><X className="w-3 h-3" /> Cancel</>
                                            ) : (
                                                <><Plus className="w-3 h-3" /> Assign</>
                                            )}
                                        </Button>
                                    </div>

                                    {/* Raider Selection Grid */}
                                    {assigningItemId === item.id && (
                                        <div className="bg-slate-900/40 border border-indigo-500/20 p-4 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <div className="h-[1px] bg-slate-800 flex-1"></div>
                                                Assign To
                                                <div className="h-[1px] bg-slate-800 flex-1"></div>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                {roster.map(r => (
                                                    <button
                                                        key={r.id}
                                                        onClick={() => handleAssign(r.id, item.name, item.id)}
                                                        className="flex flex-col items-center gap-2 p-2 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-indigo-500 hover:bg-slate-900 transition-all group"
                                                    >
                                                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 group-hover:scale-110 group-hover:border-indigo-500 transition-all">
                                                            {r.thumbnail_url ? (
                                                                <img src={r.thumbnail_url} alt={r.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600 font-bold uppercase bg-slate-900">
                                                                    {r.name.substring(0, 2)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-300 truncate w-full text-center">
                                                            {r.name}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Assignments for this Boss in this Week */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assignments for {currentWeek}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {historyForWeek.length > 0 ? (
                                historyForWeek.map(h => (
                                    <div key={h.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-indigo-400">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-indigo-400">{h.roster.name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    {h.boss_name} <ArrowRight className="w-3 h-3" /> {h.item_name}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleUnassign(h.id)}
                                            className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center border border-dashed border-slate-800 rounded-xl text-slate-600 italic">
                                    No loot assigned for any boss this week.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
