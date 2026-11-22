// El modo «Retocar» con el Modo Live encendido. Un texto con datos que lleva un monto se dibuja por tramos (el monto con `<Monto>`, que Live tapa), pero su
// texto entero (`lineas`) trae la cifra: con Live, el nombre de su botón la tapa con lo mismo que `<Monto>` y su campo no se abre, porque arranca con el texto
// resuelto. Lo que ya se escribió en el borrador es un texto fijo que la tarjeta dibuja tal cual (sin tramos): ese campo sí se abre.
import type { CeldaDibujada } from '../geometria-de-la-tarjeta'

export const MONTO_TAPADO = '•••'
export const MOTIVO_DEL_TEXTO_CON_UN_MONTO =
  'Este texto lleva un monto: apaga el Modo Live para cambiarlo.'

// El texto de una celda para nombrarla: el de sus líneas o, con Live y un monto adentro, el de sus tramos con el monto tapado.
export function textoParaNombrar(c: CeldaDibujada, live: boolean): string {
  if (c.contenido.tipo !== 'texto') return ''
  const { lineas, tramos } = c.contenido
  if (!live || tramos === undefined) return lineas.join('\n')
  return tramos.map((t) => (typeof t === 'string' ? t : MONTO_TAPADO)).join('')
}

// Si el campo de la celda no se abre: con Live, un texto con datos que lleva un monto.
export const campoTapadoPorLive = (c: CeldaDibujada, live: boolean): boolean =>
  live && c.contenido.tipo === 'texto' && c.contenido.tramos !== undefined
