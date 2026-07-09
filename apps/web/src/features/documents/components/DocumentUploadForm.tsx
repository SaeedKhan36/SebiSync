import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createDocumentSchema, type CreateDocument } from '@sebi/schemas'
import { useMutation } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
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
import { useTRPC } from '#/integrations/trpc/react'

// Metadata only (document.create) — the file itself is uploaded on the new
// document's detail page, whose UPLOADED-status view shows the file picker
// + "Upload & start extraction" action (matches the page breakdown's "if
// UPLOADED show upload+trigger steps" wording).
export function DocumentUploadForm({ onCreated }: { onCreated: (documentId: string) => void }) {
  const [open, setOpen] = useState(false)
  const trpc = useTRPC()
  const create = useMutation(trpc.document.create.mutationOptions())

  const form = useForm<CreateDocument>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: { title: '', circularNumber: '', sourceUrl: '' },
  })

  function onSubmit(values: CreateDocument) {
    create.mutate(values, {
      onSuccess: (document) => {
        setOpen(false)
        form.reset()
        onCreated(document.id)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Upload document</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Master Circular for Investment Advisers" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="circularNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Circular number</FormLabel>
                  <FormControl>
                    <Input placeholder="SEBI/HO/IMD/IMD-I/CIR/P/2023/XXX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="issuedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issued date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sourceUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.sebi.gov.in/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {create.isError && <p className="text-destructive text-sm">{create.error.message}</p>}

            <DialogFooter>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
