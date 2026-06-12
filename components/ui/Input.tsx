'use client'

import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  erreur?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, erreur, className, id, ...props },
  ref
) {
  const inputId = id ?? props.name
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-card border bg-white px-3 py-3 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-pressci-primary focus:ring-2 focus:ring-pressci-accent',
          erreur ? 'border-red-400' : 'border-gray-300',
          className
        )}
        {...props}
      />
      {erreur && <p className="mt-1 text-sm text-red-600">{erreur}</p>}
    </div>
  )
})

export default Input
