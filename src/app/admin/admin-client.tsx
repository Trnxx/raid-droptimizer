'use client'

import { useState, useEffect } from "react"
import { addRosterMember, addToQueue, markJobComplete, markJobFailed, removeRosterMember, refreshRosterMember, deleteJob, clearQueue, updateRosterThumbnail } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Play, Plus, Trash, Check, X, RefreshCw, ChevronDown, ChevronRight, ExternalLink, ArrowUpDown, Camera, History } from "lucide-react"
import Link from "next/link"

// Types
type RosterMember = {
    id: string
    name: string
    realm: string
    region: string
    class: string
    spec: string | null
    last_seen_in_game: string | null
    last_sim_time: string | null
    last_sim_link: string | null
    last_dps: number | null
    equipped_item_level: number | null
    last_sim_item_level: number | null
    thumbnail_url: string | null
}

type QueueItem = {
    id: string
    status: string
    roster: RosterMember
    report_link: string | null
    created_at: string
}

export function AdminDashboard({
    roster,
    queue,
    currentUserDetail
}: {
    roster: RosterMember[],
    queue: QueueItem[],
    currentUserDetail: string
}) {
    const [loading, setLoading] = useState(false)
    const [showQueue, setShowQueue] = useState(true)

    // Form State
    const [newName, setNewName] = useState("")
    const [newRealm, setNewRealm] = useState("")

    // Sorting State
    const [rosterSort, setRosterSort] = useState<{ key: keyof RosterMember | 'idx'; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' })
    const [queueSort, setQueueSort] = useState<{ key: keyof QueueItem | 'player'; direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' })

    // LISTENER FOR USERSCRIPT MESSAGES
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            if (!event.origin.includes("raidbots.com")) {
                if (event.data?.jobId) console.warn("Ignored message from weird origin:", event.origin);
                return;
            }

            const { jobId, url } = event.data
            if (jobId && url) {
                if (url.includes("/report/") || url.includes("/reports/")) {
                    console.log("Sim Success! Saving:", jobId)
                    markJobComplete(jobId, url).then(res => {
                        console.log("Mark Job Complete Result:", res)
                        if (res.message) console.log("Debug Info:", res.message)
                    })
                }
            }
        }
        window.addEventListener("message", handler)
        return () => window.removeEventListener("message", handler)
    }, [])

    // AUTO-QUEUE LOGIC for "Red" members
    useEffect(() => {
        const redMembers = roster.filter(m => {
            const status = getHealthStatus(m)
            if (status !== 'red') return false

            // Check if already in queue
            const inQueue = queue.some(q => q.roster.id === m.id && (q.status === 'pending' || q.status === 'running'))
            return !inQueue
        })

        if (redMembers.length > 0) {
            console.log(`Auto-queuing ${redMembers.length} stale/out-of-sync members...`)
            redMembers.forEach(m => {
                addToQueue(m.id).then(res => {
                    if (res.success) console.log(`Auto-queued ${m.name}`)
                })
            })
        }
    }, [roster, queue])

    const getHealthStatus = (member: RosterMember) => {
        if (!member.last_sim_time) return 'red'

        const lastSim = new Date(member.last_sim_time)
        const now = new Date()
        const diffDays = (now.getTime() - lastSim.getTime()) / (1000 * 60 * 60 * 24)

        const outOfSync = (member.equipped_item_level || 0) > (member.last_sim_item_level || 0)

        if (diffDays >= 3 || outOfSync) return 'red'
        if (diffDays >= 1) return 'yellow'
        return 'green'
    }

    const getStatusColor = (member: RosterMember) => {
        const s = getHealthStatus(member)
        if (s === 'red') return 'bg-red-500/10 border-red-500/20'
        if (s === 'yellow') return 'bg-yellow-500/10 border-yellow-500/20'
        return 'bg-emerald-500/10 border-emerald-500/20'
    }

    const getRowColor = (member: RosterMember) => {
        const s = getHealthStatus(member)
        if (s === 'red') return 'hover:bg-red-500/5'
        if (s === 'yellow') return 'hover:bg-yellow-500/5'
        return 'hover:bg-emerald-500/5'
    }

    const sortedRoster = [...roster].sort((a, b) => {
        if (!rosterSort) return 0
        let aVal: any = rosterSort.key === 'idx' ? roster.indexOf(a) : a[rosterSort.key]
        let bVal: any = rosterSort.key === 'idx' ? roster.indexOf(b) : b[rosterSort.key]
        if (aVal === bVal) return 0
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1
        return rosterSort.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
    })

    const sortedQueue = [...queue].sort((a, b) => {
        if (!queueSort) return 0
        let aVal: any = queueSort.key === 'player' ? (a.roster?.name || "") : a[queueSort.key]
        let bVal: any = queueSort.key === 'player' ? (b.roster?.name || "") : b[queueSort.key]
        if (aVal === bVal) return 0
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1
        return queueSort.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
    })

    const requestRosterSort = (key: keyof RosterMember | 'idx') => {
        let direction: 'asc' | 'desc' = 'asc'
        if (rosterSort && rosterSort.key === key && rosterSort.direction === 'asc') direction = 'desc'
        setRosterSort({ key, direction })
    }

    const requestQueueSort = (key: keyof QueueItem | 'player') => {
        let direction: 'asc' | 'desc' = 'asc'
        if (queueSort && queueSort.key === key && queueSort.direction === 'asc') direction = 'desc'
        setQueueSort({ key, direction })
    }

    const SortBtn = ({ sortKey, label, current, onSort }: { sortKey: any, label: string, current: any, onSort: (k: any) => void }) => (
        <button onClick={() => onSort(sortKey)} className="flex items-center gap-1 hover:text-white transition-colors">
            {label} <ArrowUpDown className={`w-3 h-3 ${current?.key === sortKey ? 'text-indigo-400' : 'opacity-30'}`} />
        </button>
    )

    const handleAdd = async () => {
        setLoading(true)
        const formData = new FormData()
        formData.append("name", newName)
        formData.append("realm", newRealm)
        const res = await addRosterMember(formData)
        if (!res.success) alert("Error adding member: " + res.message)
        setNewName("")
        setNewRealm("")
        setLoading(false)
    }

    const toSlug = (str: string | null | undefined) => {
        if (!str) return ""
        return str.toLowerCase().replace(/'/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
    }

    const handleRunAll = () => {
        const pending = queue.filter(q => q.status === 'pending')
        if (pending.length === 0) {
            alert("No pending jobs in queue.")
            return
        }
        if (!confirm(`This will open ${pending.length} new tabs. Allow popups!`)) return
        pending.forEach(job => {
            const realmSlug = toSlug(job.roster.realm)
            const targetName = job.id
            const url = `https://www.raidbots.com/simbot/quick?region=${job.roster.region}&realm=${realmSlug}&name=${job.roster.name}`
            window.open(url, targetName)
        })
    }

    const handleRunSingle = (job: QueueItem) => {
        const realmSlug = toSlug(job.roster.realm)
        const targetName = job.id
        const url = `https://www.raidbots.com/simbot/quick?region=${job.roster.region}&realm=${realmSlug}&name=${job.roster.name}`
        window.open(url, targetName)
    }

    const handleClearQueue = async () => {
        if (confirm("Are you sure you want to clear the entire queue (except running jobs)?")) {
            const res = await clearQueue()
            if (!res?.success) alert(res?.message || "Failed to clear queue")
        }
    }

    const handleThumbnailUpdate = async (rosterId: string) => {
        const choice = prompt("Type 'URL' to paste a link/emoji, or 'UPLOAD' to select a file:")?.toUpperCase()

        if (choice === 'URL') {
            const url = prompt("Paste your image URL or Discord emoji link:")
            if (url) {
                const res = await updateRosterThumbnail(rosterId, url)
                if (res.success) alert("Thumbnail updated!")
                else alert("Error: " + res.message)
            }
        } else if (choice === 'UPLOAD') {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) {
                    const res = await updateRosterThumbnail(rosterId, file)
                    if (res.success) alert("Thumbnail uploaded!")
                    else alert("Error: " + res.message)
                }
            }
            input.click()
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-'
        const d = new Date(dateStr)
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="text-emerald-400">●</span> Operational
                </h2>
                <div className="text-sm text-slate-400 mb-6 flex justify-between items-center">
                    <div>Logged in as: <span className="text-white">{currentUserDetail}</span></div>
                    <Link href="/admin/loot">
                        <Button variant="outline" size="sm" className="gap-2">
                            <History className="w-4 h-4" /> Manage Loot History
                        </Button>
                    </Link>
                </div>
            </div>

            {/* ROSTER MANAGEMENT */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
                <h3 className="text-lg font-bold mb-4">Roster Management</h3>

                <div className="flex gap-2 mb-6">
                    <Input placeholder="Character Name" value={newName} onChange={e => setNewName(e.target.value)} className="bg-slate-950 border-slate-700" />
                    <Input placeholder="Realm (e.g. Mal'Ganis)" value={newRealm} onChange={e => setNewRealm(e.target.value)} className="bg-slate-950 border-slate-700" />
                    <Button onClick={handleAdd} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : <Plus className="w-4 h-4" />} Add
                    </Button>
                </div>

                <div className="border border-slate-800 rounded-md overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950 text-slate-400">
                            <tr>
                                <th className="p-3 w-12"><SortBtn sortKey="idx" label="#" current={rosterSort} onSort={requestRosterSort} /></th>
                                <th className="p-3"><SortBtn sortKey="name" label="Name" current={rosterSort} onSort={requestRosterSort} /></th>
                                <th className="p-3"><SortBtn sortKey="realm" label="Realm" current={rosterSort} onSort={requestRosterSort} /></th>
                                <th className="p-3"><SortBtn sortKey="class" label="Class" current={rosterSort} onSort={requestRosterSort} /></th>
                                <th className="p-3"><SortBtn sortKey="spec" label="Spec" current={rosterSort} onSort={requestRosterSort} /></th>
                                <th className="p-3"><SortBtn sortKey="equipped_item_level" label="iLvl" current={rosterSort} onSort={requestRosterSort} /></th>
                                <th className="p-3"><SortBtn sortKey="last_dps" label="Avg DPS" current={rosterSort} onSort={requestRosterSort} /></th>
                                <th className="p-3"><SortBtn sortKey="last_seen_in_game" label="Last Seen" current={rosterSort} onSort={requestRosterSort} /></th>
                                <th className="p-3"><SortBtn sortKey="last_sim_time" label="Last Sim" current={rosterSort} onSort={requestRosterSort} /></th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {sortedRoster.map((r, index) => {
                                const status = getHealthStatus(r);
                                const statusClass =
                                    status === 'red' ? 'text-red-400' :
                                        status === 'yellow' ? 'text-yellow-400' :
                                            'text-emerald-400';

                                return (
                                    <tr key={r.id} className={`transition-colors ${getRowColor(r)}`}>
                                        <td className="p-3 text-slate-500 text-xs font-mono">{roster.indexOf(r) + 1}</td>
                                        <td className={`p-3 font-medium flex items-center gap-3 ${statusClass}`}>
                                            <div className="relative group cursor-pointer" onClick={() => handleThumbnailUpdate(r.id)}>
                                                {r.thumbnail_url ? (
                                                    <img src={r.thumbnail_url} alt={r.name} className="w-8 h-8 rounded-full object-cover border border-slate-700 shadow-sm" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-bold uppercase">
                                                        {r.name.substring(0, 2)}
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <Camera className="w-3 h-3 text-white" />
                                                </div>
                                            </div>
                                            <span>{r.name}</span>
                                        </td>
                                        <td className="p-3 text-slate-400">{r.realm}</td>
                                        <td className="p-3 text-slate-400">{r.class}</td>
                                        <td className="p-3 text-slate-400">{r.spec || '-'}</td>
                                        <td className="p-3 text-slate-200 font-mono">{r.equipped_item_level || '-'}</td>
                                        <td className={`p-3 font-mono text-right ${statusClass}`}>
                                            {r.last_dps ? r.last_dps.toLocaleString() : '-'}
                                        </td>
                                        <td className="p-3 text-slate-500 text-xs whitespace-nowrap">
                                            {formatDate(r.last_seen_in_game)}
                                        </td>
                                        <td className="p-3 text-slate-500 text-xs whitespace-nowrap">
                                            {r.last_sim_time ? (
                                                r.last_sim_link ? (
                                                    <a href={r.last_sim_link} target="_blank" className="text-indigo-400 hover:underline flex items-center gap-1">
                                                        {formatDate(r.last_sim_time)} <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                ) : (
                                                    <span>{formatDate(r.last_sim_time)}</span>
                                                )
                                            ) : 'Never'}
                                            {r.last_sim_item_level && (
                                                <div className="text-[10px] text-slate-600">Simmed at {r.last_sim_item_level}</div>
                                            )}
                                        </td>
                                        <td className="p-3 text-right flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={async () => {
                                                if (confirm("Refresh from Armory?")) await refreshRosterMember(r.id)
                                            }}>
                                                <RefreshCw className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="secondary" onClick={async () => {
                                                const res = await addToQueue(r.id)
                                                if (!res?.success) alert(res?.message || "Error queuing sim")
                                            }}>
                                                Queue Sim
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={async () => {
                                                if (confirm("Remove " + r.name + " from database?")) await removeRosterMember(r.id)
                                            }}>
                                                <Trash className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* QUEUE */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
                <Button variant="ghost" className="p-0 hover:bg-transparent w-full flex justify-between items-center mb-4" onClick={() => setShowQueue(!showQueue)}>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        {showQueue ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        Sim Queue ({queue.length})
                    </h3>
                </Button>

                {showQueue && (
                    <>
                        <div className="flex justify-end gap-2 mb-4">
                            <Button onClick={handleClearQueue} variant="destructive" size="sm">
                                <Trash className="w-4 h-4 mr-2" /> Clear Queue
                            </Button>
                            <Button onClick={handleRunAll} className="bg-indigo-600 hover:bg-indigo-500" size="sm">
                                <Play className="w-4 h-4 mr-2" /> Run All Pending
                            </Button>
                        </div>

                        <div className="border border-slate-800 rounded-md overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950 text-slate-400">
                                    <tr>
                                        <th className="p-3"><SortBtn sortKey="status" label="Status" current={queueSort} onSort={requestQueueSort} /></th>
                                        <th className="p-3"><SortBtn sortKey="player" label="Character" current={queueSort} onSort={requestQueueSort} /></th>
                                        <th className="p-3"><SortBtn sortKey="created_at" label="Queued At" current={queueSort} onSort={requestQueueSort} /></th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {sortedQueue.map(q => (
                                        <tr key={q.id}>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${q.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                                    q.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                                        'bg-red-500/10 text-red-500'
                                                    }`}>
                                                    {q.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-3 font-medium text-slate-200">
                                                {q.roster ? `${q.roster.name}-${q.roster.realm}` : 'Unknown'}
                                            </td>
                                            <td className="p-3 text-slate-400">
                                                {formatDate(q.created_at)}
                                            </td>
                                            <td className="p-3 text-right flex justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => handleRunSingle(q)}>
                                                    <Play className="w-3 h-3" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-green-400" onClick={() => {
                                                    const url = prompt("Paste Report URL to complete:")
                                                    if (url) markJobComplete(q.id, url)
                                                }}>
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-red-400" onClick={async () => {
                                                    await deleteJob(q.id)
                                                }}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {queue.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-slate-500">Queue is empty</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
