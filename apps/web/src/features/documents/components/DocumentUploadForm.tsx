import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileUp, FileText, X } from 'lucide-react'
import { toast } from 'sonner'
import { createDocumentSchema, type CreateDocument } from '@sebi/schemas'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'
import { Label } from '#/components/ui/label'
import { useUploadDocument } from '#/features/documents/hooks/useUploadDocument'

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export function DocumentUploadForm({ onCreated }: { onCreated: (documentId: string) => void }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const upload = useUploadDocument()

  const form = useForm<CreateDocument>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: { title: '', circularNumber: '', sourceUrl: '' },
  })

  function chooseFile(next: File | null) {
    if (next && !isPdf(next)) {
      setFile(null)
      setFileError('Upload a PDF circular')
      return
    }
    setFile(next)
    setFileError(null)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      form.reset()
      setFile(null)
      setFileError(null)
      setDragging(false)
    }
  }

  function onSubmit(values: CreateDocument) {
    if (!file) {
      setFileError('Select a PDF to upload')
      return
    }
    upload.mutate(
      { ...values, file },
      {
        onSuccess: (document) => {
          toast.success('Document uploaded — extraction started')
          handleOpenChange(false)
          onCreated(document.id)
        },
        onError: (error) => {
          toast.error(error.message)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Upload document</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            Drop in a SEBI circular PDF. Extraction runs on the file — a source URL is optional.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document-file">PDF file</Label>
              {file ? (
                <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/50 px-3 py-2.5">
                  <FileText className="size-4 shrink-0 text-[#3730a3] dark:text-indigo-300" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Remove file"
                    onClick={() => chooseFile(null)}
                  >
                    <X />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="document-file"
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    chooseFile(e.dataTransfer.files[0] ?? null)
                  }}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-7 text-center transition-colors ${
                    dragging
                      ? 'border-[#3730a3] bg-[#3730a3]/5 dark:border-indigo-300 dark:bg-indigo-300/10'
                      : 'border-border bg-secondary/30 hover:border-primary/40 hover:bg-secondary/60'
                  }`}
                >
                  <FileUp className="size-5 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Drop a PDF here, or click to browse</p>
                    <p className="text-xs text-muted-foreground">SEBI circulars and master circulars</p>
                  </div>
                </label>
              )}
              <input
                id="document-file"
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
              />
              {fileError && <p className="text-destructive text-sm">{fileError}</p>}
            </div>

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
                  <FormLabel>
                    Source URL <span className="font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.sebi.gov.in/..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Link back to the official circular if you have one. Not needed to extract obligations.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {upload.isError && <p className="text-destructive text-sm">{upload.error.message}</p>}

            <DialogFooter>
              <Button type="submit" disabled={upload.isPending}>
                {upload.isPending ? 'Uploading...' : 'Upload & extract'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
