
import dotenv from 'dotenv'
// Load env vars from .env.local
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase Keys in .env.local")
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function loginToSupabase() {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log("Using Service Role Key (Bypassing RLS)")
        return createClient(SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    }
    console.log("No Service Role Key found. Worker might fail to write to DB if RLS is on.")
    return supabase
}

async function runWorker() {
    const db = await loginToSupabase()
    console.log("Starting Sim Worker...")

    const browser = await puppeteer.launch({
        browser: 'firefox',
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    })

    try {
        while (true) {
            console.log("Checking queue...")
            const { data: job, error } = await db
                .from('sim_queue')
                .select('*, roster(*)')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(1)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.error("Queue Error:", error.message)
            }

            if (job) {
                console.log(`Processing Job: ${job.roster.name} (${job.roster.realm})`)
                await db.from('sim_queue').update({ status: 'running' }).eq('id', job.id)

                const page = await browser.newPage()
                const encodedRealm = encodeURIComponent(job.roster.realm)
                const encodedName = encodeURIComponent(job.roster.name)
                // Note: We navigate to 'quick' but rely on typing to ensure fields are set
                const url = `https://www.raidbots.com/simbot/quick?region=${job.roster.region}&realm=${encodedRealm}&character=${encodedName}`

                try {
                    console.log(`Navigating to ${url}...`)
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })

                    // Wait for React to hydrate
                    await new Promise(r => setTimeout(r, 2000))

                    // Fill REALM (Handle React Select Dropdown)
                    console.log("Typing Realm...")
                    try {
                        const realmInput = await page.waitForSelector('xpath///label[contains(., "Realm")]/..//input', { timeout: 5000 })
                        if (realmInput) {
                            await realmInput.type(job.roster.realm, { delay: 100 })
                            await new Promise(r => setTimeout(r, 1000))
                            await page.keyboard.press('Enter')
                        }
                    } catch (e) { console.error("Could not type Realm:", e) }

                    // Fill CHARACTER
                    console.log("Typing Character...")
                    try {
                        const charInput = await page.waitForSelector('xpath///label[contains(., "Character")]/..//input', { timeout: 5000 })
                        if (charInput) {
                            await charInput.type(job.roster.name, { delay: 100 })
                        }
                    } catch (e) { console.error("Could not type Character:", e) }

                    // Wait for UI to settle (layout shift)
                    console.log("Waiting for UI layout shift...")
                    await new Promise(r => setTimeout(r, 2000))

                    console.log("Waiting for Run button...")

                    // Try to clear any cookie banners first
                    try {
                        const cookieBtn = await page.$('button[class*="Consent"]')
                        if (cookieBtn) await cookieBtn.click()
                    } catch (e) { }

                    // Scroll to bottom to ensure button is in view
                    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

                    // Try multiple selectors
                    let runBtn = await page.$('button[class*="RunButton"]')

                    if (!runBtn) {
                        try {
                            runBtn = await page.waitForSelector('xpath///button[contains(., "Run Quick Sim")]', { timeout: 5000 })
                        } catch (e) {
                            try {
                                runBtn = await page.waitForSelector('xpath///span[contains(., "Run Quick Sim")]/..', { timeout: 5000 })
                            } catch (e) { }
                        }
                    }

                    if (runBtn) {
                        // FORCE CLICK via JS
                        console.log("Found button, clicking via JS...")
                        await page.evaluate((el: any) => el.click(), runBtn)

                        console.log("Clicked Run Sim!")
                        console.log("Waiting for Report URL...")
                        await page.waitForFunction(() => window.location.href.includes("/simbot/report/"), { timeout: 60000 * 5 })

                        const reportUrl = page.url()
                        console.log("Sim Complete! URL:", reportUrl)

                        await db.from('sim_queue').update({
                            status: 'completed',
                            report_link: reportUrl,
                            updated_at: new Date().toISOString()
                        }).eq('id', job.id)

                        await db.from('roster').update({
                            last_sim_time: new Date().toISOString(),
                            last_sim_link: reportUrl
                        }).eq('id', job.roster.id)

                    } else {
                        console.error("Run button NOT found after all attempts.")
                        throw new Error("Run button not found")
                    }
                    await page.close()

                } catch (err: any) {
                    console.error("Job Failed:", err.message)
                    await db.from('sim_queue').update({
                        status: 'failed',
                        error_message: err.message
                    }).eq('id', job.id)
                    if (!page.isClosed()) await page.close()
                }
            } else {
                console.log("Queue empty. Sleeping 10s...")
            }
            await new Promise(r => setTimeout(r, 10000))
        }
    } catch (e) {
        console.error("Worker Crashed:", e)
    } finally {
        await browser.close()
    }
}

runWorker()
