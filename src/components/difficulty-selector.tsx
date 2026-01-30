import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type Difficulty = "Normal" | "Heroic" | "Mythic"

interface DifficultySelectorProps {
    current: Difficulty
    onSelect: (diff: Difficulty) => void
    className?: string
}

export function DifficultySelector({ current, onSelect, className }: DifficultySelectorProps) {
    const difficulties: Difficulty[] = ["Normal", "Heroic", "Mythic"]

    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Difficulty</div>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 w-fit">
                {difficulties.map((diff) => (
                    <button
                        key={diff}
                        onClick={() => onSelect(diff)}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            current === diff
                                ? diff === "Mythic"
                                    ? "bg-purple-900/50 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                                    : diff === "Heroic"
                                        ? "bg-green-900/50 text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                                        : "bg-blue-900/50 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
                        )}
                    >
                        {diff}
                    </button>
                ))}
            </div>
        </div>
    )
}
