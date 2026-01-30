export const CURRENT_RAID = "Liberation of Undermine";

export interface BossLoot {
    bossName: string;
    items: { id: number; name: string; slot: string }[];
}

export type RaidDifficulty = "Normal" | "Heroic" | "Mythic"

export const RAID_DATA: BossLoot[] = [
    {
        bossName: "Vexie and the Vextravaganza",
        items: [
            { id: 221001, name: "Vextravaganza Hood", slot: "Head" },
            { id: 221002, name: "Hot-Rod Long-Spurs", slot: "Feet" },
            { id: 221003, name: "Vexie's Volatile Valve", slot: "Trinket" },
        ]
    },
    {
        bossName: "Cauldron of Carnage",
        items: [
            { id: 221101, name: "Cauldron-Stirrer's Mitts", slot: "Hands" },
            { id: 221102, name: "Carnage-Splattered Cloak", slot: "Back" },
            { id: 221103, name: "Concoction of Chaos", slot: "Trinket" },
        ]
    },
    {
        bossName: "Rik Reverb",
        items: [
            { id: 221201, name: "Reverb-Resistant Leggings", slot: "Legs" },
            { id: 221202, name: "Rik's Rockin' Ring", slot: "Finger" },
            { id: 221203, name: "Sonic Boomstick", slot: "Ranged" },
        ]
    },
    {
        bossName: "Strazos the Starslayer",
        items: [
            { id: 221301, name: "Starlit Spaulders", slot: "Shoulders" },
            { id: 221302, name: "Galactic Girdle", slot: "Waist" },
            { id: 221303, name: "Cosmic Catalyst", slot: "Trinket" },
        ]
    },
    {
        bossName: "Geargrinder Grix",
        items: [
            { id: 221401, name: "Geargrinder's Gauntlets", slot: "Hands" },
            { id: 221402, name: "Grix's Greasy Goggles", slot: "Head" },
            { id: 221403, name: "Piston-Powered Polearm", slot: "Two-Hand" },
        ]
    },
    {
        bossName: "The Mugzee and the Goons",
        items: [
            { id: 221501, name: "Mugzee's Masher", slot: "One-Hand" },
            { id: 221502, name: "Goon-Squad Guard", slot: "Wrist" },
            { id: 221503, name: "Illicit Income", slot: "Trinket" },
        ]
    },
    {
        bossName: "Sprocket-Tail",
        items: [
            { id: 221601, name: "Sprocket-Linked Sabatons", slot: "Feet" },
            { id: 221602, name: "Tail-Spin Torc", slot: "Neck" },
            { id: 221603, name: "Automaton's Core", slot: "Trinket" },
        ]
    },
    {
        bossName: "Chrome-Scale",
        items: [
            { id: 221701, name: "Chrome-Plated Chestplate", slot: "Chest" },
            { id: 221702, name: "Scale-Bound Signet", slot: "Finger" },
            { id: 221703, name: "Mirror-Polished Mace", slot: "One-Hand" },
        ]
    }
];

/**
 * Formats a date as YYYY-MM-DD in local time to avoid UTC shifts
 */
function formatDate(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Calculates the current raid week string (e.g., "Week of 2026-01-27")
 * based on the most recent Tuesday.
 */
export function getCurrentRaidWeek() {
    const now = new Date();
    // Get most recent Tuesday (Day 2)
    const day = now.getDay();
    const diff = (day < 2 ? -5 : 2 - day); // If Sunday (0) -> -5, Monday (1) -> -6, Tuesday (2) -> 0...

    const tuesday = new Date(now);
    tuesday.setDate(now.getDate() + diff);
    tuesday.setHours(0, 0, 0, 0);

    return `Week of ${formatDate(tuesday)}`;
}

/**
 * Returns a list of last 4 raid weeks for tabs
 */
export function getRecentWeeks(count = 4) {
    const weeks = [];
    const current = new Date();

    // Get current Tuesday
    const day = current.getDay();
    const diff = (day < 2 ? -5 : 2 - day);
    const tuesday = new Date(current);
    tuesday.setDate(current.getDate() + diff);

    for (let i = 0; i < count; i++) {
        const d = new Date(tuesday);
        d.setDate(tuesday.getDate() - (i * 7));
        weeks.push(`Week of ${formatDate(d)}`);
    }

    return weeks;
}
