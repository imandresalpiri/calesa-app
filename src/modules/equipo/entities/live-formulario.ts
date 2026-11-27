// El formulario de los modales de Configuración › Modo Live: cada campo es una opción de texto (la del `<select>`) y «Orígenes» lleva aparte sus
// casillas. El del rol empieza de lo combinado con lo por defecto y guarda todo lo que se ve; el de la persona empieza vacío en lo que no pisa
// (`HEREDADO`: «Como su rol (…)») y guarda sólo lo que pisa.
import { combinarAjustesDelLive } from './live-combinar'
import { opcionDelValor } from './live-textos'
import {
  AJUSTES_POR_DEFECTO_DEL_LIVE,
  CAMPOS_DEL_LIVE,
  MOTIVO_SIN_ORIGENES,
  esquemaDeAjustesParcialesDelLive,
  type AjustesParcialesDelLive,
  type CampoDelLive,
  type OrigenesDelLive,
} from './live'

export const HEREDADO = ''

export type FormularioDelLive = {
  valores: Readonly<Record<CampoDelLive, string>>
  // Los orígenes marcados con «Sólo estos» (se conservan al pasar a «Todos» y volver).
  elegidos: readonly string[]
}

function porCampo(valor: (campo: CampoDelLive) => string): Record<CampoDelLive, string> {
  const valores: Partial<Record<CampoDelLive, string>> = {}
  for (const campo of CAMPOS_DEL_LIVE) {
    valores[campo] = valor(campo)
  }
  return valores as Record<CampoDelLive, string>
}

export function formularioDelRol(ajustes: AjustesParcialesDelLive | null): FormularioDelLive {
  const { ajustes: combinados } = combinarAjustesDelLive({ rol: ajustes, persona: null })
  return {
    valores: porCampo((campo) => opcionDelValor(campo, combinados[campo])),
    elegidos: combinados.origenes === 'todos' ? [] : [...combinados.origenes],
  }
}

export function formularioDeLaPersona(ajustes: AjustesParcialesDelLive | null): FormularioDelLive {
  return {
    valores: porCampo((campo) => {
      const propio = ajustes?.[campo]
      return propio === undefined ? HEREDADO : opcionDelValor(campo, propio)
    }),
    elegidos: Array.isArray(ajustes?.origenes) ? [...ajustes.origenes] : [],
  }
}

function valorDeLaOpcion(
  campo: CampoDelLive,
  opcion: string,
  elegidos: readonly string[],
): unknown {
  if (campo === 'origenes') {
    return opcion === 'todos' ? 'todos' : elegidos
  }
  if (typeof AJUSTES_POR_DEFECTO_DEL_LIVE[campo] === 'boolean') {
    return opcion === 'si'
  }
  return opcion
}

export type LecturaDelFormulario =
  | { ok: true; ajustes: AjustesParcialesDelLive }
  | { ok: false; campo: CampoDelLive; motivo: string }

// Lo que se guarda, validado con el mismo esquema que la action (y la base): «Sólo estos» sin ninguno marcado no se guarda.
export function leerFormulario(formulario: FormularioDelLive): LecturaDelFormulario {
  if (formulario.valores.origenes === 'estos' && formulario.elegidos.length === 0) {
    return { ok: false, campo: 'origenes', motivo: MOTIVO_SIN_ORIGENES }
  }
  const crudo: Partial<Record<CampoDelLive, unknown>> = {}
  for (const campo of CAMPOS_DEL_LIVE) {
    const opcion = formulario.valores[campo]
    if (opcion !== HEREDADO) {
      crudo[campo] = valorDeLaOpcion(campo, opcion, formulario.elegidos)
    }
  }
  const leido = esquemaDeAjustesParcialesDelLive.safeParse(crudo)
  if (leido.success) {
    return { ok: true, ajustes: leido.data }
  }
  const problema = leido.error.issues[0]
  const campo = CAMPOS_DEL_LIVE.find((c) => c === problema?.path[0]) ?? 'origenes'
  return { ok: false, campo, motivo: problema?.message ?? 'Revisa este campo.' }
}

function mismosOrigenes(a: OrigenesDelLive | undefined, b: OrigenesDelLive | undefined): boolean {
  if (a === undefined || b === undefined || a === 'todos' || b === 'todos') {
    return a === b
  }
  const enA = new Set(a)
  const enB = new Set(b)
  return enA.size === enB.size && [...enA].every((id) => enB.has(id))
}

// ¿Dicen lo mismo? Los orígenes, sin importar el orden ni los repetidos.
export function mismosAjustes(
  a: AjustesParcialesDelLive | null,
  b: AjustesParcialesDelLive | null,
): boolean {
  return CAMPOS_DEL_LIVE.every((campo) =>
    campo === 'origenes' ? mismosOrigenes(a?.origenes, b?.origenes) : a?.[campo] === b?.[campo],
  )
}

// Las casillas de origen, siempre a la vista: con «Sólo estos» se eligen; con «Todos» (o lo heredado) quedan apagadas y dicen qué vale.
export function casillasDeOrigenes(
  formulario: FormularioDelLive,
  heredado: OrigenesDelLive,
): { todas: boolean; marcados: ReadonlySet<string>; apagadas: boolean } {
  const opcion = formulario.valores.origenes
  if (opcion === 'estos') {
    return { todas: false, marcados: new Set(formulario.elegidos), apagadas: false }
  }
  const vale = opcion === HEREDADO ? heredado : 'todos'
  return vale === 'todos'
    ? { todas: true, marcados: new Set(), apagadas: true }
    : { todas: false, marcados: new Set(vale), apagadas: true }
}

// Elegir otra opción de un campo. Al pasar a «Sólo estos» sin ninguno marcado, empieza por lo que las casillas mostraban.
export function conLaOpcion(
  formulario: FormularioDelLive,
  campo: CampoDelLive,
  opcion: string,
  { heredado, activos }: { heredado: OrigenesDelLive; activos: readonly string[] },
): FormularioDelLive {
  const valores = { ...formulario.valores, [campo]: opcion }
  if (campo !== 'origenes' || opcion !== 'estos' || formulario.elegidos.length > 0) {
    return { ...formulario, valores }
  }
  const casillas = casillasDeOrigenes(formulario, heredado)
  return { valores, elegidos: casillas.todas ? [...activos] : [...casillas.marcados] }
}

export function conElOrigen(
  formulario: FormularioDelLive,
  id: string,
  marcado: boolean,
): FormularioDelLive {
  const sin = formulario.elegidos.filter((otro) => otro !== id)
  return { ...formulario, elegidos: marcado ? [...sin, id] : sin }
}
