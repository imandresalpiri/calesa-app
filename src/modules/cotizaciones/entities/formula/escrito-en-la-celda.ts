// Qué hace lo que se escribe en una celda de la planilla (D11 del cambio de la planilla). A: el concepto. B: el valor del % (una constante). C, según su tipo:
// algo con «=» se traduce de A1 a ids (`deA1()`) y se compila (`compilarFila()`, con «Pisar el valor» como siempre); una fila del asesor, un dato del vehículo,
// un interruptor o una variante pasan antes a valor fijo. Sin «=»: el valor de una constante o un cálculo que pasa a valor fijo; en una fila que se llena al
// cotizar, un número no se guarda (el ejemplo va en la columna Ejemplo) y vacío no cambia nada. Ejemplo (clave interna `D`): el valor de la unidad de ejemplo
// (lo que escribe el asesor, el dato del vehículo, «Sí»/«No», la opción). Un tipo de cambio o una tabla no se escriben. Un error deja la edición abierta con su
// tramo en lo tipeado. Puro y nunca lanza; no toca lo que recibe.
import { leerNumeroTipeado } from '@/shared/lib/numero-tipeado'
import type { CatalogoDeTablas, Tramo } from '../compilador'
import type { Formula } from '../formula'
import type { Medidor } from '../medidor'
import { formatoDe, type Nodo } from '../nodos'
import { valorTipeado } from './ajuste'
import { compilarFila, type CambioQueSePisa, type ErrorDeFila } from './compilar-fila'
import { deA1, tramoEnLoTipeado } from './de-a1'
import { bDe, filaDe, hojaDeLaPlanilla, type HojaDeLaPlanilla } from './hoja-de-la-planilla'
import { mensajeEnA1 } from './mensaje-en-a1'
import { nombrarConLaHoja } from './referencias-a1'
import {
  esDeLaUnidad,
  MOTIVO_DEL_EJEMPLO,
  MOTIVO_SIN_PORCENTAJE,
  motivoDelEjemploDeUnValorFijo,
  opcionElegida,
} from './texto-de-la-celda'
import { cambiarTipo } from './tipo-de-celda'
import type { UnidadDeEjemplo, ValorDelVehiculo } from './unidad-de-ejemplo'
import { cambiarValorDeConstante } from './valor-en-la-planilla'

export type CambioDeLaUnidad =
  | { readonly tipo: 'input'; readonly id: string; readonly valor: number }
  | { readonly tipo: 'bandera'; readonly id: string; readonly valor: boolean }
  | { readonly tipo: 'campo'; readonly campo: string; readonly valor: ValorDelVehiculo }
  | { readonly tipo: 'variante'; readonly clave: string }

// Un valor que recompilar pisaría, con su celda («B6 (% de Seguro)»).
export type PisadoEnLaCelda = CambioQueSePisa & { readonly nombre: string }

export type ErrorDeLaCelda = {
  readonly mensaje: string
  // Sobre lo tipeado; nulo si el error no es de un tramo.
  readonly tramo: Tramo | null
  // Una referencia hacia abajo: la fila más abajo que nombra («Mover esta fila debajo de la N»).
  readonly moverDebajoDe: number | null
  // Con «Pisar el valor»: lo que se pisaría.
  readonly pisa: readonly PisadoEnLaCelda[] | null
}

export type LoAplicado =
  | { readonly tipo: 'formula'; readonly formula: Formula; readonly soltados: readonly string[] }
  | { readonly tipo: 'unidad'; readonly cambio: CambioDeLaUnidad }
  | { readonly tipo: 'error'; readonly error: ErrorDeLaCelda }
  // Nada que cambiar (la C vacía de una fila que se llena al cotizar).
  | { readonly tipo: 'nada' }

export type ColumnaQueSeEscribe = 'A' | 'B' | 'C' | 'D'

