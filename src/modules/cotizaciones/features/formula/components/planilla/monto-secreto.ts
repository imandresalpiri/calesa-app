// Con el Modo Live, un monto que se escribe (un valor fijo en C o lo que escribe el asesor en Ejemplo, en dinero) no se ve: la celda lo escribe como contraseña y
// la barra no lo muestra. Puro.
import type { ColumnaDeLaPlanilla } from '../../../../entities/formula/texto-de-la-celda'
import { formatoDe, type Nodo } from '../../../../entities/nodos'

const DE_DINERO = new Set(['usd', 'moneda'])

export const esMontoQueSeEscribe = (nodo: Nodo | undefined, col: ColumnaDeLaPlanilla) =>
  ((col === 'C' && nodo?.tipo === 'constante') || (col === 'D' && nodo?.tipo === 'input')) &&
  DE_DINERO.has(formatoDe(nodo))
