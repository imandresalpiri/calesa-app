import { describe, expect, it } from 'vitest'
import { enlaceDeVideo } from './video'

const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const VIMEO = 'https://vimeo.com/123456789'

describe('enlaceDeVideo', () => {
  it.each([
    YOUTUBE,
    'https://youtu.be/dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=abc123',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    'https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'www.youtube.com/watch?v=dQw4w9WgXcQ',
    'http://youtube.com/watch?v=dQw4w9WgXcQ',
    '  https://youtu.be/dQw4w9WgXcQ  ',
  ])('pasa %s a la forma de YouTube', (escrito) => {
    expect(enlaceDeVideo(escrito)).toEqual({ url: YOUTUBE, proveedor: 'youtube' })
  })

  it.each([
    VIMEO,
    'https://vimeo.com/123456789/abcdef1234',
    'https://vimeo.com/123456789?share=copy',
    'https://player.vimeo.com/video/123456789',
    'vimeo.com/123456789',
  ])('pasa %s a la forma de Vimeo', (escrito) => {
    expect(enlaceDeVideo(escrito)).toEqual({ url: VIMEO, proveedor: 'vimeo' })
  })

  it.each([
    '',
    'hola',
    'https://www.dailymotion.com/video/x7tgad0',
    'https://www.youtube.com/watch?v=corto',
    'https://www.youtube.com/@canal',
    'https://youtube.com.otro.host/watch?v=dQw4w9WgXcQ',
    'https://vimeo.com/canal/algo',
    'https://vimeo.com/1234567890123',
    'javascript:alert(1)',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ y más',
  ])('no reconoce «%s»', (escrito) => {
    expect(enlaceDeVideo(escrito)).toBeNull()
  })
})
