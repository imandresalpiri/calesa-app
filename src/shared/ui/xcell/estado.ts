// Lo puro de la XCell: los estados que salen del binding, cómo se lee lo tipeado y cuándo hay un cambio que emitir. Sin React y sin
// I/O: la celda NO calcula nada del cotizador, sólo traduce lo que la persona escribe a un número y se lo dice a la hoja.
import { avisoDeNumero, leerNumeroTipeado } from '@/shared/lib/numero-tipeado'
import { formatearParaEditar } from '@/shared/lib/formato'

export type FormatoDeXCell = 'monto' | 'porcentaje' | 'numero'

// Las cifras significativas que la base conserva al leer un número (el cast de `cotizacion_evaluar`).
const CIFRAS = 15

export function normalizar(n: number): number {
  return Number(n.toPrecision(CIFRAS))
}

// Los estados de una celda salen de lo que el binding trae (`docs/COTIZADOR.md` › «Binding con la XCell»). Se SUMAN: una celda
// puede ser sugerida y estar deshabilitada. «Modificado» gana sobre «sugerido»: con un override ya no hay sugerido en uso (4-1).
export type EntradaDeEstado = {
  suggested: boolean
  overridden: boolean
  disabledReason: string | undefined
}

export function estadosDe({ suggested, overridden, disabledReason }: EntradaDeEstado): string {
  const estados = [
    ...(overridden ? ['modificado'] : suggested ? ['sugerido'] : []),
    ...(disabledReason !== undefined && disabledReason !== '' ? ['deshabilitado'] : []),
  ]
  return estados.length === 0 ? 'normal' : estados.join(' ')
}

export type EntradaDeAcciones = {
  id: string
  overridden: boolean
  bloqueada: boolean
  defaultValue?: number | null | undefined
  handEdited?: boolean | undefined
  hasHelp?: boolean | undefined
  hasSettings?: boolean | undefined
  onHelp?: ((id: string) => void) | undefined
  onSettings?: ((id: string) => void) | undefined
}

export type Acciones = {
  alAyudar: (() => void) | null
  alAjustar: (() => void) | null
  // `null` = sin ↺; si no, lo que dice («Volver al valor por defecto», «Volver al calculado» o «Volver al sugerido»; nunca la cifra).
  restablecer: string | null
  // ¿Hay algo que se alcance con →? Lo anuncia el valor.
  hay: boolean
}

// Qué acciones tiene una celda. La ayuda y el ⚙ piden la bandera Y con qué responder (una bandera sin callback sería un botón muerto) y
// siguen en una celda deshabilitada (no escriben en esta cotización); ↺ sí escribe, y con el candado se va.
export function accionesDe(e: EntradaDeAcciones): Acciones {
  const { id, onHelp, onSettings } = e
  const alAyudar =
    e.hasHelp === true && onHelp !== undefined
      ? () => {
          onHelp(id)
        }
      : null
  const alAjustar =
    e.hasSettings === true && onSettings !== undefined
      ? () => {
          onSettings(id)
        }
      : null
  const restablecer = e.overridden && !e.bloqueada ? aDondeVuelve(e) : null
  return {
    alAyudar,
    alAjustar,
    restablecer,
    hay: alAyudar !== null || alAjustar !== null || restablecer !== null,
  }
}

// A dónde vuelve ↺: el valor por defecto de una constante o un tipo de cambio; lo que la fórmula calcula, en un cálculo pisado (`docs/COTIZADOR.md` ›
// «Pisar un cálculo»); si no, el sugerido (el de la logística de una línea de `repuestos`).
function aDondeVuelve(e: EntradaDeAcciones): string {
  if (e.defaultValue !== undefined) {
    return 'Volver al valor por defecto'
  }
  return e.handEdited === true ? 'Volver al calculado' : 'Volver al sugerido'
}

export type Tipeado = { ok: true; valor: number | null } | { ok: false; aviso: string }

// Lo que se escribe, con el lector de toda la app (`leerNumeroTipeado`, 4-25) y el locale de la empresa: en es-BO «1.234» es 1234 y «1.5» no se
// lee, con su aviso. Vacío es `null`; lo que no es un número finito («Infinity», «1e3», «1,2,3») no se lee.
// Un porcentaje se tipea en puntos («14,94») y sale como la fracción que guarda `valores` (0,1494): una unidad, no un cálculo.
export function leerTipeado(texto: string, formato: FormatoDeXCell, locale: string): Tipeado {
  const leido = leerNumeroTipeado(texto, locale)
  if (!leido.ok) {
    return { ok: false, aviso: avisoDeNumero(texto, leido.motivo, locale) }
  }
  if (leido.valor === null) {
    return { ok: true, valor: null }
  }
  return {
    ok: true,
    valor: normalizar(formato === 'porcentaje' ? leido.valor / 100 : leido.valor),
  }
}

// El texto con el que se abre la edición: la precisión completa, no los decimales con que se muestra.
export function textoParaEditar(
  valor: number | null,
  formato: FormatoDeXCell,
  locale: string,
): string {
  if (valor === null) {
    return ''
  }
  return formatearParaEditar(formato === 'porcentaje' ? valor * 100 : valor, { locale })
}

// ¿Hay algo que emitir? El texto cambió Y el número leído (a 15 cifras) es otro que el del binding (a 15 cifras: `value` puede traer más).
// Abrir y salir sin tocar nada, o reescribir lo mismo («1234,5670»), no emite: un sugerido no se vuelve override por pasar por la celda.
export function hayCambio(
  abierto: string,
  escrito: string,
  nuevo: number | null,
  actual: number | null,
): boolean {
  if (escrito === abierto) {
    return false
  }
  return nuevo !== (actual === null ? null : normalizar(actual))
}

