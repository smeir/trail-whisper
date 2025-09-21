import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200',
        className,
      )}
      {...props}
    />
  )
})
