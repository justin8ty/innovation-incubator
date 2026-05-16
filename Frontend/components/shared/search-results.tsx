"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Loader2, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

type RelationshipResult = {
  id: number
  source_entity_name: string | null
  target_entity_name: string | null
  relationship_type: string | null
  status: string | null
  strength_score: number | null
  ai_reasoning_summary: string | null
}

type SearchResponse = {
  results: RelationshipResult[]
}

const FILTER_KEYS = [
  "source_name",
  "source_role",
  "target_name",
  "target_role",
  "relationship_type",
  "status",
  "industry",
  "stage",
  "country",
]

export function SearchResults() {
  const searchParams = useSearchParams()
  const [results, setResults] = useState<RelationshipResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const queryString = useMemo(() => searchParams.toString(), [searchParams])
  const activeFilters = useMemo(
    () => FILTER_KEYS.map((key) => [key, searchParams.get(key)] as const).filter(([, value]) => Boolean(value)),
    [searchParams]
  )

  useEffect(() => {
    const controller = new AbortController()

    async function loadResults() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${API_BASE_URL}/search/relationships?${queryString}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          const errorBody = await response.text()
          throw new Error(`GET ${API_BASE_URL}/search/relationships failed: HTTP ${response.status} ${response.statusText}. ${errorBody}`)
        }
        const data = (await response.json()) as SearchResponse
        setResults(data.results || [])
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          const debugMessage = fetchError instanceof Error ? fetchError.message : String(fetchError)
          console.error("Relationship search request failed", { apiBaseUrl: API_BASE_URL, error: fetchError })
          setError(`Could not load search results. Debug: ${debugMessage}`)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadResults()
    return () => controller.abort()
  }, [queryString])

  return (
    <div className="min-h-screen bg-background px-6 pt-28 pb-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
            <Search className="h-4 w-4" />
            AI-filtered relationship search
          </div>
          <h1 className="text-3xl font-bold text-foreground md:text-5xl">Search Results</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            These results were filtered from the relationship graph using the chatbot subagent's structured query.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {activeFilters.length > 0 ? (
            activeFilters.map(([key, value]) => (
              <Badge key={key} variant="secondary" className="rounded-full px-3 py-1">
                {key.replaceAll("_", " ")}: {value}
              </Badge>
            ))
          ) : (
            <Badge variant="outline">No filters supplied</Badge>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading relationship results...
          </div>
        )}

        {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">{error}</div>}

        {!loading && !error && results.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            No matching relationships found.
          </div>
        )}

        <div className="space-y-4">
          {results.map((relationship) => (
            <Card key={relationship.id} className="border-border/70 bg-card/80">
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle className="flex flex-wrap items-center gap-3 text-xl">
                    <span>{relationship.source_entity_name || "Unknown source"}</span>
                    <ArrowRight className="h-5 w-5 text-primary" />
                    <span>{relationship.target_entity_name || "Unknown target"}</span>
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {relationship.relationship_type && <Badge>{relationship.relationship_type}</Badge>}
                    {relationship.status && <Badge variant="outline">{relationship.status}</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Strength score:{" "}
                  <span className="font-medium text-foreground">
                    {typeof relationship.strength_score === "number" ? relationship.strength_score.toFixed(2) : "n/a"}
                  </span>
                </p>
                {relationship.ai_reasoning_summary && <p>{relationship.ai_reasoning_summary}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
