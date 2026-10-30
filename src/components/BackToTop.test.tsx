import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BackToTop } from './BackToTop'

afterEach(() => vi.unstubAllGlobals())

describe('voltar ao topo', () => {
  it.each([false, true])('respeita a preferência por movimento reduzido: %s', async (reducedMotion) => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: reducedMotion }))
    const scrollTo = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)
    render(<BackToTop />)
    await userEvent.click(screen.getByRole('button', { name: 'Voltar ao topo' }))
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' })
  })
})
