import { useEffect, useRef, type CSSProperties } from 'react'
import type { RecentDebate } from '../types'

export function DebateCarousel({ debates }: { debates: RecentDebate[] }) {
  const viewport = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = viewport.current
    if (!root || !debates.length) return
    const track = root.querySelector<HTMLElement>('.debate-carousel__track')!
    const slides = Array.from(track.children) as HTMLElement[]
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let step = 0
    let distance = 0
    let frame = 0
    let previous = 0
    let hovered = false
    let focused = false
    let dragging = false
    let pointerStart: number | null = null
    let dragStart = 0
    let suppressClickUntil = 0

    function paint() {
      if (!step) return
      const period = step * slides.length
      slides.forEach((slide, index) => {
        const offset = ((index * step - distance + period / 2) % period + period) % period - period / 2
        const prominence = Math.max(0, 1 - Math.abs(offset) / step)
        slide.style.setProperty('--offset', `${offset}px`)
        slide.style.setProperty('--prominence', String(prominence))
        slide.style.zIndex = String(Math.round(prominence * 10))
        slide.toggleAttribute('data-centered', Math.abs(offset) < step / 2)
      })
    }

    function tick(now: number) {
      if (previous) distance = (distance + Math.min(now - previous, 50) * 0.026) % (step * slides.length)
      previous = now
      paint()
      frame = requestAnimationFrame(tick)
    }

    function updatePlayback() {
      cancelAnimationFrame(frame)
      frame = 0
      previous = 0
      if (step && slides.length > 1 && !motion?.matches && !hovered && !focused && !dragging && !document.hidden) frame = requestAnimationFrame(tick)
    }

    function measure() {
      const nextStep = slides[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap || '0')
      if (step) distance = distance / step * nextStep
      step = nextStep
      paint()
      updatePlayback()
    }

    function enter(event: PointerEvent) { if (event.pointerType === 'mouse') { hovered = true; updatePlayback() } }
    function leave() { hovered = false; updatePlayback() }
    function focus(event: FocusEvent) {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-index]')
      if (!link) return
      focused = true
      if (link.matches(':focus-visible')) {
        distance = Number(link.dataset.index) * step
        paint()
      }
      updatePlayback()
    }
    function blur(event: FocusEvent) {
      if (event.relatedTarget instanceof Node && root!.contains(event.relatedTarget)) return
      focused = false
      updatePlayback()
    }
    function pointerDown(event: PointerEvent) {
      if (event.pointerType === 'mouse' || !event.isPrimary) return
      pointerStart = event.clientX
      dragStart = distance
    }
    function pointerMove(event: PointerEvent) {
      if (pointerStart === null) return
      const delta = event.clientX - pointerStart
      if (!dragging && Math.abs(delta) < 10) return
      if (!dragging) { dragging = true; root!.setPointerCapture(event.pointerId); updatePlayback() }
      distance = dragStart - delta
      paint()
    }
    function pointerUp() {
      if (dragging) suppressClickUntil = performance.now() + 250
      pointerStart = null
      dragging = false
      updatePlayback()
    }
    function click(event: MouseEvent) { if (performance.now() < suppressClickUntil) event.preventDefault() }

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(root)
    window.addEventListener('resize', measure)
    root.addEventListener('pointerenter', enter)
    root.addEventListener('pointerleave', leave)
    root.addEventListener('focusin', focus)
    root.addEventListener('focusout', blur)
    root.addEventListener('pointerdown', pointerDown)
    root.addEventListener('pointermove', pointerMove)
    root.addEventListener('pointerup', pointerUp)
    root.addEventListener('pointercancel', pointerUp)
    root.addEventListener('click', click, true)
    document.addEventListener('visibilitychange', updatePlayback)
    motion?.addEventListener('change', updatePlayback)
    measure()
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      root.removeEventListener('pointerenter', enter)
      root.removeEventListener('pointerleave', leave)
      root.removeEventListener('focusin', focus)
      root.removeEventListener('focusout', blur)
      root.removeEventListener('pointerdown', pointerDown)
      root.removeEventListener('pointermove', pointerMove)
      root.removeEventListener('pointerup', pointerUp)
      root.removeEventListener('pointercancel', pointerUp)
      root.removeEventListener('click', click, true)
      document.removeEventListener('visibilitychange', updatePlayback)
      motion?.removeEventListener('change', updatePlayback)
    }
  }, [debates])

  if (!debates.length) return null

  return <section ref={viewport} className="debate-carousel" aria-label="Debates em destaque" aria-roledescription="carrossel" style={{ '--carousel-count': debates.length } as CSSProperties}>
    <ul className="debate-carousel__track">
      {debates.map((debate, index) => <li key={debate.video.id} className="debate-carousel__slide" data-centered={index === 0 ? '' : undefined}>
        <a className="debate-carousel__link" href={`?v=${debate.video.id}`} data-index={index} draggable={false}>
          <div className="debate-carousel__image">
            <img src={debate.video.thumbnailUrl} alt="" width={480} height={360} decoding="async" draggable={false} onError={(event) => { event.currentTarget.hidden = true }} />
          </div>
          <span className="debate-carousel__title">{debate.video.title}</span>
        </a>
      </li>)}
    </ul>
  </section>
}
