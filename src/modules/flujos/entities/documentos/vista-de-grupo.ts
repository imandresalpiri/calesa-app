// Lo que la pantalla de tipos de documento muestra de cada grupo y qué se puede abrir desde la URL. Puro: la pantalla lee los dos grupos en el servidor y
// estas reglas dicen, con texto, por qué algo no se abre o no se elimina (nunca un botón muerto sin motivo).
import { quienTapa } from '../propios-del-flujo'
import {
  tipoEnUso,
  textoDelUso,
  type ClaveDeGrupo,
  type GrupoDeTipos,
  type TipoDeDocumento,
  type UsoDeTipo,
} from './tipo-de-documento'

// Los compartidos que tapa un propio activo del flujo que se ve: sus ids y la insignia que lo dice («Tapado por el de Miami»).
export type TapadosDelGrupo = { ids: readonly string[]; insignia: string }

// Un grupo tal como se dibuja: sus tipos, quién lo cambia, cuánto usa cada uno (sólo lo sabe quien puede cambiarlo: a los demás la base les dice 42501)
// y, el de los compartidos en el panel de un flujo, cuáles tapa ese flujo (nulo en el resto).
export type VistaDeGrupo = {
  grupo: GrupoDeTipos
  puedeCambiar: boolean
  uso: Record<string, UsoDeTipo> | null
  tapados: TapadosDelGrupo | null
}

// Logística › Configuración › Tipos de documento dibuja los compartidos; el panel del flujo, los de ese flujo y los compartidos (con los que tapa). El que
// la página no dibuja va nulo. La clave `empresa` (también en la URL, `?de=empresa`) es el grupo de los compartidos.
export type VistasDeGrupos = { empresa: VistaDeGrupo | null; flujo: VistaDeGrupo | null }

export const TITULO_DE_LOS_COMPARTIDOS = 'Compartidos'
export const MOTIVO_SOLO_LECTURA_DE_COMPARTIDOS =
  'Los tipos compartidos los cambia quien configura la logística en cada origen que los usa.'
export const MOTIVO_SOLO_LECTURA_DEL_FLUJO =
  'No puedes configurar los tipos de documento de este flujo.'
export const MOTIVO_DE_TIPO_NO_DISPONIBLE = 'Ese tipo de documento ya no existe.'
export const MOTIVO_DE_GRUPO_NO_DISPONIBLE = 'Esa lista de tipos de documento no está disponible.'

export function motivoDeSoloLectura(clave: ClaveDeGrupo): string {
  return clave === 'empresa' ? MOTIVO_SOLO_LECTURA_DE_COMPARTIDOS : MOTIVO_SOLO_LECTURA_DEL_FLUJO
}

// El grupo de un flujo se nombra por su dueño: su origen («De Miami») o, sin origen, el flujo de repuestos.
export function tituloDeLosPropios(origen: string | null): string {
  return origen === null ? 'Del flujo de repuestos' : `De ${origen}`
}

export function detalleDeLosPropios(origen: string | null): string {
  return `Sólo se piden en ${origen ?? 'el flujo de repuestos'}.`
}

// Los compartidos que tapa el flujo de este origen (nulo: el de repuestos), con su insignia.
export function tapadosDelGrupo(ids: Iterable<string>, origen: string | null): TapadosDelGrupo {
  return { ids: [...ids], insignia: `Tapado por ${quienTapa(origen)}` }
}

// La insignia de un tipo del grupo si el flujo que se ve lo tapa; nula si no.
export function insigniaDeTapado(vista: VistaDeGrupo, tipo: TipoDeDocumento): string | null {
  return vista.tapados?.ids.includes(tipo.id) ? vista.tapados.insignia : null
}

export function claveDeGrupoDe(valor: string | null): ClaveDeGrupo | null {
  return valor === 'empresa' || valor === 'flujo' ? valor : null
}

export function vistaDelGrupo(vistas: VistasDeGrupos, clave: ClaveDeGrupo): VistaDeGrupo | null {
  return clave === 'empresa' ? vistas.empresa : vistas.flujo
}

// Dónde está un tipo (en el grupo que se ve) y de qué grupo es.
export function buscarTipo(
  vistas: VistasDeGrupos,
  id: string | null,
): { tipo: TipoDeDocumento; clave: ClaveDeGrupo; vista: VistaDeGrupo } | null {
  if (id === null) {
    return null
  }
  const grupos: [ClaveDeGrupo, VistaDeGrupo | null][] = [
    ['empresa', vistas.empresa],
    ['flujo', vistas.flujo],
  ]
  for (const [clave, vista] of grupos) {
    const tipo = vista?.grupo.tipos.find((uno) => uno.id === id)
    if (vista && tipo) {
      return { tipo, clave, vista }
    }
  }
  return null
}

export function alTopeDelGrupo(grupo: GrupoDeTipos): boolean {
  return grupo.hayMas || grupo.tipos.length >= grupo.tope
}

export function textoDelTope(tope: number): string {
  return `Ya hay ${String(tope)} tipos de documento en esta lista: elimina alguno para crear otro.`
}

// Por qué «Nuevo tipo» o «Editar» no abre lo que pide la URL (escrita a mano también); nulo si abre.
export function motivoParaNoAbrirTipo(
  vistas: VistasDeGrupos,
  modo: 'nuevo' | 'editar' | null,
  de: string | null,
  id: string | null,
): string | null {
  if (modo === 'nuevo') {
    const clave = claveDeGrupoDe(de)
    const vista = clave === null ? null : vistaDelGrupo(vistas, clave)
    if (clave === null || vista === null) {
      return MOTIVO_DE_GRUPO_NO_DISPONIBLE
    }
    if (!vista.puedeCambiar) {
      return motivoDeSoloLectura(clave)
    }
    return alTopeDelGrupo(vista.grupo) ? textoDelTope(vista.grupo.tope) : null
  }
  if (modo === 'editar') {
    const hallado = buscarTipo(vistas, id)
    if (!hallado) {
      return MOTIVO_DE_TIPO_NO_DISPONIBLE
    }
    return hallado.vista.puedeCambiar ? null : motivoDeSoloLectura(hallado.clave)
  }
  return null
}

export function usoDe(vista: VistaDeGrupo, tipo: TipoDeDocumento): UsoDeTipo | null {
  return vista.uso?.[tipo.id] ?? null
}

// Con uso no se elimina: se desactiva y sigue nombrando lo que ya lo usa (D9).
export function motivoParaNoEliminar(uso: UsoDeTipo | null): string | null {
  return tipoEnUso(uso) && uso ? `${textoDelUso(uso)}: se desactiva en lugar de eliminarse.` : null
}

export function motivoParaNoEliminarPorUrl(
  vistas: VistasDeGrupos,
  id: string | null,
): string | null {
  const hallado = buscarTipo(vistas, id)
  if (!hallado) {
    return MOTIVO_DE_TIPO_NO_DISPONIBLE
  }
  if (!hallado.vista.puedeCambiar) {
    return motivoDeSoloLectura(hallado.clave)
  }
  return motivoParaNoEliminar(usoDe(hallado.vista, hallado.tipo))
}

// El borrador del modal en la pestaña: uno por grupo y por tipo (o el nuevo del grupo).
export function claveDelBorrador(clave: ClaveDeGrupo, id: string | null): string {
  return `tipo-de-documento:${clave}:${id ?? 'nuevo'}`
}

// El orden de un grupo, en una línea: si cambia, la página trajo la lista reordenada (las escrituras no la devuelven).
export function firmaDelOrden(tipos: readonly TipoDeDocumento[]): string {
  return tipos.map((tipo) => tipo.id).join('|')
}
