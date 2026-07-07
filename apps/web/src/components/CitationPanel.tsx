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

// Shared by checklist detail (this phase) and obligation detail (Phase 9,
// via the sourceChunks prop — checklist.getDetail's obligation include has
// no sourceChunks relation, so this page never passes that prop).
export function CitationPanel({
  citationText,
  citationPage,
  citationSection,
  sourceChunks,
}: CitationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Source citation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">
            {citationSection ?? 'Section unknown'}
            {citationPage != null ? ` · Page ${citationPage}` : ''}
          </p>
          <blockquote className="border-l-2 pl-3 text-sm italic">{citationText}</blockquote>
        </div>
        {sourceChunks && sourceChunks.length > 0 && (
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-medium">Source passages</p>
            {sourceChunks.map((chunk) => (
              <div key={chunk.chunkId} className="border-l-2 pl-3 text-sm">
                <p className="text-muted-foreground text-xs">
                  {chunk.section ?? 'Section unknown'}
                  {chunk.page != null ? ` · Page ${chunk.page}` : ''}
                </p>
                <p>{chunk.text}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
