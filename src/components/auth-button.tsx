'use client'

import { createClient } from "@/lib/supabase-client"
import { Button } from "./ui/button"
import { useEffect, useState } from "react"
import { User } from "@supabase/supabase-js"
import { Loader2 } from "lucide-react"

export function AuthButton() {
    const supabase = createClient()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
            setLoading(false)
        }
        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        })
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        setUser(null)
    }

    if (loading) {
        return <Button variant="ghost" disabled><Loader2 className="w-4 h-4 animate-spin" /></Button>
    }

    return user ? (
        <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400">
                Logged in as <span className="text-indigo-400">{user.user_metadata.full_name || user.email}</span>
            </div>
            <Button onClick={handleLogout} variant="outline" className="border-slate-700 hover:bg-slate-800">
                Sign Out
            </Button>
        </div>
    ) : (
        <Button onClick={handleLogin} className="bg-[#5865F2] hover:bg-[#4752C4]">
            Login with Discord
        </Button>
    )
}
