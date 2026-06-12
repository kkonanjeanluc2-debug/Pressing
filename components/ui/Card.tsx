import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

export default function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-gray-200 bg-white p-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}
