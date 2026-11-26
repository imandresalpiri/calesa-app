import { expect, it } from 'vitest'
import { usoDeTipoDesde, type TipoDeDocumento } from './tipo-de-documento'
import {
  MOTIVO_DE_TIPO_NO_DISPONIBLE,
  MOTIVO_SOLO_LECTURA_DE_COMPARTIDOS,
  claveDeGrupoDe,
  claveDelBorrador,
  grupoDelTipo,
  insigniaDeTapado,
  motivoParaNoEditarTipo,
  motivoParaNoEliminarPorUrl,
  tapadosDelGrupo,
  textoDelGrupoVacio,
  textoSinTipos,
  tituloDeLosPropios,
  type VistaDeGrupo,
  type VistasDeGrupos,
} from './vista-de-grupo'

const FLUJO = '5b0c7c1e-3f6e-4a0c-9a55-1d7a6c2e9f10'

function tipo(id: string, flujoId: string | null): TipoDeDocumento {
  return {
    id,
    flujoId,
    nombre: id,
    descripcion: null,
    formatos: ['application/pdf'],
    modo: 'ninguno',
    vigenciaDias: null,
    avisoDias: null,
    visiblePortal: false,
    activo: true,
    orden: 1,
    actualizadoEn: '2026-11-11T10:00:00.123456+00:00',
  }
}

function vista(
  flujoId: string | null,
  ids: string[],
  puedeCambiar: boolean,
  usados: string[] = [],
): VistaDeGrupo {
  return {
    grupo: { flujoId, tope: 3, tipos: ids.map((id) => tipo(id, flujoId)), hayMas: false },
    puedeCambiar,
    uso: puedeCambiar
      ? Object.fromEntries(ids.map((id) => [id, usoDeTipoDesde(usados.includes(id) ? 2 : 0, 0)]))
      : null,
    tapados: null,
  }
}

const vistas: VistasDeGrupos = {
  compartido: vista(null, ['bl', 'titulo'], false),
  origen: vista(FLUJO, ['a', 'b', 'c'], true, ['b']),
}

it('quien ve los compartidos en lectura no abre «Editar» y lee a quién pedirle el permiso', () => {
  expect(motivoParaNoEditarTipo(vistas, 'bl')).toBe(MOTIVO_SOLO_LECTURA_DE_COMPARTIDOS)
  expect(MOTIVO_SOLO_LECTURA_DE_COMPARTIDOS).toBe(
    'Pídele a quien administra los roles el permiso de configurar la logística.',
  )
})

it('«Editar» abre uno del grupo que se cambia y no abre uno ausente', () => {
  expect(motivoParaNoEditarTipo(vistas, 'no-esta')).toBe(MOTIVO_DE_TIPO_NO_DISPONIBLE)
  expect(motivoParaNoEditarTipo(vistas, null)).toBe(MOTIVO_DE_TIPO_NO_DISPONIBLE)
  expect(motivoParaNoEditarTipo(vistas, 'a')).toBeNull()
})

it('`?de=` vale origen salvo «compartido»; el grupo de un tipo lo dice su flujo', () => {
  expect(claveDeGrupoDe('compartido')).toBe('compartido')
  expect(claveDeGrupoDe(null)).toBe('origen')
  expect(claveDeGrupoDe('empresa')).toBe('origen')
  expect(grupoDelTipo({ flujoId: null })).toBe('compartido')
  expect(grupoDelTipo({ flujoId: FLUJO })).toBe('origen')
})

it('los vacíos nombran el origen o el flujo de repuestos', () => {
  expect(textoSinTipos('Miami')).toBe('Todavía no hay tipos de documento en Miami ni compartidos.')
  expect(textoSinTipos(null)).toBe(
    'Todavía no hay tipos de documento en el flujo de repuestos ni compartidos.',
  )
  expect(textoDelGrupoVacio('origen', 'Miami')).toBe('Ninguno sólo de Miami.')
  expect(textoDelGrupoVacio('compartido', 'Miami')).toBe('Ninguno compartido.')
})

it('un borrador por tipo y uno solo para el nuevo', () => {
  expect(claveDelBorrador(null)).toBe('tipo-de-documento:nuevo')
  expect(claveDelBorrador('a')).toBe('tipo-de-documento:a')
})

it('eliminar por URL: abre uno sin uso; con uso o de sólo lectura no abre y dice por qué', () => {
  expect(motivoParaNoEliminarPorUrl(vistas, 'a')).toBeNull()
  expect(motivoParaNoEliminarPorUrl(vistas, 'b')).toContain('Lo usan 2 documentos')
  expect(motivoParaNoEliminarPorUrl(vistas, 'bl')).toBe(MOTIVO_SOLO_LECTURA_DE_COMPARTIDOS)
  expect(motivoParaNoEliminarPorUrl(vistas, 'x')).toBe(MOTIVO_DE_TIPO_NO_DISPONIBLE)
})

it('el grupo del flujo se nombra por su origen; el de repuestos, por su flujo', () => {
  expect(tituloDeLosPropios('Miami')).toBe('De Miami')
  expect(tituloDeLosPropios(null)).toBe('Del flujo de repuestos')
})

it('un compartido que tapa el flujo lleva la insignia; los demás, no', () => {
  const compartidos = vistas.compartido
  const conTapados = { ...compartidos, tapados: tapadosDelGrupo(new Set(['bl']), 'Miami') }
  const [bl, titulo] = compartidos.grupo.tipos
  if (!bl || !titulo) throw new Error('faltan tipos')
  expect(insigniaDeTapado(conTapados, bl)).toBe('Tapado por el de Miami')
  expect(insigniaDeTapado(conTapados, titulo)).toBeNull()
  expect(insigniaDeTapado(compartidos, bl)).toBeNull()
  expect(tapadosDelGrupo(['bl'], null).insignia).toBe('Tapado por el del flujo de repuestos')
})
