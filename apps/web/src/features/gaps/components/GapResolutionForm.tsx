import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resolveGapSchema, type ResolveGap } from '@sebi/schemas'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'
import { useResolveGap } from '#/features/gaps/hooks/useResolveGap'

interface GapResolutionFormProps {
  gapId: string
  checklistItemId: string
}

// Whole resolveGapSchema (v3) used as-is via zodResolver — not composed into
// a v4 object, so the Phase 6 Zod boundary rule doesn't apply here.
export function GapResolutionForm({ gapId, checklistItemId }: GapResolutionFormProps) {
  const resolveGap = useResolveGap(checklistItemId)

  const form = useForm<ResolveGap>({
    resolver: zodResolver(resolveGapSchema),
    defaultValues: { gapId, resolutionNote: '' },
  })

  function onSubmit(values: ResolveGap) {
    resolveGap.mutate(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="resolutionNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Resolution note</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe how this gap was resolved" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {resolveGap.isError && (
          <p className="text-destructive text-sm">{resolveGap.error.message}</p>
        )}

        <Button type="submit" disabled={resolveGap.isPending}>
          {resolveGap.isPending ? 'Resolving...' : 'Mark resolved'}
        </Button>
      </form>
    </Form>
  )
}