// ¿Esta tecla abre la edición con su carácter? Cualquier carácter imprimible menos el espacio (que activa el botón).
export function abreConSuCaracter(tecla: string, ctrl: boolean, meta: boolean, alt: boolean) {
  return tecla.length === 1 && tecla !== ' ' && !ctrl && !meta && !alt
}

// El aviso de lo tipeado o el error de la base: siempre escrito bajo la celda.
export type Nota = { texto: string; esError: boolean }

// Lo que dice la primera línea de abajo de la celda, por prioridad: el aviso de lo tipeado que no se leyó y, si no, lo que dijo la base. Describe a todos los lados.
export function notaDe(
  aviso: string | null | undefined,
  error: string | undefined,
): Nota | undefined {
  if (aviso !== null && aviso !== undefined) {
    return { texto: aviso, esError: true }
  }
  if (error !== undefined && error !== '') {
    return { texto: error, esError: true }
  }
  return undefined
}

export type Lado = 'principal' | 'secundario'

// El candado de cada lado (4.13-3c): el principal es el de `disabledReason`; el del secundario, el de `secondaryDisabledReason`. Vacío es sin candado.
export type Candados = { principal: string | undefined; secundario: string | undefined }

const motivo = (texto: string | undefined) => (texto === '' ? undefined : texto)

// Los candados de la celda desde sus props y, si TODOS sus lados están bloqueados, el motivo de la celda entera (su borde discontinuo y sin ↺).
export function candadosDe(
  disabledReason: string | undefined,
  secondaryDisabledReason: string | undefined,
  hayPar: boolean,
): { candados: Candados; toda: string | undefined } {
  const candados = {
    principal: motivo(disabledReason),
    secundario: hayPar ? motivo(secondaryDisabledReason) : undefined,
  }
  const toda =
    candados.principal !== undefined && (!hayPar || candados.secundario !== undefined)
      ? candados.principal
      : undefined
  return { candados, toda }
}

export type NotaConId = { id: string; nota: Nota }
// El candado de un lado bloqueado (uno por texto distinto): su motivo es su nombre y la descripción del lado.
export type CandadoConId = { id: string; texto: string }

// Lo que dice una celda pisada (un cálculo con lo escrito encima): la marca «Editado a mano» y, si llegó lo que daría sin lo escrito, su nota.
export type Pisada = { marca: boolean; calculado: boolean }

export const SIN_PISAR: Pisada = { marca: false, calculado: false }

export type NotasDeXCell = {
  // El aviso de lo tipeado o el error, escrito bajo la celda (`role=alert`).
  aviso: NotaConId | undefined
  // Los ids de la marca «Editado a mano» y de la nota «Calculado: …», si se dibujan.
  marca: string | undefined
  calculado: string | undefined
  // Los candados, en la fila de acciones.
  candados: CandadoConId[]
  // Lo que describe cada botón: el aviso o el error, la marca y lo calculado, y SU candado (nunca el del otro lado).
  deLado: Record<Lado, string | undefined>
  // La entrada abierta: sólo el aviso o el error (su lado no tiene candado: si lo tuviera no estaría abierta).
  deLaEntrada: string | undefined
}

// Un candado por texto distinto, con su id, y el id del que toca a cada lado (dos lados con el mismo motivo comparten uno).
function candadosConId(prefijo: string, candados: Candados) {
  const lista: CandadoConId[] = []
  const deLado: Partial<Record<Lado, string>> = {}
  for (const lado of ['principal', 'secundario'] as const) {
    const texto = motivo(candados[lado])
    if (texto === undefined) {
      continue
    }
    const igual = lista.find((c) => c.texto === texto)
    const id = igual?.id ?? `${prefijo}c${String(lista.length)}`
    if (igual === undefined) {
      lista.push({ id, texto })
    }
    deLado[lado] = id
  }
  return { lista, deLado }
}

const unir = (...ids: (string | undefined)[]) => {
  const presentes = ids.filter((id) => id !== undefined)
  return presentes.length === 0 ? undefined : presentes.join(' ')
}

// El aviso de una celda y sus candados, con sus ids y a quién describe cada uno: el aviso o el error describe a todos los lados y el candado de cada lado
// bloqueado, a ese lado; un candado por texto distinto (dos lados con el mismo motivo dan uno solo, que describe a los dos). El error y un candado conviven:
// un lado bloqueado nunca queda sin su motivo. La marca «Editado a mano» y lo calculado son de la celda: describen a todos los lados, después del aviso.
// Sin par, `candadosDe()` ya deja el secundario sin candado.
export function notasDe(
  prefijo: string,
  aviso: Nota | undefined,
  candados: Candados,
  pisada: Pisada = SIN_PISAR,
): NotasDeXCell {
  const idDelAviso = aviso === undefined ? undefined : `${prefijo}n`
  const idDeLaMarca = pisada.marca ? `${prefijo}m` : undefined
  const idDelCalculado = pisada.marca && pisada.calculado ? `${prefijo}k` : undefined
  const conId = candadosConId(prefijo, candados)
  const deLaCelda = [idDelAviso, idDeLaMarca, idDelCalculado]
  return {
    aviso:
      idDelAviso === undefined || aviso === undefined ? undefined : { id: idDelAviso, nota: aviso },
    marca: idDeLaMarca,
    calculado: idDelCalculado,
    candados: conId.lista,
    deLado: {
      principal: unir(...deLaCelda, conId.deLado.principal),
      secundario: unir(...deLaCelda, conId.deLado.secundario),
    },
    deLaEntrada: idDelAviso,
  }
}
