// Qué muestran C y Ejemplo en una fila de la planilla (glosario: «Ejemplo (columna)»), con una regla: la misma cifra no se dibuja dos veces en una fila. C es lo
// que guarda la fórmula: el valor fijo, el texto en A1 de un cálculo («=C5+C7») o, en lo que la fórmula no guarda (lo que escribe el asesor, un dato del
// vehículo, un interruptor, una variante, un tipo de cambio, una tabla, un tramo), «de dónde sale» en corto. Ejemplo es lo que da la fila con la unidad de
// ejemplo: nada en un valor fijo (su número ya está en C), lo de la unidad en las filas que se llenan al cotizar (se escribe ahí) y la cifra en las demás.
// Se calcula una vez por fórmula de trabajo, no al tipear. Puro.
import type { Nodo } from '../nodos'
import type { HojaDeLaPlanilla } from './hoja-de-la-planilla'
import { esDeLaUnidad, formulaEnA1 } from './texto-de-la-celda'

export type ContenidoDeC =
  // El número lo dibuja la celda desde `params` (cambia sin volver a calcular esto).
  | { readonly tipo: 'valor_fijo' }
  | { readonly tipo: 'formula'; readonly texto: string }
  | { readonly tipo: 'de_donde_sale'; readonly texto: string }

export type ContenidoDelEjemplo = 'nada' | 'unidad' | 'cifra'

export type ContenidoDeLaFila = { readonly c: ContenidoDeC; readonly ejemplo: ContenidoDelEjemplo }

export type ContextoDelContenido = {
  readonly hoja: HojaDeLaPlanilla
  // El texto vigente de la fila con ids (si se escribe como texto); nulo si no.
  readonly textoConIds: string | null
  // «De dónde sale» de la fila.
  readonly dicho: string
}

const VALOR_FIJO: ContenidoDeLaFila = { c: { tipo: 'valor_fijo' }, ejemplo: 'nada' }

export function contenidoDeLaFila(nodo: Nodo, ctx: ContextoDelContenido): ContenidoDeLaFila {
  if (nodo.tipo === 'constante') return VALOR_FIJO
  const ejemplo: ContenidoDelEjemplo = esDeLaUnidad(nodo) ? 'unidad' : 'cifra'
  if (nodo.tipo === 'calculo' && ctx.textoConIds !== null)
    return { c: { tipo: 'formula', texto: formulaEnA1(ctx.textoConIds, ctx.hoja) }, ejemplo }
  return { c: { tipo: 'de_donde_sale', texto: ctx.dicho }, ejemplo }
}
