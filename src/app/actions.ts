'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export type ProcessResult = {
    success: boolean
    message?: string
    reportId?: string
}

export async function processRaidbotsReport(url: string): Promise<ProcessResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // MOCK MODE
    if (url.includes("mock/report")) {
        const mockJson = {
            simbot: {
                title: "Mock Droptimizer Report",
                type: "droptimizer",
                droptimizer: {
                    plans: [
                        { name: "item_1", items: [{ name: "Void-Edged Scimitar", id: 1001, drop: "Boss A" }] },
                        { name: "item_2", items: [{ name: "Chest of the Mundane", id: 1002, drop: "Boss B" }] },
                        { name: "item_3", items: [{ name: "Trinket of Power", id: 1003, drop: "Boss A" }] }
                    ]
                }
            },
            sim: {
                players: [{ name: "TestPlayer", collected_data: { dps: { mean: 50000 } } }],
                profilesets: {
                    results: [
                        { name: "item_1", mean: 55000 }, // +10%
                        { name: "item_2", mean: 50500 }, // +1%
                        { name: "item_3", mean: 60000 }  // +20%
                    ]
                }
            }
        }

        const mockId = "mock_" + Date.now()

        const { data: insertData, error: insertError } = await supabase
            .from('reports')
            .insert({
                user_id: user?.id || null,
                raidbots_id: mockId,
                title: "Mock Report",
                raw_data: mockJson
            })
            .select()
            .single()

        if (insertError) return { success: false, message: "Mock DB Error: " + insertError.message }

        await parseAndSaveLoot(mockJson, insertData.id)
        revalidatePath('/')
        return { success: true, reportId: mockId, message: "Mock report loaded!" }
    }

    // 1. Extract Report ID from URL
    // Supported formats:
    // https://www.raidbots.com/simbot/report/k9...
    // https://www.raidbots.com/reports/k9... (sometimes)

    const reportIdRegex = /reports?\/([a-zA-Z0-9]+)/
    const match = url.match(reportIdRegex)

    if (!match || !match[1]) {
        return { success: false, message: "Invalid Raidbots URL. Could not find Report ID." }
    }

    const reportId = match[1]
    const dataUrl = `https://www.raidbots.com/simbot/report/${reportId}/data.json`

    try {
        console.log(`Fetching report: ${dataUrl}`)
        const res = await fetch(dataUrl)

        if (!res.ok) {
            return { success: false, message: `Failed to fetch data from Raidbots (Status: ${res.status})` }
        }

        const json = await res.json()

        // Validation: Is this a droptimizer report?
        const valid = !!(json.simbot && json.simbot.type === "droptimizer")
        if (!valid) {
            return { success: false, message: "This sim does not appear to be a Droptimizer report." }
        }

        // Stores the raw data to Supabase first (as backup and for parsing)
        // We expect the 'reports' table to exist.
        const { data: insertData, error: insertError } = await supabase
            .from('reports')
            .insert({
                user_id: user?.id || null,
                raidbots_id: reportId,
                title: json.simbot.title || "Untitled Report",
                raw_data: json
            })
            .select()
            .single()

        if (insertError) {
            // Handle unique constraint violation (Report already exists)
            if (insertError.code === '23505') {
                return { success: true, message: "Report already exists!", reportId }
            }
            console.error("Supabase Error:", insertError)
            return { success: false, message: "Database Error: " + insertError.message }
        }

        // Trigger parsing
        if (insertData) {
            await parseAndSaveLoot(json, insertData.id)
        }

        revalidatePath('/')
        return { success: true, reportId }

    } catch (error) {
        console.error(error)
        return { success: false, message: "Internal Server Error during processing." }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseAndSaveLoot(json: any, reportId: string) {
    const supabase = await createClient()

    // 1. Identify Baseline DPS
    const baselineDps = json.sim?.players?.[0]?.collected_data?.dps?.mean || 0
    const characterName = json.sim?.players?.[0]?.name || "Unknown"

    // 2. Map Results (SimC output structure)
    // json.sim.profilesets.results -> Array of { name: string, mean: number, ... }
    const results = json.sim?.profilesets?.results || []
    const resultsMap = new Map<string, number>()
    for (const r of results) {
        resultsMap.set(r.name, r.mean)
    }

    // 3. Iterate Plans
    // json.simbot.droptimizer.plans -> Array of { name: string, items: Array<{id: number, name: string, drop: string}> }
    const plans = json.simbot?.droptimizer?.plans || []

    // Define exact shape for insertion
    const upgradesToInsert: {
        report_id: string;
        character_name: string;
        item_name: string;
        item_id: number;
        boss_name: string;
        dps_increase: number;
        percent_increase: number;
    }[] = []

    for (const plan of plans) {
        const resultDps = resultsMap.get(plan.name)
        if (!resultDps) continue

        const dpsIncrease = resultDps - baselineDps
        // We only care about upgrades (or maybe sidegrades?) - let's keep everything > -100 DPS to be safe, or just > 0
        if (dpsIncrease <= 0) continue

        const percentIncrease = (dpsIncrease / baselineDps) * 100

        const item = plan.items?.[0]
        if (!item) continue

        // Basic "Boss" extraction heuristic
        // Droptimizer usually has 'simbot.droptimizer.sources' which maps item IDs to sources if available.
        // Or sometimes 'item.drop' text like "Raid Finder - Boss Name"
        // For now, default to "Unknown" or the 'drop' string if present.
        let bossName = "Unknown"
        if (item.drop) {
            bossName = item.drop
        }

        upgradesToInsert.push({
            report_id: reportId,
            character_name: characterName,
            item_name: item.name,
            item_id: item.id,
            boss_name: bossName,
            dps_increase: dpsIncrease,
            percent_increase: percentIncrease
        })
    }

    if (upgradesToInsert.length > 0) {
        const { error } = await supabase.from('loot_upgrades').insert(upgradesToInsert)
        if (error) console.error("Error inserting upgrades:", error)
    }
}


