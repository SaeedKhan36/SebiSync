import { Quote } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

interface SourceChunk {
  chunkId: string
  text: string
  page: number | null
  section: string | null
}

interface CitationPanelProps {
  citationText: string
  citationPage?: number | null
  citationSection?: string | null
  sourceChunks?: SourceChunk[]
}

function LocationChip({ section, page }: { section: string | null; page: number | null }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {section ?? 'Section unknown'}
      {page != null && <span className="mx-1 text-border">·</span>}
      {page != null && `Page ${page}`}
    </span>
  )
}

// Shared by checklist detail (this phase) and obligation detail (Phase 9,
// via the sourceChunks prop — checklist.getDetail's obligation include has
// no sourceChunks relation, so this page never passes that prop).
// The quoted text is set in the editorial serif — the citation IS the
// product's trust story, so it gets the landing page's treatment.
export function CitationPanel({
  citationText,
  citationPage,
  citationSection,
  sourceChunks,
}: CitationPanelProps) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
          <Quote className="size-4 text-[#3730a3]" />
          Source citation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <figure className="space-y-2.5">
          <blockquote className="rounded-r-md border-l-2 border-[#3730a3] bg-[#eef2ff]/50 py-2.5 pr-3 pl-4 font-serif text-[15px] leading-relaxed text-[#312e81] italic">
            {citationText}
          </blockquote>
          <figcaption>
            <LocationChip section={citationSection ?? null} page={citationPage ?? null} />
          </figcaption>
        </figure>

        {sourceChunks && sourceChunks.length > 0 && (
          <div className="space-y-3 border-t border-dashed border-border pt-4">
            <p className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
              Source passages
            </p>
            {sourceChunks.map((chunk) => (
              <div key={chunk.chunkId} className="space-y-1.5 border-l-2 border-border pl-3">
                <LocationChip section={chunk.section} page={chunk.page} />
                <p className="text-sm leading-relaxed text-muted-foreground">{chunk.text}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
