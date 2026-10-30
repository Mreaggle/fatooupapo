import { ArrowUp } from 'lucide-react'

export function BackToTop() {
  return (
    <button
      type="button"
      className="back-to-top fixed z-20 inline-flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-foreground shadow-lg transition-colors hover:bg-line"
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
      onClick={() => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' })
      }}
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  )
}
