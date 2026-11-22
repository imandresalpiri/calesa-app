import { describe, expect, it, vi } from 'vitest'
import {
  MOTIVO_CAMPO_DE_FABRICA,
  MOTIVO_PRIMERO_DE_SU_GRUPO,
  MOTIVO_ULTIMO_DE_SU_GRUPO,
} from '@/shared/lib/campos'
import type { AccionDeMenu } from '@/shared/ui/lista'
import { accionesDeCampo, type DatoClaveDelCampo } from './acciones-de-campo'

const DATO_CLAVE: DatoClaveDelCampo = {
  es: false,
  motivo: null,
  hacer: 'Hacer dato clave',
  quitar: 'Quitar de los datos clave',
}

function lineas(acciones: readonly AccionDeMenu[]): string[] {
  return acciones.map((linea) => {
    switch (linea.tipo) {
      case 'accion':
        return `${linea.etiqueta}${linea.deshabilitada ? ' (apagada)' : ''}`
      case 'nota':
        return `nota: ${linea.texto}`
      case 'separador':
        return '—'
      case 'casilla':
        return linea.etiqueta
    }
  })
}

const base = {
  campo: { activo: true, esSistema: false },
  puedeGestionar: true,
  puedeSubir: true,
  puedeBajar: true,
  datoClave: null,
  notaAlDesactivar: null,
  alElegir: () => {},
}

describe('accionesDeCampo', () => {
  it('un campo activo: editar, ordenar, desactivar y eliminar, en ese orden', () => {
    expect(lineas(accionesDeCampo(base))).toEqual([
      'Editar',
      '—',
      'Subir',
      'Bajar',
      '—',
      'Desactivar',
      'Eliminar…',
    ])
  })

  it('con casillas suma hacer o quitar el dato clave después de editar; con el tope, apagado con su motivo', () => {
    expect(lineas(accionesDeCampo({ ...base, datoClave: DATO_CLAVE })).slice(0, 2)).toEqual([
      'Editar',
      'Hacer dato clave',
    ])
    expect(
      lineas(accionesDeCampo({ ...base, datoClave: { ...DATO_CLAVE, es: true } })).slice(0, 2),
    ).toEqual(['Editar', 'Quitar de los datos clave'])
    expect(
      lineas(accionesDeCampo({ ...base, datoClave: { ...DATO_CLAVE, motivo: 'Ya hay 4.' } })).slice(
        0,
        3,
      ),
    ).toEqual(['Editar', 'Hacer dato clave (apagada)', 'nota: Ya hay 4.'])
  })

  it('en el borde del grupo, subir o bajar se apagan con su motivo', () => {
    expect(lineas(accionesDeCampo({ ...base, puedeSubir: false, puedeBajar: false }))).toEqual([
      'Editar',
      '—',
      'Subir (apagada)',
      `nota: ${MOTIVO_PRIMERO_DE_SU_GRUPO}`,
      'Bajar (apagada)',
      `nota: ${MOTIVO_ULTIMO_DE_SU_GRUPO}`,
      '—',
      'Desactivar',
      'Eliminar…',
    ])
  })

  it('desactivar dice lo que arrastra; uno de fábrica no se elimina', () => {
    const acciones = accionesDeCampo({
      ...base,
      campo: { activo: true, esSistema: true },
      notaAlDesactivar: 'También sale de los datos clave.',
    })
    expect(lineas(acciones).slice(-4)).toEqual([
      'Desactivar',
      'nota: También sale de los datos clave.',
      'Eliminar… (apagada)',
      `nota: ${MOTIVO_CAMPO_DE_FABRICA}`,
    ])
  })
})

describe('accionesDeCampo: desactivados y sin permiso', () => {
  it('un desactivado: editar, activar y eliminar', () => {
    expect(
      lineas(
        accionesDeCampo({
          ...base,
          campo: { activo: false, esSistema: false },
          datoClave: DATO_CLAVE,
        }),
      ),
    ).toEqual(['Editar', 'Activar', '—', 'Eliminar…'])
  })

  it('sin permiso, sólo «Ver»', () => {
    expect(
      lineas(accionesDeCampo({ ...base, puedeGestionar: false, datoClave: DATO_CLAVE })),
    ).toEqual(['Ver'])
  })

  it('la primera es la principal y cada línea dice qué eligió', () => {
    const alElegir = vi.fn()
    const acciones = accionesDeCampo({ ...base, alElegir })
    const [primera] = acciones
    expect(primera).toMatchObject({ tipo: 'accion', principal: true })
    for (const linea of acciones) {
      if (linea.tipo === 'accion') linea.alElegir()
    }
    expect(alElegir.mock.calls.map(([clave]: unknown[]) => clave)).toEqual([
      'abrir',
      'subir',
      'bajar',
      'desactivar',
      'eliminar',
    ])
  })
})
