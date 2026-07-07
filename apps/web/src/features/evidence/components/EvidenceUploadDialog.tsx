import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { Calendar } from '#/components/ui/calendar'
import { evidenceTypeLabelMap } from '#/components/status/statusColorMaps'
import { formatDate } from '#/lib/format'
import { useUploadEvidence } from '#/features/evidence/hooks/useUploadEvidence'

const EVIDENCE_TYPE_VALUES = Object.keys(evidenceTypeLabelMap) as [
  keyof typeof evidenceTypeLabelMap,
  ...Array<keyof typeof evidenceTypeLabelMap>,
]

// Native v4 schema, not @sebi/schemas's v3 evidenceConfirmSchema — this
// dialog's form only needs evidenceType/description/validUntil (checklistItemId
// and r2ObjectKey come from context/the upload step, not user input), and per
// the Phase 6 Zod v3/v4 boundary rule, composing a v3 schema inside a new v4
// z.object() breaks inference. The File itself is plain local state, not a
// form field — no meaningful Zod representation for a file input here.
const evidenceFormSchema = z.object({
  evidenceType: z.enum(EVIDENCE_TYPE_VALUES),
  description: z.string().optional(),
  validUntil: z.date().optional(),
})
type EvidenceFormValues = z.infer<typeof evidenceFormSchema>

interface EvidenceUploadDialogProps {
  checklistItemId: string
}

export function EvidenceUploadDialog({ checklistItemId }: EvidenceUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const upload = useUploadEvidence(checklistItemId)

  const form = useForm<EvidenceFormValues>({
    resolver: zodResolver(evidenceFormSchema),
    defaultValues: { evidenceType: 'DOCUMENT', description: '' },
  })

  function onSubmit(values: EvidenceFormValues) {
    if (!file) {
      form.setError('evidenceType', { message: 'Select a file to upload' })
      return
    }
    upload.mutate(
      { checklistItemId, file, ...values },
      {
        onSuccess: () => {
          toast.success('Evidence uploaded')
          setOpen(false)
          setFile(null)
          form.reset()
        },
        onError: (error) => {
          toast.error(error.message)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add evidence</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add evidence</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <FormLabel>File</FormLabel>
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <FormField
              control={form.control}
              name="evidenceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Evidence type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EVIDENCE_TYPE_VALUES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {evidenceTypeLabelMap[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="validUntil"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Valid until (optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="justify-start font-normal">
                          {field.value ? formatDate(field.value) : 'No expiry'}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={upload.isPending}>
                {upload.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
