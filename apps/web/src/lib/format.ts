const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatDate(date: Date | string): string {
  return dateFormatter.format(new Date(date))
}
