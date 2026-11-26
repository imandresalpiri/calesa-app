import { describe, expect, it } from 'vitest'
import { htmlParaLaVistaPrevia } from './vista-previa'

const url = (ruta: string) => `https://x.test/${ruta}`

describe('htmlParaLaVistaPrevia', () => {
  it('pone la URL pública a cada imagen, también las de una galería', () => {
    const resultado = htmlParaLaVistaPrevia(
      {
        type: 'doc',
        content: [
          { type: 'image', attrs: { ruta: 'guias/a.webp', alt: 'A' } },
          { type: 'gallery', attrs: { imagenes: [{ ruta: 'guias/b.webp', alt: '' }] } },
        ],
      },
      url,
    )
    expect(resultado).toEqual({
      ok: true,
      html:
        '<img src="https://x.test/guias/a.webp" data-ruta="guias/a.webp" alt="A">' +
        '<figure class="guia-galeria"><img src="https://x.test/guias/b.webp" data-ruta="guias/b.webp" alt=""></figure>',
    })
  })

  it('dice el motivo si la lista blanca rechaza el documento', () => {
    const resultado = htmlParaLaVistaPrevia(
      { type: 'doc', content: [{ type: 'video', attrs: { url: 'https://otro.test/x' } }] },
      url,
    )
    expect(resultado).toEqual({
      ok: false,
      motivo: 'Ese video no se admite: usa un enlace de YouTube o Vimeo.',
    })
  })

  it('deja el texto como lo deriva la lista blanca', () => {
    const resultado = htmlParaLaVistaPrevia(
      { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a<b' }] }] },
      url,
    )
    expect(resultado).toEqual({ ok: true, html: '<p>a&lt;b</p>' })
  })
})
