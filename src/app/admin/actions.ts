'use server'

import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCharacterProfile } from '@/lib/blizzard'
import { revalidatePath } from 'next/cache'

// HARDCODED ADMIN CHECK
const ADMIN_DISCORD_USERNAME = "dan.s."

async function checkAdmin() {
    // Standard client checks cookies for current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    const meta = user.user_metadata
    console.log("Checking Admin User:", meta)

    const matches = (
        meta.full_name === ADMIN_DISCORD_USERNAME ||
        meta.name === ADMIN_DISCORD_USERNAME ||
        meta.preferred_username === ADMIN_DISCORD_USERNAME ||
        meta.user_name === ADMIN_DISCORD_USERNAME
    )

    return matches
}

// Bypasses RLS for Admin Actions
function getAdminDB() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        }
    )
}

export async function addRosterMember(formData: FormData) {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return { success: false, message: "Unauthorized" }

    const name = formData.get("name") as string
    const realm = formData.get("realm") as string
    const region = formData.get("region") as string || "us"

    if (!name || !realm) return { success: false, message: "Name and Realm required" }

    const supabase = getAdminDB()

    let charClass = "Unknown"
    let spec = "Unknown"
    let role = "DPS" // Default
    let lastSeen: string | null = null
    let itemLevel = 0

    console.log(`Fetching Armory for ${name}-${realm}...`)
    const armory = await getCharacterProfile(name, realm, region)

    if (armory.success && armory.data) {
        console.log("Armory Data Found:", armory.data.character_class)
        charClass = armory.data.character_class?.name || "Unknown"
        spec = armory.data.active_spec?.name || "Unknown"
        itemLevel = armory.data.equipped_item_level || 0
        if (armory.data.last_login_timestamp) {
            lastSeen = new Date(armory.data.last_login_timestamp).toISOString()
        }
    } else {
        console.error("Armory Fetch Failed:", armory.message)
    }

    // Use Admin DB to ensure we can insert even if RLS is strict
    const { error } = await supabase.from('roster').insert({
        name,
        realm,
        region,
        class: charClass,
        spec: spec,
        role: role,
        equipped_item_level: itemLevel,
        last_armory_sync: armory.success ? new Date().toISOString() : null,
        last_seen_in_game: lastSeen
    })

    if (error) return { success: false, message: error.message }

    revalidatePath('/admin')
    return { success: true, message: `Added ${name}` }
}

export async function removeRosterMember(id: string) {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return { success: false, message: "Unauthorized" }

    const supabase = getAdminDB()
    const { error } = await supabase.from('roster').delete().eq('id', id)

    if (error) return { success: false, message: error.message }

    revalidatePath('/admin')
    return { success: true }
}

export async function addToQueue(rosterId: string) {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return { success: false, message: "Unauthorized" }

    const supabase = getAdminDB()

    const { error } = await supabase.from('sim_queue').insert({
        roster_id: rosterId,
        status: 'pending'
    })

    if (error) return { success: false, message: error.message }

    revalidatePath('/admin')
    return { success: true }
}

export async function deleteJob(queueId: string) {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return { success: false, message: "Unauthorized" }

    const supabase = getAdminDB()
    const { error } = await supabase.from('sim_queue').delete().eq('id', queueId)

    if (error) return { success: false, message: error.message }

    revalidatePath('/admin')
    return { success: true }
}

export async function clearQueue() {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return { success: false, message: "Unauthorized" }

    const supabase = getAdminDB()
    // Delete all except running
    const { error } = await supabase.from('sim_queue').delete().neq('status', 'running')

    if (error) return { success: false, message: error.message }

    revalidatePath('/admin')
    return { success: true }
}

export async function markJobComplete(queueId: string, url: string) {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return { success: false, message: "Unauthorized" }

    const supabase = getAdminDB()
    const { error } = await supabase.from('sim_queue').update({
        status: 'completed',
        report_link: url,
        updated_at: new Date().toISOString()
    }).eq('id', queueId)

    if (error) return { success: false, message: error.message }

    // Fetch DPS from Raidbots
    let dps = null
    let simIlvl = null
    let debugMsg = ""

    // Extract ID
    const match = url.match(/\/report\/([a-zA-Z0-9]+)/)

    if (match && match[1]) {
        const id = match[1]
        const jsonUrl = `https://www.raidbots.com/reports/${id}/data.json`
        console.log("Fetching JSON for DPS:", jsonUrl)

        // Retry Loop
        for (let i = 0; i < 5; i++) {
            try {
                const res = await fetch(jsonUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    cache: 'no-store'
                })

                if (res.ok) {
                    const data = await res.json()
                    const player = data.sim?.players?.[0]
                    const meanDps = player?.collected_data?.dps?.mean
                    const playerIlvl = player?.equipped_item_level

                    console.log(`DPS Fetch Success (Attempt ${i + 1}):`, { meanDps, playerIlvl })
                    debugMsg = `DPS Found: ${meanDps}`

                    if (meanDps) {
                        dps = Math.round(meanDps)
                        simIlvl = playerIlvl
                        break; // Success!
                    }
                } else {
                    console.log(`DPS Fetch Attempt ${i + 1} Failed: ${res.status}`)
                    if (res.status === 404) {
                        debugMsg = `DPS Not Ready (404) - Retrying...`
                    } else {
                        debugMsg = `DPS Fetch Error: ${res.status}`
                    }
                }
            } catch (e) {
                console.error(`DPS Fetch Attempt ${i + 1} Error:`, e)
                debugMsg = `DPS Exception: ${e instanceof Error ? e.message : String(e)}`
            }

            // Wait 3 seconds before next try
            if (i < 4) await new Promise(resolve => setTimeout(resolve, 3000))
        }
    } else {
        console.error("Could not parse ID from URL:", url)
        debugMsg = "Invalid URL ID"
    }

    const { data: job } = await supabase.from('sim_queue').select('roster_id').eq('id', queueId).single()
    if (job) {
        const updateData: any = {
            last_sim_time: new Date().toISOString(),
            last_sim_link: url
        }
        if (dps) {
            updateData.last_dps = dps
        }
        if (simIlvl) {
            updateData.last_sim_item_level = simIlvl
        }

        const { error: rosterError } = await supabase.from('roster').update(updateData).eq('id', job.roster_id)
        if (rosterError) console.error("Error updating roster:", rosterError)
    }

    revalidatePath('/admin')
    return { success: true, message: "Marked Complete. " + debugMsg }
}

