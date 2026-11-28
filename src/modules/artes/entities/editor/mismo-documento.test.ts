import { describe, expect, it } from 'vitest'
import { documentoVacio, type DocumentoDeArte } from '../documento'
import { nuevaCapa } from './capas-nuevas'
import { mismoDocumento } from './mismo-documento'

const medidas = { ancho: 1080, alto: 1080 }

function conCapas(...capas: DocumentoDeArte['paginas'][number]['capas']): DocumentoDeArte {
  const vacio = documentoVacio()
  const [primera] = vacio.paginas
  if (!primera) {
    throw new Error('sin página')
  }
  return { ...vacio, paginas: [{ ...primera, capas }] }
}

const capaDeTexto = nuevaCapa({ tipo: 'texto', texto: '{vehiculo}' }, { id: 't', medidas })
if (capaDeTexto.tipo !== 'texto') {
  throw new Error('no es un texto')
}
const texto = capaDeTexto
const forma = nuevaCapa({ tipo: 'forma', forma: 'rectangulo' }, { id: 'f', medidas })

describe('mismoDocumento', () => {
  it('el alto medido de un texto no cuenta como cambio', () => {
    expect(mismoDocumento(conCapas({ ...texto, alto: 40 }), conCapas({ ...texto, alto: 90 }))).toBe(
      true,
    )
  })

  it('el texto, el ancho o el alto de otra capa sí', () => {
    expect(mismoDocumento(conCapas(texto), conCapas({ ...texto, texto: '{marca}' }))).toBe(false)
    expect(mismoDocumento(conCapas(texto), conCapas({ ...texto, ancho: texto.ancho + 1 }))).toBe(
      false,
    )
    expect(mismoDocumento(conCapas(forma), conCapas({ ...forma, alto: forma.alto + 1 }))).toBe(
      false,
    )
  })
})
