import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-transparent font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-60'

const variantStyles: Record<ButtonVariant, string> = {
  default: 'bg-brand-500 text-white shadow-soft hover:bg-brand-600',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  outline: 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', size = 'md', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    />
  )
})
