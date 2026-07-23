import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import { useClientList, type ClientListItem } from '#/features/clients/hooks/useClientList'
import { ClientTable } from '#/features/clients/components/ClientTable'
import { ClientFormDialog } from '#/features/clients/components/ClientFormDialog'

export const Route = createFileRoute('/_authenticated/_org/clients/')({
  component: ClientsPage,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(context.trpc.client.listByIntermediary.queryOptions()),
  pendingComponent: ClientsSkeleton,
})

function ClientsPage() {
  const { data: items } = useClientList()
  const [editingClient, setEditingClient] = useState<ClientListItem | null>(null)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="The clients your organisation services — each one receives its own compliance checklist."
        action={<ClientFormDialog />}
      />
      <ClientTable items={items} onRowClick={setEditingClient} />
      {editingClient && (
        <ClientFormDialog
          // Remount per client so the form picks up fresh defaults.
          key={editingClient.id}
          client={editingClient}
          open
          onOpenChange={(open) => {
            if (!open) setEditingClient(null)
          }}
        />
      )}
    </div>
  )
}

function ClientsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-96" />
    </div>
  )
}