export type PedidoDeLaCelda = {
  readonly formula: Formula
  readonly hoja: HojaDeLaPlanilla
  readonly numero: number
  readonly col: ColumnaQueSeEscribe
  readonly texto: string
  readonly locale: string
  readonly tablas: CatalogoDeTablas
  readonly confirmaPisar?: boolean
  // El contador de visitas de `compilarFila()` (las pruebas de escala del resultado al lado).
  readonly medidor?: Medidor
}

export const MAXIMO_DEL_CONCEPTO = 80
export const MENSAJE_SIN_CONCEPTO = 'Escribe el concepto.'
export const MENSAJE_DEL_CALCULO_VACIO = 'Escribe un número o una fórmula que empiece con «=».'
export const MENSAJE_NO_SE_ESCRIBE = 'Esta celda no se escribe. Cambia su tipo en «Tipo de celda».'
export const MENSAJE_SI_O_NO = 'Escribe «Sí» o «No».'
const PARA_UN_VALOR_FIJO =
  'el ejemplo va en la columna Ejemplo. Para un valor fijo, cambia su tipo en «Tipo de celda».'
export const MENSAJE_DEL_ASESOR_EN_C = `Esta celda la escribe el asesor al cotizar: ${PARA_UN_VALOR_FIJO}`
export const MENSAJE_AL_COTIZAR_EN_C = `Esta celda se llena al cotizar: ${PARA_UN_VALOR_FIJO}`
export const mensajeDeFormulaEnElEjemplo = (numero: number) =>
  `Ejemplo es el valor de la unidad de ejemplo: la fórmula va en C${String(numero)}.`

const error = (mensaje: string, de: Partial<ErrorDeLaCelda> = {}): LoAplicado => ({
  tipo: 'error',
  error: { mensaje, tramo: null, moverDebajoDe: null, pisa: null, ...de },
})

const formula = (f: Formula, soltados: readonly string[] = []): LoAplicado => ({
  tipo: 'formula',
  formula: f,
  soltados,
})

const unidad = (cambio: CambioDeLaUnidad): LoAplicado => ({ tipo: 'unidad', cambio })

const deValor = (r: ReturnType<typeof cambiarValorDeConstante>): LoAplicado =>
  r.ok ? formula(r.formula) : error(r.mensaje)

// --- A y B ------------------------------------------------------------------------------------------

function escribirConcepto(p: PedidoDeLaCelda, nodo: Nodo): LoAplicado {
  const etiqueta = p.texto.trim()
  if (etiqueta === '') return error(MENSAJE_SIN_CONCEPTO)
  if (etiqueta.length > MAXIMO_DEL_CONCEPTO) return error('El concepto pasa de 80 caracteres.')
  const nodos = p.formula.definicion.nodos.map((n) => (n.id === nodo.id ? { ...n, etiqueta } : n))
  return formula({ ...p.formula, definicion: { ...p.formula.definicion, nodos } })
}

function escribirPorcentaje(p: PedidoDeLaCelda): LoAplicado {
  const b = bDe(p.hoja, p.numero)
  if (b === null) return error(MOTIVO_SIN_PORCENTAJE)
  const leido = valorTipeado(p.texto, 'pct', p.locale, null)
  return leido.ok
    ? deValor(cambiarValorDeConstante(p.formula, b.id, leido.valor))
    : error(leido.aviso)
}

// --- C con «=» --------------------------------------------------------------------------------------

const NO_SE_ESCRIBEN: ReadonlySet<Nodo['tipo']> = new Set(['tipo_cambio', 'tabla', 'tramo'])

function errorDelCompilador(
  e: ErrorDeFila,
  hoja: HojaDeLaPlanilla,
  mapa: Parameters<typeof tramoEnLoTipeado>[1],
  tipeado: string,
): LoAplicado {
  if (e.codigo === 'pisa_un_valor') {
    const nombrar = nombrarConLaHoja(hoja)
    const pisa = e.cambios.map((c) => {
      const n = nombrar(c.id)
      return {
        ...c,
        nombre: n === undefined ? 'un número de la fórmula' : `${n.celda} (${n.etiqueta})`,
      }
    })
    return error(e.mensaje, { pisa })
  }
  const tramo = 'tramo' in e ? tramoEnLoTipeado(e.tramo, mapa, tipeado) : null
  return error(mensajeEnA1(e.mensaje, hoja), { tramo })
}

