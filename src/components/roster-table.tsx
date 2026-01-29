'use client'

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ArrowUpDown } from "lucide-react"

type RosterMember = {
    id: string
    name: string
    realm: string
    class: string
    spec: string | null
    last_dps: number | null
    last_seen_in_game: string | null
    last_sim_time: string | null
    last_sim_link: string | null
}

export function RosterTable({ roster }: { roster: RosterMember[] }) {
    const [sortConfig, setSortConfig] = useState<{ key: keyof RosterMember | 'idx'; direction: 'asc' | 'desc' } | null>(null)

    const sortedData = [...roster].sort((a, b) => {
        if (!sortConfig) return 0

        let aValue: any = sortConfig.key === 'idx' ? roster.indexOf(a) : a[sortConfig.key]
        let bValue: any = sortConfig.key === 'idx' ? roster.indexOf(b) : b[sortConfig.key]

        if (aValue === bValue) return 0
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        if (sortConfig.direction === 'asc') {
            return aValue > bValue ? 1 : -1
        } else {
            return aValue < bValue ? 1 : -1
        }
    })

    const requestSort = (key: keyof RosterMember | 'idx') => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const SortButton = ({ sortKey, label }: { sortKey: keyof RosterMember | 'idx', label: string }) => (
        <button
            onClick={() => requestSort(sortKey)}
            className="flex items-center gap-1 hover:text-white transition-colors"
        >
            {label}
            <ArrowUpDown className="w-3 h-3" />
        </button>
    )

    return (
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-950">
                    <TableRow className="border-slate-800 text-xs">
                        <TableHead className="text-slate-400">
                            <SortButton sortKey="idx" label="#" />
                        </TableHead>
                        <TableHead className="text-slate-400">
                            <SortButton sortKey="name" label="Name" />
                        </TableHead>
                        <TableHead className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                            <SortButton sortKey="realm" label="Realm" />
                        </TableHead>
                        <TableHead className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                            <SortButton sortKey="class" label="Class" />
                        </TableHead>
                        <TableHead className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                            <SortButton sortKey="spec" label="Spec" />
                        </TableHead>
                        <TableHead className="text-right text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                            <SortButton sortKey="last_dps" label="Avg DPS" />
                        </TableHead>
                        <TableHead className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                            <SortButton sortKey="last_seen_in_game" label="Last Seen" />
                        </TableHead>
                        <TableHead className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                            <SortButton sortKey="last_sim_time" label="Last Sim" />
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedData.length > 0 ? (
                        sortedData.map((r, idx) => (
                            <TableRow key={r.id} className="border-slate-800 hover:bg-slate-800/50">
                                <TableCell className="text-slate-500 font-mono text-xs">
                                    {sortConfig?.key === 'idx' ? (sortConfig.direction === 'asc' ? idx + 1 : roster.length - idx) : roster.indexOf(r) + 1}
                                </TableCell>
                                <TableCell className="font-bold text-slate-200">{r.name}</TableCell>
                                <TableCell className="text-slate-400 text-sm whitespace-nowrap">{r.realm}</TableCell>
                                <TableCell className="text-slate-400 text-sm">{r.class}</TableCell>
                                <TableCell className="text-slate-400 text-sm">{r.spec || '-'}</TableCell>
                                <TableCell className="text-right font-mono text-emerald-400">
                                    {r.last_dps ? r.last_dps.toLocaleString() : '-'}
                                </TableCell>
                                <TableCell className="text-slate-400 text-xs whitespace-nowrap">
                                    {r.last_seen_in_game ? new Date(r.last_seen_in_game).toLocaleDateString() : '-'}
                                </TableCell>
                                <TableCell className="text-slate-400 text-xs whitespace-nowrap">
                                    {r.last_sim_time ? (
                                        r.last_sim_link ? (
                                            <a
                                                href={r.last_sim_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:text-indigo-400 hover:underline flex flex-col"
                                            >
                                                <span>{new Date(r.last_sim_time).toLocaleDateString()}</span>
                                                <span className="text-[10px] opacity-70">{new Date(r.last_sim_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </a>
                                        ) : (
                                            <div className="flex flex-col">
                                                <span>{new Date(r.last_sim_time).toLocaleDateString()}</span>
                                                <span className="text-[10px] opacity-70">{new Date(r.last_sim_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        )
                                    ) : '-'}
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
    )
}
