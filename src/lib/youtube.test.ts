import { describe, expect, it } from 'vitest'
import { formatTimestamp, parseYouTubeUrl, timestampUrl } from './youtube'

const id = 'dQw4w9WgXcQ'

describe('parseYouTubeUrl', () => {
  it.each([
    [`https://www.youtube.com/watch?v=${id}`, id],
    [`https://youtu.be/${id}?si=abc`, id],
    [`https://youtube.com/shorts/${id}`, id],
    [`https://www.youtube.com/embed/${id}`, id],
    [`https://youtube.com/live/${id}?feature=share`, id],
    [`https://www.youtube-nocookie.com/embed/${id}`, id],
  ])('aceita %s', (url, expected) => {
    expect(parseYouTubeUrl(url)?.videoId).toBe(expected)
  })

  it.each([
    '',
    'não é uma url',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'javascript:alert(1)',
    'https://youtube.com/watch?v=curto',
    'https://youtube.com/playlist?list=abc',
  ])('rejeita %s', (url) => {
    expect(parseYouTubeUrl(url)).toBeNull()
  })
})

describe('timestamp helpers', () => {
  it('formata e cria links clicáveis', () => {
    expect(formatTimestamp(3723)).toBe('01:02:03')
    expect(timestampUrl(id, 65)).toContain('&t=65s')
  })
})
