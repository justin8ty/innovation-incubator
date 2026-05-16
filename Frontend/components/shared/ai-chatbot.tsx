"use client"

import { FormEvent, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type ChatRole = "user" | "assistant"

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
}

type AgentResponse = {
  action: "search_redirect" | "answer_directly" | "clarify"
  message: string
  redirect_url?: string | null
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

export function AiChatbot() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Ask me to search the ecosystem graph, e.g. what companies an investor has invested in.",
    },
  ])

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading])

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = input.trim()
    if (!message || loading) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    }
    setMessages((current) => [...current, userMessage])
    setInput("")
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`POST ${API_BASE_URL}/agent/chat failed: HTTP ${response.status} ${response.statusText}. ${errorBody}`)
      }

      const data = (await response.json()) as AgentResponse
      const assistantMessage = data.message || "I processed your request."
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantMessage,
        },
      ])

      if (data.action === "search_redirect" && data.redirect_url) {
        router.push(data.redirect_url)
        setOpen(false)
      }
    } catch (error) {
      const debugMessage = error instanceof Error ? error.message : String(error)
      console.error("AI agent request failed", { apiBaseUrl: API_BASE_URL, error })
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I could not reach the AI agent. Debug: ${debugMessage}`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60]">
      {open && (
        <div className="mb-4 w-[calc(100vw-2.5rem)] max-w-md overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Master Agent</p>
                <p className="text-xs text-muted-foreground">Routes searches to the graph subagent</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close AI chat">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm leading-relaxed",
                  message.role === "user"
                    ? "ml-10 bg-primary text-primary-foreground"
                    : "mr-10 border border-border/60 bg-secondary/70 text-foreground"
                )}
              >
                {message.content}
              </div>
            ))}
            {loading && (
              <div className="mr-10 flex items-center gap-2 rounded-2xl border border-border/60 bg-secondary/70 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            )}
          </div>

          <form onSubmit={submitMessage} className="border-t border-border/60 p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about investors, mentors, companies..."
                className="min-h-12 resize-none bg-background/80"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
              />
              <Button type="submit" size="icon" disabled={!canSend} aria-label="Send message">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </div>
      )}

      <Button
        size="lg"
        onClick={() => setOpen((current) => !current)}
        className="h-14 rounded-full bg-primary px-5 text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
      >
        <MessageCircle className="mr-2 h-5 w-5" />
        AI Agent
      </Button>
    </div>
  )
}
