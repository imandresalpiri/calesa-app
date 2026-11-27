// El resultado al lado (D11 del cambio de la fórmula fácil): lo que daría la C que se escribe con la unidad de ejemplo, antes de aplicarla. Compila lo tipeado
// como al aplicar (`aplicarLoEscrito()`, con `confirmaPisar`: muestra lo que daría y el «Pisar el valor» sigue al aplicar), valida la fórmula que resultaría y
// la calcula con lo de prueba (`calcularLaVistaPrevia()`). Sólo una C que empieza con «=» y sólo una cifra (`valor` o `texto`); en cualquier otro caso, null.
// Puro, sin servidor y O(filas); nunca lanza.
import type { CatalogoDeTablas } from '../compilador'
import type { Formula, ModoDeCambio } from '../formula'
import type { Medidor } from '../medidor'
import { validarFormula } from '../validar'
import { aplicarLoEscrito, type ColumnaQueSeEscribe } from './escrito-en-la-celda'
import type { HojaDeLaPlanilla } from './hoja-de-la-planilla'
import { paramsParaValidar } from './params-para-validar'
import type { TerrenoDePrueba } from './terreno-de-prueba'
import type { UnidadDeEjemplo } from './unidad-de-ejemplo'
import { calcularLaVistaPrevia, cifraDeLaFila, type CifraDeLaFila } from './vista-previa'

export type CifraAlLado = Extract<CifraDeLaFila, { tipo: 'valor' } | { tipo: 'texto' }>

export type PedidoDelResultado = {
  readonly formula: Formula
  readonly hoja: HojaDeLaPlanilla
  // La fila que se escribe, por su id (el número sale de la hoja).
  readonly id: string
  readonly col: ColumnaQueSeEscribe
  readonly texto: string
  readonly locale: string
  readonly tablas: CatalogoDeTablas
  readonly terreno: TerrenoDePrueba
  readonly unidad: UnidadDeEjemplo
  readonly modo: ModoDeCambio | undefined
  readonly medidor?: Medidor
}

export function resultadoAlLado(p: PedidoDelResultado): CifraAlLado | null {
  if (p.col !== 'C' || !p.texto.trimStart().startsWith('=')) return null
  const numero = p.hoja.numeroDe.get(p.id)
  if (numero === undefined) return null
  const m = p.medidor ?? { visitas: 0 }
  const r = aplicarLoEscrito({
    formula: p.formula,
    hoja: p.hoja,
    numero,
    col: 'C',
    texto: p.texto,
    locale: p.locale,
    tablas: p.tablas,
    confirmaPisar: true,
    medidor: m,
  })
  if (r.tipo !== 'formula') return null
  const validada = validarFormula(r.formula.definicion, paramsParaValidar(r.formula), m)
  if (!validada.ok) return null
  const nodo = validada.formula.definicion.nodos.find((n) => n.id === p.id)
  if (nodo === undefined) return null
  const vista = calcularLaVistaPrevia(validada.formula, p.terreno, p.unidad, p.modo)
  const cifra = cifraDeLaFila(vista, nodo)
  return cifra.tipo === 'valor' || cifra.tipo === 'texto' ? cifra : null
}
