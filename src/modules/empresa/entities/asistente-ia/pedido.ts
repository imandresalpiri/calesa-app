// Lo que se le pide al asistente de IA, en la forma de un chat compatible con OpenAI. Lo arma el servidor con lo guardado de la empresa: del
// navegador sólo llegan el texto, el atajo elegido o la instrucción libre. El nombre de quien comparte (la firma) es el único dato personal.
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { LARGO_MAXIMO_INSTRUCCION, LARGO_MAXIMO_TEXTO, type ConfigDelAsistente } from './config'

export type MensajeAlAsistente = { role: 'system' | 'user'; content: string }

export type PedidoArmado = {
  mensajes: MensajeAlAsistente[]
  maxTokens: number
  temperatura: number
}

export type EmpresaDelPedido = { nombre: string; pais: string | null }

// Los de V1: redactar desde un atajo varía más que reescribir con una instrucción libre, que tiene su propio tope de salida.
export const TEMPERATURA_DE_GENERAR = 1.1
export const TEMPERATURA_DE_REESCRIBIR = 1.3
export const MAX_TOKENS_DE_REESCRIBIR = 700

export const MENSAJE_SIN_TEXTO = 'Escribe el texto que quieres redactar.'
export const MENSAJE_TEXTO_LARGO = 'El texto no puede pasar de 8.000 caracteres.'
export const MENSAJE_SIN_INSTRUCCION = 'Escribe qué quieres cambiar del texto.'
export const MENSAJE_INSTRUCCION_LARGA = `La instrucción no puede pasar de ${LARGO_MAXIMO_INSTRUCCION} caracteres.`
export const MENSAJE_ATAJO_NO_DISPONIBLE = 'Ese atajo ya no está disponible.'

type Comun = {
  config: Pick<ConfigDelAsistente, 'promptBase' | 'atajos'>
  empresa: EmpresaDelPedido
  texto: string
  // El nombre de quien comparte, o null si no tiene.
  firma: string | null
}

function sistema(config: Comun['config'], empresa: EmpresaDelPedido): string {
  const donde = empresa.pais?.trim() ? ` en ${empresa.pais.trim()}` : ''
  const base = `Redactas textos para compartir de ${empresa.nombre.trim()}, una importadora de vehículos${donde}. Devuelve sólo el texto final, sin comillas ni markdown. Usa sólo los datos del texto: no inventes. Conserva intactos precios, lote, año y enlaces.`
  const indicaciones = config.promptBase.trim()
  return indicaciones ? `${base}\n\nIndicaciones de la empresa:\n${indicaciones}` : base
}

function usuario(rotulo: string, instruccion: string, texto: string, firma: string | null) {
  const quien = firma?.trim() ? `\nQuien comparte: ${firma.trim()}` : ''
  return `${rotulo}: ${instruccion}${quien}\n\nTexto:\n${texto}`
}

function validarTexto(texto: string): Resultado<string> {
  const limpio = texto.trim()
  if (!limpio) return fallo('validacion', MENSAJE_SIN_TEXTO)
  if (limpio.length > LARGO_MAXIMO_TEXTO) return fallo('validacion', MENSAJE_TEXTO_LARGO)
  return ok(limpio)
}

export function armarPedidoDeGenerar(pedido: Comun & { atajoId: string }): Resultado<PedidoArmado> {
  const texto = validarTexto(pedido.texto)
  if (!texto.ok) return texto
  const atajo = pedido.config.atajos.find((a) => a.id === pedido.atajoId && a.activo)
  if (!atajo) return fallo('regla', MENSAJE_ATAJO_NO_DISPONIBLE)
  return ok({
    mensajes: [
      { role: 'system', content: sistema(pedido.config, pedido.empresa) },
      { role: 'user', content: usuario('Indicación', atajo.instruccion, texto.data, pedido.firma) },
    ],
    maxTokens: atajo.maxTokens,
    temperatura: TEMPERATURA_DE_GENERAR,
  })
}

export function armarPedidoDeReescribir(
  pedido: Comun & { instruccion: string },
): Resultado<PedidoArmado> {
  const texto = validarTexto(pedido.texto)
  if (!texto.ok) return texto
  const instruccion = pedido.instruccion.trim()
  if (!instruccion) return fallo('validacion', MENSAJE_SIN_INSTRUCCION)
  if (instruccion.length > LARGO_MAXIMO_INSTRUCCION) {
    return fallo('validacion', MENSAJE_INSTRUCCION_LARGA)
  }
  return ok({
    mensajes: [
      { role: 'system', content: sistema(pedido.config, pedido.empresa) },
      { role: 'user', content: usuario('Instrucción', instruccion, texto.data, pedido.firma) },
    ],
    maxTokens: MAX_TOKENS_DE_REESCRIBIR,
    temperatura: TEMPERATURA_DE_REESCRIBIR,
  })
}

// «Probar conexión»: lo mínimo que el proveedor contesta, para saber que la dirección, la clave y el modelo andan.
export function armarPedidoDePrueba(): PedidoArmado {
  return {
    mensajes: [{ role: 'user', content: 'Responde sólo: ok' }],
    maxTokens: 5,
    temperatura: 0,
  }
}
