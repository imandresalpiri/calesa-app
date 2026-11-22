import { describe, expect, it } from 'vitest'
import juego from './casos-de-datos-clave.json'
import {
  DATOS_CLAVE_DE_FABRICA,
  datosComunesDe,
  errorDeDatosClave,
  esquemaDatosClave,
  resolverDatosClave,
  type DatoClave,
} from './datos-clave'
import {
  MOTIVO_SIN_PERMISO_DATOS_CLAVE,
  esDatoClave,
  motivoParaNoMarcar,
  sinDatoClave,
} from './datos-clave-edicion'

// El mismo juego lo corre `db:probar` contra `_origen_datos_clave_error()` (supabase/tests/areas/origenes/datos-clave.sql).
describe('errorDeDatosClave: el juego común con la base', () => {
  it('trae al menos uno por código y veinte casos', () => {
    expect(juego.casos.length).toBeGreaterThanOrEqual(20)
    const codigos = new Set(juego.casos.map((caso) => caso.error?.codigo ?? 'ok'))
    expect([...codigos].sort()).toEqual(
      [
        'campo_inactivo',
        'comun_desconocido',
        'forma',
        'ok',
        'repetido',
        'solo_subasta',
        'tope',
      ].sort(),
    )
  })

  for (const caso of juego.casos) {
    it(caso.nombre, () => {
      const tipo = caso.tipo === 'subasta' ? 'subasta' : 'manual'
      expect(errorDeDatosClave(tipo, caso.datos, caso.camposActivos)).toEqual(caso.error)
    })
  }

  it('los de fábrica son los del juego y son válidos para su tipo', () => {
    expect(DATOS_CLAVE_DE_FABRICA).toEqual(juego.deFabrica)
    expect(errorDeDatosClave('subasta', DATOS_CLAVE_DE_FABRICA.subasta, [])).toBeNull()
    expect(errorDeDatosClave('manual', DATOS_CLAVE_DE_FABRICA.manual, [])).toBeNull()
  })

  it('el esquema de Zod rechaza lo que la base rechaza por forma o tope', () => {
    for (const caso of juego.casos) {
      if (caso.error?.codigo === 'forma' || caso.error?.codigo === 'tope') {
        expect(esquemaDatosClave.safeParse(caso.datos).success, caso.nombre).toBe(false)
      }
    }
    expect(esquemaDatosClave.safeParse([{ comun: 'anio' }, { campo: 'color' }]).success).toBe(true)
  })
})

describe('datos comunes', () => {
  it('un manual no lleva lote, plataforma ni enlace', () => {
    expect(datosComunesDe('manual').map((dato) => dato.clave)).toEqual([
      'marca',
      'modelo',
      'anio',
      'vin',
      'categoria_id',
      'kilometraje',
      'placado',
    ])
    expect(datosComunesDe('subasta')).toHaveLength(10)
  })
})

describe('editar la lista', () => {
  const anio: DatoClave = { comun: 'anio' }
  const vin: DatoClave = { comun: 'vin' }
  const color: DatoClave = { campo: 'color' }
  const cuatro: DatoClave[] = [anio, vin, { comun: 'marca' }, { comun: 'modelo' }]

  it('quita sólo el dato elegido; un común y un campo con la misma clave son distintos', () => {
    expect(sinDatoClave([anio, color, vin], color)).toEqual([anio, vin])
    expect(sinDatoClave([vin, { campo: 'vin' }], { campo: 'vin' })).toEqual([vin])
    expect(esDatoClave([vin], { campo: 'vin' })).toBe(false)
  })

  it('hacer dato clave se apaga sin permiso y, con 4, en los no marcados', () => {
    expect(motivoParaNoMarcar({ lista: [], dato: anio, puedeGestionar: false })).toBe(
      MOTIVO_SIN_PERMISO_DATOS_CLAVE,
    )
    expect(motivoParaNoMarcar({ lista: cuatro, dato: color, puedeGestionar: true })).toBe(
      'Ya hay 4 datos clave: quita uno para sumar este.',
    )
    expect(motivoParaNoMarcar({ lista: cuatro, dato: anio, puedeGestionar: true })).toBeNull()
    expect(motivoParaNoMarcar({ lista: [anio], dato: color, puedeGestionar: true })).toBeNull()
  })
})

describe('resolverDatosClave', () => {
  const campos = [{ id: 'c1', clave: 'color', etiqueta: 'Color' }]

  it('vacía da los de fábrica del tipo', () => {
    expect(resolverDatosClave('subasta', [], campos).map((dato) => dato.etiqueta)).toEqual([
      'Plataforma',
      'Enlace de la subasta',
      'Kilometraje',
      'Año',
    ])
  })

  it('con la etiqueta del campo y de dónde sale; descarta un campo que ya no está activo', () => {
    expect(
      resolverDatosClave(
        'manual',
        [{ campo: 'color' }, { campo: 'viejo' }, { comun: 'vin' }],
        campos,
      ),
    ).toEqual([
      { de: 'campo', clave: 'color', etiqueta: 'Color', campoId: 'c1' },
      { de: 'comun', clave: 'vin', etiqueta: 'VIN' },
    ])
  })
})