// La fórmula donde se compila: la de siempre para un cálculo o un valor fijo; para las demás, con la fila ya en valor fijo.
function baseParaCompilar(
  p: PedidoDeLaCelda,
  nodo: Nodo,
): { formula: Formula; hoja: HojaDeLaPlanilla } | string {
  if (nodo.tipo === 'calculo' || nodo.tipo === 'constante')
    return { formula: p.formula, hoja: p.hoja }
  const r = cambiarTipo(p.formula, p.numero, { tipo: 'valor_fijo', valor: 0 }, p.hoja)
  return r.ok ? { formula: r.formula, hoja: hojaDeLaPlanilla(r.formula) } : r.mensaje
}

function compilarEnLaCelda(p: PedidoDeLaCelda, nodo: Nodo): LoAplicado {
  if (NO_SE_ESCRIBEN.has(nodo.tipo)) return error(MENSAJE_NO_SE_ESCRIBE)
  const base = baseParaCompilar(p, nodo)
  if (typeof base === 'string') return error(base)
  const grupos = new Set((base.formula.definicion.grupos ?? []).map((g) => g.id))
  const traducido = deA1(p.texto, base.hoja, p.numero, grupos)
  if (!traducido.ok) {
    const { mensaje, tramo, moverDebajoDe } = traducido.error
    return error(mensaje, { tramo, moverDebajoDe: moverDebajoDe ?? null })
  }
  const r = compilarFila(
    base.formula,
    {
      destino: { existente: nodo.id },
      texto: traducido.texto,
      confirmaPisar: p.confirmaPisar ?? false,
      tablas: p.tablas,
      nombrar: nombrarConLaHoja(base.hoja),
    },
    p.medidor,
  )
  if (!r.ok) return errorDelCompilador(r.error, base.hoja, traducido.mapa, p.texto)
  return formula(r.formula, r.soltados)
}

// --- C sin «=» --------------------------------------------------------------------------------------

const normal = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()

const SI = new Set(['si', 's', '1', 'verdadero', 'true'])
const NO = new Set(['no', 'n', '0', 'falso', 'false'])

function valorDelVehiculo(texto: string, locale: string): ValorDelVehiculo {
  if (texto.trim() === '') return null
  const leido = leerNumeroTipeado(texto, locale)
  return leido.ok && leido.valor !== null ? leido.valor : texto.trim()
}

function escribirEnLaUnidad(p: PedidoDeLaCelda, nodo: Nodo): LoAplicado {
  if (nodo.tipo === 'bandera') {
    const t = normal(p.texto)
    if (SI.has(t)) return unidad({ tipo: 'bandera', id: nodo.id, valor: true })
    return NO.has(t)
      ? unidad({ tipo: 'bandera', id: nodo.id, valor: false })
      : error(MENSAJE_SI_O_NO)
  }
  if (nodo.tipo === 'opcion') {
    const t = normal(p.texto)
    const o = nodo.opciones.find((x) => normal(x.clave) === t || normal(x.etiqueta) === t)
    if (o !== undefined) return unidad({ tipo: 'variante', clave: o.clave })
    return error(`Elige una de: ${nodo.opciones.map((x) => x.etiqueta).join(', ')}.`)
  }
  if (nodo.tipo === 'campo_vehiculo')
    return unidad({ tipo: 'campo', campo: nodo.campo, valor: valorDelVehiculo(p.texto, p.locale) })
  const leido = valorTipeado(p.texto, formatoDe(nodo), p.locale, null)
  return leido.ok ? unidad({ tipo: 'input', id: nodo.id, valor: leido.valor }) : error(leido.aviso)
}

