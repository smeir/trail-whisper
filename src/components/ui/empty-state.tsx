import { cn } from '@/lib/utils'

export function EmptyState({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500',
        className,
      )}
      {...props}
    />
  )
}
