'use client'

import { useState } from 'react'
import { processRaidbotsReport } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

export function ReportInput() {
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!url) return

        setLoading(true)
        setMsg(null)

        const result = await processRaidbotsReport(url)

        setLoading(false)
        if (result.success) {
            setMsg({ type: 'success', text: result.message || 'Report added successfully!' })
            setUrl('')
        } else {
            setMsg({ type: 'error', text: result.message || 'Something went wrong.' })
        }
    }

    return (
        <div className="w-full max-w-xl mx-auto p-6 bg-slate-900/50 border border-slate-800 rounded-xl backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">Add Droptimizer Sim</h2>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                    placeholder="https://www.raidbots.com/simbot/report/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200 focus-visible:ring-indigo-500"
                />
                <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                </Button>
            </form>
            {msg && (
                <div className={`mt-4 p-3 rounded-md text-sm ${msg.type === 'success' ? 'bg-green-900/20 text-green-300' : 'bg-red-900/20 text-red-300'}`}>
                    {msg.text}
                </div>
            )}
        </div>
    )
}
