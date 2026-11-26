import { describe, expect, it } from 'vitest'
import {
  CLAVES_DEL_PANEL_DE_FASE,
  consultaParaAbrirUnCatalogo,
  contenidoDelPanel,
  queHacerConElPanel,
} from './panel-del-flujo'

const A = '00000000-0000-4000-8000-000000000001'
const fases = [{ id: A }]
const ambas = ['reglas']

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
  })

  it('lo que no apunta a nada no abre: una fase ajena, una sección basura o que no se ve', () => {
    const otra = '00000000-0000-4000-8000-000000000009'
    expect(contenidoDelPanel({ seccion: null, fase: otra }, fases, ambas)).toBeNull()
    expect(contenidoDelPanel({ seccion: 'basura', fase: null }, fases, ambas)).toBeNull()
    expect(contenidoDelPanel({ seccion: 'reglas', fase: null }, fases, [])).toBeNull()
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

describe('los tipos de documento ya no son una sección del panel', () => {
  it('`?seccion=documentos` no abre nada (y la fase de la URL sigue abriendo)', () => {
    expect(contenidoDelPanel({ seccion: 'documentos', fase: null }, fases, ambas)).toBeNull()
    expect(contenidoDelPanel({ seccion: 'documentos', fase: A }, fases, ambas)).toEqual({
      tipo: 'fase',
      faseId: A,
    })
  })
})

describe('el drawer de un catálogo', () => {
  const deUnOrigen = ['puertos', 'navieras', 'categorias-de-gasto', 'tipos-de-documento'] as const
  const deRepuestos = ['tipos-de-documento'] as const

  it('abre el catálogo que la pantalla tiene', () => {
    expect(queHacerConElPanel('puertos', deUnOrigen)).toBe('abrir')
    expect(queHacerConElPanel('tipos-de-documento', deRepuestos)).toBe('abrir')
  })

  it('limpia el de un catálogo que no tiene y los modales viejos de los tipos', () => {
    expect(queHacerConElPanel('puertos', deRepuestos)).toBe('limpiar')
    expect(queHacerConElPanel('nuevo-tipo', deUnOrigen)).toBe('limpiar')
    expect(queHacerConElPanel('eliminar-tipo', deUnOrigen)).toBe('limpiar')
  })

  it('ignora lo que es de otro y lo que falta', () => {
    expect(queHacerConElPanel('nueva-fase', deUnOrigen)).toBe('ignorar')
    expect(queHacerConElPanel('xyz', deRepuestos)).toBe('ignorar')
    expect(queHacerConElPanel(null, deUnOrigen)).toBe('ignorar')
  })

  it('abrirlo cierra la fase, la sección y lo que éstas abrían', () => {
    const consulta = consultaParaAbrirUnCatalogo('navieras')
    expect(consulta).toMatchObject({ panel: 'navieras', fase: null, seccion: null, agregar: null })
    expect(CLAVES_DEL_PANEL_DE_FASE).toContain('accion')
  })
})
