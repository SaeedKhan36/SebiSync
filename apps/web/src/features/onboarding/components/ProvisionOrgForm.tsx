import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { provisionIntermediarySchema, type ProvisionIntermediary } from '@sebi/schemas'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
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
import {
  useIntermediaryCategories,
  useProvisionIntermediary,
} from '#/features/onboarding/hooks/useProvisionIntermediary'

export function ProvisionOrgForm() {
  const categoriesQuery = useIntermediaryCategories()
  const provision = useProvisionIntermediary()

  const form = useForm<ProvisionIntermediary>({
    resolver: zodResolver(provisionIntermediarySchema),
    defaultValues: { name: '', categoryCode: '', sebiRegNo: '' },
  })

  function onSubmit(values: ProvisionIntermediary) {
    provision.mutate(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization name</FormLabel>
              <FormControl>
                <Input placeholder="Alpha Wealth Advisors" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Intermediary category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categoriesQuery.data?.map((category) => (
                    <SelectItem key={category.id} value={category.code}>
                      {category.name}
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
          name="sebiRegNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SEBI registration number (optional)</FormLabel>
              <FormControl>
                <Input placeholder="INA000012345" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {provision.isError && (
          <p className="text-destructive text-sm">{provision.error.message}</p>
        )}

        <Button type="submit" disabled={provision.isPending}>
          {provision.isPending ? 'Provisioning...' : 'Continue'}
        </Button>
      </form>
    </Form>
  )
}
