"use client"

import { User, Building2, TrendingUp, Sparkles, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface MatchCardProps {
  name: string
  type: "mentor" | "service-provider" | "startup" | "investor"
  score: number
  tags: string[]
  reasoning: string
  className?: string
}

const typeConfig = {
  mentor: {
    icon: User,
    label: "Mentor",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  "service-provider": {
    icon: Building2,
    label: "Service Provider",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  startup: {
    icon: Sparkles,
    label: "Startup",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  investor: {
    icon: TrendingUp,
    label: "Investor",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
}

export function MatchCard({
  name,
  type,
  score,
  tags,
  reasoning,
  className,
}: MatchCardProps) {
  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "p-5 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300",
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", config.bg)}>
            <Icon className={cn("w-5 h-5", config.color)} />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{name}</h4>
            <span className={cn("text-xs", config.color)}>{config.label}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Match Score</p>
            <p className="text-lg font-bold text-primary">{score}%</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 text-xs rounded-lg bg-secondary text-secondary-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className={cn("p-4 rounded-xl border", config.border, config.bg)}>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className={cn("w-4 h-4", config.color)} />
          <span className={cn("text-xs font-medium", config.color)}>
            AI Reasoning Summary
          </span>
        </div>
        <p className="text-sm text-muted-foreground italic leading-relaxed">
          {reasoning}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Connect
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 border-border hover:bg-secondary"
        >
          View Profile
        </Button>
      </div>
    </div>
  )
}