function escribirValor(p: PedidoDeLaCelda, nodo: Nodo): LoAplicado {
  if (NO_SE_ESCRIBEN.has(nodo.tipo)) return error(MENSAJE_NO_SE_ESCRIBE)
  // La C de una fila que se llena al cotizar: vacía no cambia nada; un número no se guarda (no se vuelve valor fijo en silencio).
  if (esDeLaUnidad(nodo)) {
    if (p.texto.trim() === '') return { tipo: 'nada' }
    return error(nodo.tipo === 'input' ? MENSAJE_DEL_ASESOR_EN_C : MENSAJE_AL_COTIZAR_EN_C)
  }
  if (nodo.tipo === 'calculo' && p.texto.trim() === '') return error(MENSAJE_DEL_CALCULO_VACIO)
  const leido = valorTipeado(p.texto, formatoDe(nodo), p.locale, null)
  if (!leido.ok) return error(leido.aviso)
  if (nodo.tipo === 'constante')
    return deValor(cambiarValorDeConstante(p.formula, nodo.id, leido.valor))
  const r = cambiarTipo(p.formula, p.numero, { tipo: 'valor_fijo', valor: leido.valor }, p.hoja)
  return r.ok ? formula(r.formula) : error(r.mensaje)
}

// Ejemplo: sólo en una fila que se llena al cotizar, sin «=».
function escribirEnElEjemplo(p: PedidoDeLaCelda, nodo: Nodo): LoAplicado {
  if (!esDeLaUnidad(nodo))
    return error(
      nodo.tipo === 'constante' ? motivoDelEjemploDeUnValorFijo(p.numero) : MOTIVO_DEL_EJEMPLO,
    )
  if (p.texto.trimStart().startsWith('=')) return error(mensajeDeFormulaEnElEjemplo(p.numero))
  return escribirEnLaUnidad(p, nodo)
}

export function aplicarLoEscrito(p: PedidoDeLaCelda): LoAplicado {
  const fila = filaDe(p.hoja, p.numero)
  if (fila === undefined) return error('Esa fila ya no está.')
  if (p.col === 'A') return escribirConcepto(p, fila.nodo)
  if (p.col === 'B') return escribirPorcentaje(p)
  if (p.col === 'D') return escribirEnElEjemplo(p, fila.nodo)
  return p.texto.trimStart().startsWith('=')
    ? compilarEnLaCelda(p, fila.nodo)
    : escribirValor(p, fila.nodo)
}

// --- la unidad de ejemplo -----------------------------------------------------------------------------

// La unidad de ejemplo con el cambio hecho (no toca la de antes).
export function unidadConElCambio(u: UnidadDeEjemplo, cambio: CambioDeLaUnidad): UnidadDeEjemplo {
  switch (cambio.tipo) {
    case 'input':
      return { ...u, inputs: { ...u.inputs, [cambio.id]: cambio.valor } }
    case 'bandera':
      return { ...u, banderas: { ...u.banderas, [cambio.id]: cambio.valor } }
    case 'campo':
      return { ...u, vehiculo: { ...u.vehiculo, [cambio.campo]: cambio.valor } }
    case 'variante':
      return { ...u, variante: cambio.clave }
  }
}

// La barra espaciadora en el Ejemplo de un interruptor lo da vuelta; en la de una variante, pasa a la opción siguiente. Nulo en otra celda.
export function cambioAlAlternar(nodo: Nodo, u: UnidadDeEjemplo): CambioDeLaUnidad | null {
  if (nodo.tipo === 'bandera')
    return { tipo: 'bandera', id: nodo.id, valor: u.banderas[nodo.id] !== true }
  if (nodo.tipo !== 'opcion' || nodo.opciones.length === 0) return null
  const actual = nodo.opciones.findIndex((o) => o.clave === opcionElegida(nodo, u))
  const siguiente = nodo.opciones[(actual + 1) % nodo.opciones.length]
  return siguiente === undefined ? null : { tipo: 'variante', clave: siguiente.clave }
}
