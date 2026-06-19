import Link from 'next/link'

export default function SansPressing() {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-pressci-light text-3xl">
        🏪
      </div>
      <h2 className="text-xl font-bold text-gray-800">Aucun pressing configuré</h2>
      <p className="mt-2 max-w-xs text-sm text-gray-500">
        Créez votre pressing pour accéder à cette section.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-pressci-primary px-6 py-3 font-semibold text-white"
      >
        Créer mon pressing
      </Link>
    </div>
  )
}
