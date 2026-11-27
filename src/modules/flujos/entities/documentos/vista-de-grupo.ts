// Lo que el drawer de los tipos de documento muestra de cada grupo y qué se puede abrir desde la URL. Puro: la pantalla lee los dos grupos en el servidor y
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
// y, el de los compartidos, cuáles tapa el flujo que se ve (nulo en el de los propios).
export type VistaDeGrupo = {
  grupo: GrupoDeTipos
  puedeCambiar: boolean
  uso: Record<string, UsoDeTipo> | null
  tapados: TapadosDelGrupo | null
}

// El drawer de los tipos dibuja los dos grupos: los del flujo que se ve (`origen`: «De Miami», o los del flujo de repuestos) y los compartidos, marcados los
// que ese flujo tapa. La clave también va en la URL (`?de=origen|compartido`).
export type VistasDeGrupos = { origen: VistaDeGrupo; compartido: VistaDeGrupo }

export const TITULO_DE_LOS_COMPARTIDOS = 'Compartidos'
export const MOTIVO_SOLO_LECTURA_DE_COMPARTIDOS =
  'Pídele a quien administra los roles el permiso de configurar la logística.'
export const MOTIVO_SOLO_LECTURA_DEL_FLUJO =
  'No puedes configurar los tipos de documento de este flujo.'
export const MOTIVO_DE_TIPO_NO_DISPONIBLE = 'Ese tipo de documento ya no existe.'

export function motivoDeSoloLectura(clave: ClaveDeGrupo): string {
  return clave === 'compartido' ? MOTIVO_SOLO_LECTURA_DE_COMPARTIDOS : MOTIVO_SOLO_LECTURA_DEL_FLUJO
}

// El grupo de un flujo se nombra por su dueño: su origen («De Miami») o, sin origen, el flujo de repuestos.
export function tituloDeLosPropios(origen: string | null): string {
  return origen === null ? 'Del flujo de repuestos' : `De ${origen}`
}

// Los compartidos que tapa el flujo de este origen (nulo: el de repuestos), con su insignia.
export function tapadosDelGrupo(ids: Iterable<string>, origen: string | null): TapadosDelGrupo {
  return { ids: [...ids], insignia: `Tapado por ${quienTapa(origen)}` }
}

// La insignia de un tipo del grupo si el flujo que se ve lo tapa; nula si no.
export function insigniaDeTapado(vista: VistaDeGrupo, tipo: TipoDeDocumento): string | null {
  return vista.tapados?.ids.includes(tipo.id) ? vista.tapados.insignia : null
}

// El grupo de `?de=`: sin valor (o uno que no es), `origen`.
export function claveDeGrupoDe(valor: string | null): ClaveDeGrupo {
  return valor === 'compartido' ? 'compartido' : 'origen'
}

// La clave del grupo de un tipo: sin flujo, compartido.
export function grupoDelTipo(tipo: Pick<TipoDeDocumento, 'flujoId'>): ClaveDeGrupo {
  return tipo.flujoId === null ? 'compartido' : 'origen'
}

// Dónde está un tipo (en el grupo que se ve) y de qué grupo es.
export function buscarTipo(
  vistas: VistasDeGrupos,
  id: string | null,
): { tipo: TipoDeDocumento; clave: ClaveDeGrupo; vista: VistaDeGrupo } | null {
  if (id === null) {
    return null
  }
  const grupos: [ClaveDeGrupo, VistaDeGrupo][] = [
    ['origen', vistas.origen],
    ['compartido', vistas.compartido],
  ]
  for (const [clave, vista] of grupos) {
    const tipo = vista.grupo.tipos.find((uno) => uno.id === id)
    if (tipo) {
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

// Por qué «Editar» no abre lo que pide la URL (`?accion=editar-tipo&tipo=<id>`, escrita a mano también); nulo si abre. «Nuevo» lo revisa
// `grupoParaCrear` (`quien-cambia-los-tipos.ts`): no depende de los grupos leídos, y el tope lo dice la base al guardar.
export function motivoParaNoEditarTipo(vistas: VistasDeGrupos, id: string | null): string | null {
  const hallado = buscarTipo(vistas, id)
  if (!hallado) {
    return MOTIVO_DE_TIPO_NO_DISPONIBLE
  }
  return hallado.vista.puedeCambiar ? null : motivoDeSoloLectura(hallado.clave)
}

// Lo que dice el drawer cuando no hay ningún tipo, ni propio ni compartido.
export function textoSinTipos(origen: string | null): string {
  return `Todavía no hay tipos de documento en ${origen ?? 'el flujo de repuestos'} ni compartidos.`
}

// Lo que dice un grupo vacío cuando el otro tiene alguno.
export function textoDelGrupoVacio(clave: ClaveDeGrupo, origen: string | null): string {
  return clave === 'compartido'
    ? 'Ninguno compartido.'
    : `Ninguno sólo de ${origen ?? 'el flujo de repuestos'}.`
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

// El borrador del modal en la pestaña: uno por tipo (o el nuevo, uno solo: «Para» se elige dentro).
export function claveDelBorrador(id: string | null): string {
  return `tipo-de-documento:${id ?? 'nuevo'}`
}

// El orden de un grupo, en una línea: si cambia, la página trajo la lista reordenada (las escrituras no la devuelven).
export function firmaDelOrden(tipos: readonly TipoDeDocumento[]): string {
  return tipos.map((tipo) => tipo.id).join('|')
}
