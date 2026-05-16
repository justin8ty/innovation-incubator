"use client"

import { FormEvent, useState } from "react"
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/api"

type ChatResponse = {
  action: "answer" | "search"
  message: string
  redirect_url?: string
}

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

export function AiChatbot() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Ask me to search mentors, investors, companies, relationships, or expertise across the ecosystem.",
    },
  ])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const message = input.trim()
    if (!message || loading) return

    setInput("")
    setLoading(true)
    setMessages((current) => [...current, { role: "user", content: message }])

    try {
      const response = await apiFetch<ChatResponse>("/agent/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      })

      setMessages((current) => [...current, { role: "assistant", content: response.message }])
      if (response.action === "search" && response.redirect_url) {
        router.push(response.redirect_url)
        setOpen(false)
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error instanceof Error ? `I couldn't reach the AI agent: ${error.message}` : "I couldn't reach the AI agent.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 font-semibold">
              <Bot className="h-5 w-5 text-primary" />
              Ecosystem AI Agent
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close AI chatbot">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`rounded-2xl px-3 py-2 text-sm ${
                  message.role === "user" ? "ml-8 bg-primary text-primary-foreground" : "mr-8 bg-muted text-muted-foreground"
                }`}
              >
                {message.content}
              </div>
            ))}
            {loading && (
              <div className="mr-8 flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            )}
          </div>

          <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="e.g. What companies has Jane Doe invested in?"
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      <Button size="lg" className="h-14 rounded-full px-5 shadow-2xl" onClick={() => setOpen((value) => !value)}>
        <MessageCircle className="mr-2 h-5 w-5" /> AI Agent
      </Button>
    </div>
  )
}
