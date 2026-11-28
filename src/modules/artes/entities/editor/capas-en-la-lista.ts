// Lo que decide la lista de «Capas» del editor de artes: con qué modo elige un clic (Mayús suma, Ctrl o ⌘ alterna; solo, reemplaza), qué
// elige cada fila (la de una capa, esa capa sola; la de un grupo, todos sus miembros), si una fila se ve elegida, con qué nombre se ve y por
// qué «Agrupar» o «Desagrupar» no se puede con lo elegido. Puro.
import { MAXIMO_DE_GRUPOS_POR_PAGINA, type PaginaDeArte } from '../documento'
import type { LogoDelEditor } from '../tipos'
import { nombreVisible } from './capas-nuevas'
import type { ModoDeElegir } from './estado'
import type { FilaDeCapas } from './orden'

export const MOTIVO_PARA_AGRUPAR = 'Elige dos o más elementos para agruparlos.'
export const MOTIVO_YA_AGRUPADOS = 'Ya forman un grupo.'
export const MOTIVO_DEL_TOPE_DE_GRUPOS = `Una página lleva hasta ${String(MAXIMO_DE_GRUPOS_POR_PAGINA)} grupos.`
export const MOTIVO_PARA_DESAGRUPAR = 'Elige un grupo para desagruparlo.'

// La variante del logo que se dibuja cuando la capa no nombra ninguna.
const LOGO_PRINCIPAL = 'principal'

export type TeclasDelClic = { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }

export function modoDelClic(teclas: TeclasDelClic): ModoDeElegir {
  if (teclas.ctrlKey || teclas.metaKey) {
    return 'alternar'
  }
  return teclas.shiftKey ? 'sumar' : 'reemplazar'
}

// El id de la fila: el de la capa o el del grupo (lo que arrastra «Capas» y lo que ocultan, bloquean y renombran sus botones).
export function idDeLaFila(fila: FilaDeCapas): string {
  return fila.tipo === 'grupo' ? fila.grupo.id : fila.capa.id
}

export function idsDeLaFila(pagina: PaginaDeArte, fila: FilaDeCapas): string[] {
  return idsAlElegirLaFila(pagina, idDeLaFila(fila))
}

// Lo mismo desde el id de la fila: el de un grupo elige sus miembros; el de una capa, a ella.
export function idsAlElegirLaFila(pagina: PaginaDeArte, id: string): string[] {
  if (!pagina.grupos.some((g) => g.id === id)) {
    return [id]
  }
  return pagina.capas.filter((c) => c.grupoId === id).map((c) => c.id)
}

// La fila de una capa, si está elegida; la de un grupo, si lo están todos sus miembros.
export function filaElegida(
  pagina: PaginaDeArte,
  fila: FilaDeCapas,
  seleccion: ReadonlySet<string>,
): boolean {
  const ids = idsDeLaFila(pagina, fila)
  return ids.length > 0 && ids.every((id) => seleccion.has(id))
}

// El nombre del grupo, o el de la capa (`nombreVisible()`, con el de la variante si es el logo).
export function nombreDeLaFila(fila: FilaDeCapas, logos: readonly LogoDelEditor[]): string {
  if (fila.tipo === 'grupo') {
    return fila.grupo.nombre
  }
  const { capa } = fila
  if (capa.tipo !== 'logo') {
    return nombreVisible(capa)
  }
  const variante = capa.varianteId ?? LOGO_PRINCIPAL
  return nombreVisible(capa, logos.find((l) => l.id === variante)?.nombre)
}

// Nulo si «Agrupar» se puede: dos o más capas elegidas que no sean ya, todas y solas, un grupo; y lugar para un grupo más.
export function motivoParaAgrupar(
  pagina: PaginaDeArte,
  seleccion: readonly string[],
): string | null {
  const elegidas = new Set(seleccion)
  const capas = pagina.capas.filter((c) => elegidas.has(c.id))
  if (capas.length < 2) {
    return MOTIVO_PARA_AGRUPAR
  }
  const grupoId = capas[0]?.grupoId ?? null
  const unSoloGrupo =
    grupoId !== null && pagina.capas.every((c) => (c.grupoId === grupoId) === elegidas.has(c.id))
  if (unSoloGrupo) {
    return MOTIVO_YA_AGRUPADOS
  }
  return pagina.grupos.length >= MAXIMO_DE_GRUPOS_POR_PAGINA ? MOTIVO_DEL_TOPE_DE_GRUPOS : null
}

// Nulo si «Desagrupar» se puede: alguna capa elegida está en un grupo.
export function motivoParaDesagrupar(
  pagina: PaginaDeArte,
  seleccion: readonly string[],
): string | null {
  const elegidas = new Set(seleccion)
  const enGrupo = pagina.capas.some((c) => elegidas.has(c.id) && c.grupoId !== null)
  return enGrupo ? null : MOTIVO_PARA_DESAGRUPAR
}