export async function markJobFailed(queueId: string, errorMsg: string) {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return { success: false, message: "Unauthorized" }

    const supabase = getAdminDB()
    const { error } = await supabase.from('sim_queue').update({
        status: 'failed',
        error_message: errorMsg,
        updated_at: new Date().toISOString()
    }).eq('id', queueId)

    if (error) return { success: false, message: error.message }

    revalidatePath('/admin')
    return { success: true }
}

export async function refreshRosterMember(id: string) {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return { success: false, message: "Unauthorized" }

    const supabase = getAdminDB()

    const { data: member } = await supabase.from('roster').select('*').eq('id', id).single()
    if (!member) return { success: false, message: "Member not found" }

    console.log(`Refreshing Armory for ${member.name}-${member.realm}...`)

    const armory = await getCharacterProfile(member.name, member.realm, member.region)

    if (!armory.success) {
        return { success: false, message: "Armory Error: " + armory.message }
    }

    if (!armory.data) return { success: false, message: "No data returned from Armory" }

    const charClass = armory.data.character_class?.name || "Unknown"
    const spec = armory.data.active_spec?.name || "Unknown"

    let lastSeen = member.last_seen_in_game
    let itemLevel = member.equipped_item_level
    if (armory.data.last_login_timestamp) {
        lastSeen = new Date(armory.data.last_login_timestamp).toISOString()
    }
    if (armory.data.equipped_item_level) {
        itemLevel = armory.data.equipped_item_level
    }

    const { error } = await supabase.from('roster').update({
        class: charClass,
        spec: spec,
        last_armory_sync: new Date().toISOString(),
        last_seen_in_game: lastSeen,
        equipped_item_level: itemLevel
    }).eq('id', id)

    if (error) return { success: false, message: error.message }

    revalidatePath('/admin')
    return { success: true, message: `Updated ${member.name}: ${charClass} (${spec})` }
}

export async function updateRosterThumbnail(rosterId: string, source: string | File) {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return { success: false, message: "Unauthorized" }

    const supabase = getAdminDB()
    let thumbnailUrl = ""

    if (typeof source === 'string') {
        // Source is a URL or Emoji Link
        thumbnailUrl = source
    } else {
        // Source is a File, upload to Supabase Storage
        // Note: Expects bucket "roster-thumbnails" to exist with public access
        const fileExt = source.name.split('.').pop()
        const fileName = `${rosterId}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `thumbnails/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('roster-thumbnails')
            .upload(filePath, source, {
                cacheControl: '3600',
                upsert: true
            })

        if (uploadError) return { success: false, message: "Upload failed: " + uploadError.message }

        const { data: { publicUrl } } = supabase.storage
            .from('roster-thumbnails')
            .getPublicUrl(filePath)

        thumbnailUrl = publicUrl
    }

    const { error } = await supabase.from('roster')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', rosterId)

    if (error) return { success: false, message: error.message }

    revalidatePath('/')
    revalidatePath('/admin')
    return { success: true, url: thumbnailUrl }
}

export async function assignLoot(rosterId: string, bossName: string, itemName: string, itemId: number, raidWeek: string) {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return { success: false, message: "Unauthorized" }

    const supabase = getAdminDB()

    const { error } = await supabase.from('loot_history').insert({
        roster_id: rosterId,
        raid_week: raidWeek,
        boss_name: bossName,
        item_name: itemName,
        item_id: itemId
    })

    if (error) return { success: false, message: error.message }

    // Proactively refresh armory for this raider
    // Note: User mentioned they might not equip immediately, but we try anyway
    await refreshRosterMember(rosterId)

    revalidatePath('/loot')
    revalidatePath('/admin/loot')
    return { success: true }
}

export async function unassignLoot(lootId: string) {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return { success: false, message: "Unauthorized" }

    const supabase = getAdminDB()

    const { error } = await supabase.from('loot_history').delete().eq('id', lootId)

    if (error) return { success: false, message: error.message }

    revalidatePath('/loot')
    revalidatePath('/admin/loot')
    return { success: true }
}

export async function getLootHistory(raidWeek?: string) {
    // Public action - use server client
    const supabaseClient = await createClient()
    const { data, error } = await supabaseClient
        .from('loot_history')
        .select(`
            *,
            roster:roster_id (
                name,
                class,
                thumbnail_url
            )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching loot history:", error)
        return []
    }

    if (raidWeek) {
        return (data as any[]).filter(l => l.raid_week === raidWeek)
    }

    return data
}
