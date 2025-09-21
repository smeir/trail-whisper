import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const base = 'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium'
  const variants = {
    default: 'bg-brand-100 text-brand-700',
    outline: 'border border-slate-300 text-slate-700',
  }

  return <span className={cn(base, variants[variant], className)} {...props} />
}
