import { API_BASE_URL } from "@/lib/api"

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

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-card-foreground">{title}</h3>
          {subtitle && <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{subtitle}</p>}
        </div>
        {value(result, ["distance", "strength_score"]) && (
          <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
            {value(result, ["distance", "strength_score"])}
          </span>
        )}
      </div>
      {description && <p className="mt-3 text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}

function Section({ title, items, empty }: { title: string; items: AnyResult[]; empty: string }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">{items.length} results</span>
      </div>
      {items.length ? <div className="grid gap-3">{items.map((item, index) => <ResultCard key={index} result={item} />)}</div> : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{empty}</p>}
    </section>
  )
}

async function loadSearch(query: string): Promise<SearchPayload | null> {
  if (!query) return null
  const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`, { cache: "no-store" })
  if (!response.ok) return null
  return response.json()
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams
  const query = params.q ?? ""
  const payload = await loadSearch(query)
  const sqlRelationships = payload?.sql_results?.relationships ?? []
  const expertiseMatches = payload?.sql_results?.expertise_matches ?? []

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">AI Ecosystem Search</p>
          <h1 className="mt-3 text-4xl font-bold">Search results</h1>
          {query && (
            <p className="mt-3 text-muted-foreground">
              Showing vector, reranked, and SQL relationship results for “{query}”.
            </p>
          )}
          <form action="/search" className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search startups, mentors, companies, expertise..."
              className="h-11 flex-1 rounded-lg border border-border bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              type="submit"
              className="h-11 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Search
            </button>
          </form>
        </div>

        {payload?.errors?.vector && <p className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-600">Vector search unavailable: {payload.errors.vector}</p>}
        {payload?.errors?.sql && <p className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-600">SQL agent unavailable: {payload.errors.sql}</p>}

        <Section title="AI reranked results" items={payload?.reranked_results ?? []} empty="No AI-reranked matches returned." />
        <Section title="Vector results" items={payload?.vector_results ?? []} empty="No vector matches returned." />
        <Section title="SQL relationship results" items={[...sqlRelationships, ...expertiseMatches]} empty="No relationship or expertise matches returned." />
      </div>
    </main>
  )
}
