import { Suspense } from "react"
import { Navigation } from "@/components/shared/navigation"
import { SearchResults } from "@/components/shared/search-results"

export default function SearchPage() {
  return (
    <>
      <Navigation />
      <Suspense fallback={<div className="min-h-screen bg-background px-6 pt-28 text-muted-foreground">Loading search...</div>}>
        <SearchResults />
      </Suspense>
    </>
  )
}
