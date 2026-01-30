import { createClient } from "@/lib/supabase-server";
import { getLootHistory } from "../actions";
import { LootManager } from "./loot-manager";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default async function AdminLootPage() {
    const supabase = await createClient();

    // Fetch roster for the assignment dropdown/search
    const { data: roster } = await supabase
        .from('roster')
        .select('id, name, thumbnail_url')
        .order('name');

    // Fetch all history so the client can filter by week
    const history = await getLootHistory();

    return (
        <main className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex gap-4 mb-4">
                            <Link href="/admin" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-sm font-medium transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Back to Admin
                            </Link>
                            <Link href="/">
                                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2 h-auto py-0 px-2 border-l border-slate-800 rounded-none">
                                    <Home className="w-4 h-4" /> Back to Home
                                </Button>
                            </Link>
                        </div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600">
                            Loot Assignment
                        </h1>
                        <p className="text-slate-500 mt-1">Record items dropped and assign them to raiders.</p>
                    </div>
                </div>

                <LootManager
                    roster={roster || []}
                    existingHistory={history as any || []}
                />
            </div>
        </main>
    );
}
