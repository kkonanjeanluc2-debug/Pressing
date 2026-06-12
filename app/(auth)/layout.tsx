export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md sm:rounded-2xl sm:border sm:border-gray-200 sm:bg-white sm:p-8 sm:shadow-sm">
        {children}
      </div>
    </div>
  )
}
