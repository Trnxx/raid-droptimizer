export async function getBlizzardToken() {
    const clientId = process.env.BLIZZARD_CLIENT_ID
    const clientSecret = process.env.BLIZZARD_CLIENT_SECRET

    if (!clientId || !clientSecret) return null

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    try {
        const res = await fetch("https://oauth.battle.net/token", {
            method: "POST",
            body: "grant_type=client_credentials",
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            cache: "no-store"
        })

        if (!res.ok) throw new Error("Failed into get Blizzard Token")
        const json = await res.json()
        return json.access_token as string
    } catch (e) {
        console.error("Blizzard Token Error:", e)
        return null
    }
}

export async function getCharacterProfile(name: string, realm: string, region: string = "us") {
    const token = await getBlizzardToken()
    if (!token) return { success: false, message: "Missing Blizzard Credentials" }

    // slugify realm: Mal'Ganis -> malganis
    const realmSlug = realm.toLowerCase().replace(/'/g, '').replace(/\s/g, '-')
    const nameSlug = name.toLowerCase()

    const url = `https://${region}.api.blizzard.com/profile/wow/character/${realmSlug}/${nameSlug}?namespace=profile-${region}&locale=en_US`

    try {
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        if (res.status === 404) return { success: false, message: "Character not found" }
        if (!res.ok) return { success: false, message: `Blizzard API Error: ${res.status}` }

        const json = await res.json()
        return { success: true, data: json }
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { success: false, message: "Fetch Error: " + (error as any).message }
    }
}
