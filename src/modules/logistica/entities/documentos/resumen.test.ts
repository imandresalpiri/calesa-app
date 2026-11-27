import { describe, expect, it } from 'vitest'
import {
  documentosDelResumenDesde,
  resumenDeDocumentos,
  TOPE_DEL_RESUMEN_DE_DOCUMENTOS,
  type DocumentoDelResumen,
} from './resumen'

const HOY = '2026-11-27'
const doc = (extra: Partial<DocumentoDelResumen> = {}): DocumentoDelResumen => ({
  estado: 'aprobado',
  venceEl: null,
  avisoDias: null,
  vence: false,
  ...extra,
})

describe('resumenDeDocumentos', () => {
  it('vacío: lo dice y ofrece subir sólo con permiso', () => {
    const r = resumenDeDocumentos({ leidos: [], hoy: HOY, puedeSubir: true })
    expect(r.lineas).toEqual(['Sin documentos todavía.'])
    expect(r.acciones.map((a) => a.etiqueta)).toEqual(['Ver los documentos', 'Subir documentos'])
    expect(r.acciones[1]?.destino).toEqual({ tipo: 'drawer', url: { subir: 'documentos' } })
    const sin = resumenDeDocumentos({ leidos: [], hoy: HOY, puedeSubir: false })
    expect(sin.acciones.map((a) => a.clave)).toEqual(['ver'])
  })

  it('cuenta y avisa los que esperan aprobación antes que el vencimiento', () => {
    const r = resumenDeDocumentos({
      leidos: [doc(), doc({ estado: 'subido' }), doc({ estado: 'subido' })],
      hoy: HOY,
      puedeSubir: false,
    })
    expect(r.lineas).toEqual(['3 documentos · 1 aprobados'])
    expect(r.aviso).toBe('2 por aprobar')
  })

  it('vencido, y si no, el más próximo dentro de su aviso; un tipo sin vencimiento no avisa', () => {
    const vencido = doc({ venceEl: '2026-11-26', vence: true })
    expect(resumenDeDocumentos({ leidos: [vencido], hoy: HOY, puedeSubir: false }).aviso).toBe(
      'Vencido',
    )
    const pronto = [
      doc({ venceEl: '2026-12-02', avisoDias: 10, vence: true }),
      doc({ venceEl: '2026-11-28', avisoDias: 5, vence: true }),
      doc({ venceEl: '2026-11-27', avisoDias: 5, vence: false }),
    ]
    expect(resumenDeDocumentos({ leidos: pronto, hoy: HOY, puedeSubir: false }).aviso).toBe(
      'Vence mañana',
    )
    const lejos = [doc({ venceEl: '2026-12-20', avisoDias: 5, vence: true })]
    expect(resumenDeDocumentos({ leidos: lejos, hoy: HOY, puedeSubir: false }).aviso).toBeNull()
    const enDias = [doc({ venceEl: '2026-12-01', avisoDias: 7, vence: true })]
    expect(resumenDeDocumentos({ leidos: enDias, hoy: HOY, puedeSubir: false }).aviso).toBe(
      'Vence en 4 días',
    )
  })

  it('pasado el tope dice «más de» y no cuenta los aprobados', () => {
    const leidos = Array.from({ length: TOPE_DEL_RESUMEN_DE_DOCUMENTOS + 1 }, () => doc())
    const r = resumenDeDocumentos({ leidos, hoy: HOY, puedeSubir: false })
    expect(r.lineas).toEqual(['más de 50 documentos'])
  })
})

describe('documentosDelResumenDesde', () => {
  it('lee la forma de la consulta y rechaza otra', () => {
    expect(
      documentosDelResumenDesde([
        { estado: 'subido', vence_el: null, tipo: { aviso_dias: 3, modo_vencimiento: 'renovar' } },
        { estado: 'aprobado', vence_el: '2027-01-01', tipo: null },
      ]),
    ).toEqual([
      { estado: 'subido', venceEl: null, avisoDias: 3, vence: true },
      { estado: 'aprobado', venceEl: '2027-01-01', avisoDias: null, vence: false },
    ])
    expect(documentosDelResumenDesde([{ estado: 'otro' }])).toBeNull()
  })
})
