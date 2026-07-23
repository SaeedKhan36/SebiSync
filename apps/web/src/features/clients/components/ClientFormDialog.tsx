import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { createClientSchema, type CreateClient } from '@sebi/schemas'
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
import { useCreateClient, useUpdateClient } from '#/features/clients/hooks/useClientMutations'
import type { ClientListItem } from '#/features/clients/hooks/useClientList'

function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

interface ClientFormDialogProps {
  // Present = edit mode (controlled via open/onOpenChange from the page);
  // absent = create mode with its own trigger button.
  client?: ClientListItem
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ClientFormDialog({ client, open, onOpenChange }: ClientFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const dialogOpen = isControlled ? open : internalOpen
  const setDialogOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen

  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const mutation = client ? updateClient : createClient

  const form = useForm<CreateClient>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: client?.name ?? '',
      onboardedAt: client?.onboardedAt ? new Date(client.onboardedAt) : undefined,
    },
  })

  function onSubmit(values: CreateClient) {
    const options = {
      onSuccess: () => {
        setDialogOpen(false)
        form.reset()
        toast.success(client ? 'Client updated' : 'Client added')
      },
    }
    if (client) {
      updateClient.mutate({ id: client.id, ...values, onboardedAt: values.onboardedAt ?? null }, options)
    } else {
      createClient.mutate(values, options)
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!client && (
        <DialogTrigger asChild>
          <Button>Add client</Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{client ? 'Edit client' : 'Add client'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Capital Pvt Ltd" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="onboardedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Onboarded date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      defaultValue={toDateInputValue(field.value)}
                      onChange={(e) =>
                        field.onChange(e.target.value ? new Date(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mutation.isError && (
              <p className="text-destructive text-sm">{mutation.error.message}</p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : client ? 'Save changes' : 'Add client'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
