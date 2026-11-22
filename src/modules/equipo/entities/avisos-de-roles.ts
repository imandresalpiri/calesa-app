// Los avisos de la matriz de Roles: por qué algo no se puede cambiar. No se dibujan en línea: un botón «!» los abre en un modal
// («Avisos de <rol>», «Avisos de Roles y permisos»). Reglas puras: el texto es el de siempre, sólo cambia dónde se ve.
import { MOTIVO_SIN_GESTIONAR_ROLES } from './cuadro-de-cotizaciones'
import { MOTIVO_ROL_NO_DOMINADO } from './dominancia'
import { motivoDeNoEliminar, type RolConConcesiones } from './rol'

export const TITULO_DE_AVISOS_DE_LA_PAGINA = 'Avisos de Roles y permisos'

export const AVISO_DE_LA_PAGINA_CON_PERMISO =
  'Cada cambio se guarda solo. Sólo puedes dar permisos que tú tienes: lo que no puedes cambiar aparece deshabilitado.'
export const AVISO_DE_LA_PAGINA_SIN_PERMISO =
  'Qué puede hacer cada rol. Para cambiarlo hace falta el permiso de gestionar roles.'

export function tituloDeAvisosDelRol(nombre: string): string {
  return `Avisos de ${nombre}`
}

// El nombre del botón «!»: con más de un aviso, dice cuántos.
export function nombreDelBotonDeAvisos(titulo: string, cantidad: number): string {
  return cantidad > 1 ? `${titulo} (${cantidad})` : titulo
}

// Lo que dice la página junto a «Roles y permisos»: uno con permiso de gestionar roles y dos sin él (el segundo es el del resumen «Quién crea y quién ve»).
export function avisosDeLaPagina(puedeGestionar: boolean): string[] {
  return puedeGestionar
    ? [AVISO_DE_LA_PAGINA_CON_PERMISO]
    : [AVISO_DE_LA_PAGINA_SIN_PERMISO, MOTIVO_SIN_GESTIONAR_ROLES]
}

// Lo que impide cambiar o eliminar un rol, en el orden en que se dice: que no lo domina y, si hay otro, por qué no se elimina. Sólo a quien gestiona roles: a
// quien no, nada de esto se le ofrece. Un rol sin avisos es lista vacía (y no lleva botón). La dominancia sale de los permisos que ya tiene la matriz:
// nunca falta, así que no hay un aviso de «no se pudo leer».
export function avisosDelRol(
  rol: Pick<RolConConcesiones, 'esSistema' | 'personas'>,
  { dominado, puedeGestionar }: { dominado: boolean; puedeGestionar: boolean },
): string[] {
  if (!puedeGestionar) {
    return []
  }
  const avisos = dominado ? [] : [MOTIVO_ROL_NO_DOMINADO]
  const motivo = motivoDeNoEliminar(rol, dominado)
  if (motivo !== null && !avisos.includes(motivo)) {
    avisos.push(motivo)
  }
  return avisos
}
