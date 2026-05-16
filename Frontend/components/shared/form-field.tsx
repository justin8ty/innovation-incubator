"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label: string
  value?: string
  placeholder?: string
  type?: "text" | "email" | "textarea" | "select"
  options?: string[]
  status?: "auto-filled" | "required" | "optional"
  onChange?: (value: string) => void
  className?: string
}

export function FormField({
  label,
  value = "",
  placeholder,
  type = "text",
  options = [],
  status = "optional",
  onChange,
  className,
}: FormFieldProps) {
  const [localValue, setLocalValue] = useState(value)

  // Sync local state with prop changes (needed for AI auto-fill)
  if (value !== localValue && value !== undefined) {
    setLocalValue(value)
  }

  const handleChange = (newValue: string) => {
    setLocalValue(newValue)
    onChange?.(newValue)
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {status === "auto-filled" && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Auto-Filled
          </span>
        )}
        {status === "required" && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Action Required
          </span>
        )}
      </div>

      {type === "textarea" ? (
        <textarea
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={cn(
            "w-full px-4 py-3 rounded-xl bg-input border transition-all duration-200 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50",
            status === "required" && !localValue
              ? "border-amber-500/50 bg-amber-500/5"
              : "border-border hover:border-primary/30"
          )}
        />
      ) : type === "select" ? (
        <select
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            "w-full px-4 py-3 rounded-xl bg-input border transition-all duration-200 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
            status === "required" && !localValue
              ? "border-amber-500/50 bg-amber-500/5"
              : "border-border hover:border-primary/30"
          )}
        >
          <option value="">{placeholder || "Select an option"}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full px-4 py-3 rounded-xl bg-input border transition-all duration-200 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
            status === "required" && !localValue
              ? "border-amber-500/50 bg-amber-500/5"
              : "border-border hover:border-primary/30"
          )}
        />
      )}
    </div>
  )
}
