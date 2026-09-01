"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { API_BASE_URL } from "@/lib/api"
import { Navigation } from "@/components/shared/navigation"
import { Activity, Brain, Database, Search, Sparkles, Zap, Loader2 } from "lucide-react"

type AnyResult = Record<string, unknown>

type SearchPayload = {
  query: string
  vector_results: AnyResult[]
  reranked_results: AnyResult[]
  sql_results: {
    count?: number
    relationships?: AnyResult[]
    expertise_matches?: AnyResult[]
    query_plan?: Record<string, unknown>
    error?: string | null
  }
  errors?: {
    vector?: string | null
    sql?: string | null
  }
}

function value(result: AnyResult, keys: string[]) {
  for (const key of keys) {
    const item = result[key]
    if (item !== undefined && item !== null && item !== "") return String(item)
  }
  return null
}

function ResultCard({ result }: { result: AnyResult }) {
  const title = value(result, ["name", "target_entity_name", "source_entity_name", "title"]) ?? "Untitled result"
  const subtitle = [value(result, ["role", "target_role", "match_type"]), value(result, ["industry", "relationship_type"])]
    .filter(Boolean)
    .join(" • ")
  const description = value(result, ["description", "ai_reasoning_summary", "reasoning"])
  const score = value(result, ["distance", "strength_score"])

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-cyan-400/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-card-foreground transition-colors group-hover:text-primary">{title}</h3>
              {subtitle && <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {score && (
            <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
              {score}
            </span>
          )}
        </div>
        {description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}

function Section({
  title,
  items,
  empty,
  icon: Icon,
}: {
  title: string
  items: AnyResult[]
  empty: string
  icon: typeof Brain
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </span>
          {title}
        </h2>
        <span className="font-mono text-xs text-muted-foreground">/{String(items.length).padStart(2, "0")}</span>
      </div>
      {items.length ? (
        <div className="grid gap-3 md:grid-cols-2">{items.map((item, index) => <ResultCard key={index} result={item} />)}</div>
      ) : (
        <p className="rounded-3xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  )
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("q") ?? ""
  const [searchInput, setSearchInput] = useState(query)
  const [loading, setLoading] = useState(false)
  const [payload, setPayload] = useState<SearchPayload | null>(null)

  useEffect(() => {
    setSearchInput(query)
    if (!query.trim()) {
      setPayload(null)
      return
    }

    let isMounted = true
    setLoading(true)

    fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) {
          setPayload(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Search fetch failed:", err)
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [query])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`)
    } else {
      router.push("/search")
    }
  }

  const sqlRelationships = payload?.sql_results?.relationships ?? []
  const expertiseMatches = payload?.sql_results?.expertise_matches ?? []
  const totalResults = (payload?.reranked_results?.length ?? 0) + (payload?.vector_results?.length ?? 0) + sqlRelationships.length + expertiseMatches.length

  return (
    <div className="relative mx-auto max-w-7xl space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
            <Search className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">AI Ecosystem Search</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-black uppercase tracking-tight md:text-6xl">
            Discover the right <span className="text-primary italic">ecosystem link</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Search across vector matches, AI reranking, relationship graphs, and expertise signals in one command surface.
          </p>
        </div>

        <div className="rounded-[2rem] border border-border bg-card/80 p-2 shadow-2xl shadow-primary/10 backdrop-blur">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 rounded-[1.5rem] border border-border/60 bg-background/70 p-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                name="q"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search startups, mentors, grants..."
                className="h-12 w-full rounded-2xl border border-transparent bg-secondary pl-11 pr-4 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 active:scale-95 disabled:opacity-70"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Signals", value: query ? (loading ? "Loading..." : totalResults) : "Ready", icon: Activity },
          { label: "Vector Matches", value: payload?.vector_results?.length ?? 0, icon: Zap },
          { label: "SQL Relationships", value: sqlRelationships.length + expertiseMatches.length, icon: Database },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-border bg-card/70 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-black text-foreground">{stat.value}</p>
          </div>
        ))}
      </section>

      {query && (
        <div className="rounded-3xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
          Showing vector, reranked, and SQL relationship results for <span className="font-bold">“{query}”</span>.
        </div>
      )}

      {payload?.errors?.vector && <p className="rounded-3xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-600">Vector search unavailable: {payload.errors.vector}</p>}
      {payload?.errors?.sql && <p className="rounded-3xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-600">SQL agent unavailable: {payload.errors.sql}</p>}

      {query ? (
        <div className="space-y-10">
          <Section title="AI reranked" icon={Brain} items={payload?.reranked_results ?? []} empty="No AI-reranked matches returned." />
          <Section title="Vector results" icon={Zap} items={payload?.vector_results ?? []} empty="No vector matches returned." />
          <Section title="Relationship graph" icon={Database} items={[...sqlRelationships, ...expertiseMatches]} empty="No relationship or expertise matches returned." />
        </div>
      ) : (
        <div className="rounded-[2rem] border border-border bg-card/70 p-8 text-center backdrop-blur">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Start with a signal</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Try a sector, mentor specialty, startup stage, campaign name, or funding need to surface ecosystem matches.
          </p>
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="relative overflow-hidden px-6 pb-16 pt-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.12),transparent_45%)]" />
        <div className="absolute left-1/4 top-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-1/4 top-80 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <Suspense fallback={<div className="text-center py-20 text-muted-foreground">Loading search...</div>}>
          <SearchContent />
        </Suspense>
      </main>
    </div>
  )
}
