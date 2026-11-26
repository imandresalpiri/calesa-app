import { describe, expect, it } from 'vitest'
import type { TipoDeDocumento } from './documento'
import { tiposParaSubir } from './tipos-para-subir'

const FLUJO = '00000000-0000-4000-8000-0000000000f1'
const tipo = (id: string, nombre: string, flujoId: string | null = null): TipoDeDocumento => ({
  id,
  nombre,
  formatos: [],
  modoDeVencimiento: 'ninguno',
  vigenciaDias: null,
  visiblePortalPermitido: false,
  flujoId,
  orden: 0,
})
const TIPOS = [
  tipo('bl', 'BL'),
  tipo('factura', 'Factura comercial'),
  tipo('factura-propia', ' FACTURA  comercial ', FLUJO),
  tipo('poliza', 'Póliza'),
]

describe('tiposParaSubir', () => {
  it('saca el compartido que tapa un propio del flujo con su nombre normalizado', () => {
    expect(tiposParaSubir(TIPOS, []).map((t) => t.id)).toEqual(['bl', 'factura-propia', 'poliza'])
  })

  it('el tapado que pide un requisito sigue, rotulado', () => {
    const r = tiposParaSubir(TIPOS, [{ tipoId: 'factura' }])
    expect(r.map((t) => [t.id, t.nombre])).toEqual([
      ['bl', 'BL'],
      ['factura', 'Factura comercial (tapado)'],
      ['factura-propia', ' FACTURA  comercial '],
      ['poliza', 'Póliza'],
    ])
  })

  it('sin propios no cambia nada', () => {
    const compartidos = [tipo('bl', 'BL'), tipo('poliza', 'Póliza')]
    expect(tiposParaSubir(compartidos, [{ tipoId: 'bl' }])).toEqual(compartidos)
  })
})
