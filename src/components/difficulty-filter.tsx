'use client'

import { useRouter, useSearchParams } from "next/navigation"
import { DifficultySelector, Difficulty } from "./difficulty-selector"

export function DifficultyFilter() {
    const searchParams = useSearchParams()
    const router = useRouter()

    // Default to 'Heroic' if not specified, or handle 'Unknown'
    const currentParam = searchParams.get('difficulty')
    const current = (currentParam || 'Heroic') as Difficulty

    const handleSelect = (diff: Difficulty) => {
        const params = new URLSearchParams(searchParams)
        params.set('difficulty', diff)
        router.push(`/?${params.toString()}`)
    }

    return (
        <DifficultySelector
            current={current}
            onSelect={handleSelect}
        />
    )
}
