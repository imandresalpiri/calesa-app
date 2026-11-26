import { describe, expect, it } from 'vitest'
import { CLAVES_DEL_PANEL_DE_FASE, contenidoDelPanel } from './panel-del-flujo'

const A = '00000000-0000-4000-8000-000000000001'
const fases = [{ id: A }]
const ambas = ['reglas', 'documentos']

describe('contenidoDelPanel', () => {
  it('abre la fase de la URL si es del flujo', () => {
    expect(contenidoDelPanel({ seccion: null, fase: A }, fases, ambas)).toEqual({
      tipo: 'fase',
      faseId: A,
    })
  })

  it('gana la sección sobre la fase', () => {
    expect(contenidoDelPanel({ seccion: 'reglas', fase: A }, fases, ambas)).toEqual({
      tipo: 'seccion',
      clave: 'reglas',
    })
    expect(contenidoDelPanel({ seccion: 'documentos', fase: null }, fases, ambas)).toEqual({
      tipo: 'seccion',
      clave: 'documentos',
    })
  })

  it('lo que no apunta a nada no abre: una fase ajena, una sección basura o que no se ve', () => {
    const otra = '00000000-0000-4000-8000-000000000009'
    expect(contenidoDelPanel({ seccion: null, fase: otra }, fases, ambas)).toBeNull()
    expect(contenidoDelPanel({ seccion: 'basura', fase: null }, fases, ambas)).toBeNull()
    expect(contenidoDelPanel({ seccion: 'reglas', fase: null }, fases, ['documentos'])).toBeNull()
    expect(contenidoDelPanel({ seccion: null, fase: null }, fases, ambas)).toBeNull()
  })

  it('«fases» (los enlaces viejos) no es una sección del panel: abre la fase', () => {
    expect(contenidoDelPanel({ seccion: 'fases', fase: A }, fases, ambas)).toEqual({
      tipo: 'fase',
      faseId: A,
    })
  })

  it('limpia lo que abren los bloques, sin la fase ni la sección', () => {
    expect(CLAVES_DEL_PANEL_DE_FASE).toContain('panel')
    expect(CLAVES_DEL_PANEL_DE_FASE).toContain('pestana')
    expect(CLAVES_DEL_PANEL_DE_FASE).toContain('editada')
    expect(CLAVES_DEL_PANEL_DE_FASE).toContain('en')
    expect(CLAVES_DEL_PANEL_DE_FASE).not.toContain('fase')
    expect(CLAVES_DEL_PANEL_DE_FASE).not.toContain('seccion')
  })
})
