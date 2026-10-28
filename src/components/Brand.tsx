import { Check } from 'lucide-react'

export function Brand({ onHome }: { onHome: () => void }) {
  return (
    <button type="button" onClick={onHome} className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight" aria-label="Fato ou Papo — início">
      <Check size={18} strokeWidth={2.5} aria-hidden="true" />
      <span>Fato ou Papo<span className="ml-0.5 text-blue-300">.</span></span>
    </button>
  )
}
