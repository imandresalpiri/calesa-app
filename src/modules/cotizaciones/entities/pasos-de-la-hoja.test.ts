import { describe, expect, it } from 'vitest'
import { pasosDeLaHoja } from './pasos-de-la-hoja'

const claves = (p: Parameters<typeof pasosDeLaHoja>[0]) => pasosDeLaHoja(p).map((x) => x.clave)

describe('pasosDeLaHoja', () => {
  it('con los dos: «Privada» y después «Vista previa», que abre su panel', () => {
    const pasos = pasosDeLaHoja({ privada: true, vistaPrevia: 'vista-previa' })
    expect(pasos).toEqual([
      { clave: 'privada', etiqueta: 'Privada', panel: null },
      { clave: 'vista_previa', etiqueta: 'Vista previa', panel: 'vista-previa' },
    ])
  })

  it('sin quien pueda marcarla (o en una guardada), sólo «Vista previa»', () => {
    expect(claves({ privada: false, vistaPrevia: 'vista-previa' })).toEqual(['vista_previa'])
  })

  it('sin la vista previa, sólo «Privada»', () => {
    expect(claves({ privada: true, vistaPrevia: null })).toEqual(['privada'])
  })

  it('sin ninguno, nada: la fila no se dibuja', () => {
    expect(pasosDeLaHoja({ privada: false, vistaPrevia: null })).toEqual([])
  })
})
