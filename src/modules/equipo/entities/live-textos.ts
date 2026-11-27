// Cómo se escriben los ajustes del Live en Configuración › Modo Live: la etiqueta de cada campo, sus opciones, su valor en la tarjeta del rol y
// el resumen de una persona en «Ajustes por persona».
import { combinarAjustesDelLive } from './live-combinar'
import type { OrigenDelLive, PersonaDelLive } from './live-configuracion'
import {
  CAMPOS_DEL_LIVE,
  camposPisados,
  type AjustesDelLive,
  type AjustesParcialesDelLive,
  type CampoDelLive,
  type OrigenesDelLive,
} from './live'

export const ETIQUETAS_DEL_LIVE: Readonly<Record<CampoDelLive, string>> = {
  puedeEncender: 'Puede encender el Modo Live',
  vehiculos: 'Vehículos',
  origenes: 'Orígenes',
  cotizaciones: 'Cotizaciones',
  clientes: 'Clientes',
  logistica: 'Logística',
  repuestos: 'Repuestos',
  inicio: 'Inicio y Tablero',
  origenesConfig: 'Configuración de orígenes',
}

// Lo que no se configura: va al pie del modal.
export const SIEMPRE_OCULTOS_EN_EL_LIVE =
  'Siempre ocultos: agenda, chat, actividad, datos, notificaciones, el resto de Configuración y el perfil.'

export const TODOS_LOS_ORIGENES = 'Todos los orígenes activos'

export type OpcionDelLive = { valor: string; etiqueta: string }

// Las opciones de cada campo, como texto (un `<select>`): los sí/no van como `si` y `no`; «Orígenes», `todos` o `estos` (las casillas aparte).
const OPCIONES: Readonly<Record<CampoDelLive, readonly OpcionDelLive[]>> = {
  puedeEncender: [
    { valor: 'si', etiqueta: 'Sí' },
    { valor: 'no', etiqueta: 'No' },
  ],
  vehiculos: [
    { valor: 'si', etiqueta: 'Encendido' },
    { valor: 'no', etiqueta: 'Apagado' },
  ],
  origenes: [
    { valor: 'todos', etiqueta: TODOS_LOS_ORIGENES },
    { valor: 'estos', etiqueta: 'Sólo estos' },
  ],
  cotizaciones: [
    { valor: 'si', etiqueta: 'Encendido' },
    { valor: 'no', etiqueta: 'Apagado' },
  ],
  clientes: [
    { valor: 'apagado', etiqueta: 'Apagado' },
    { valor: 'nombres', etiqueta: 'Sólo nombres' },
    { valor: 'completo', etiqueta: 'Completo' },
  ],
  logistica: [
    { valor: 'apagado', etiqueta: 'Apagado' },
    { valor: 'cadena', etiqueta: 'Sólo la cadena' },
  ],
  repuestos: [
    { valor: 'apagado', etiqueta: 'Apagado' },
    { valor: 'estadisticas', etiqueta: 'Sólo estadísticas' },
  ],
  inicio: [
    { valor: 'si', etiqueta: 'Encendido' },
    { valor: 'no', etiqueta: 'Apagado' },
  ],
  origenesConfig: [
    { valor: 'apagado', etiqueta: 'Apagado' },
    { valor: 'lectura', etiqueta: 'Sólo lectura' },
  ],
}

export function opcionesDelCampo(campo: CampoDelLive): readonly OpcionDelLive[] {
  return OPCIONES[campo]
}

// El valor de un campo como opción del `<select>`.
export function opcionDelValor<C extends CampoDelLive>(campo: C, valor: AjustesDelLive[C]): string {
  if (typeof valor === 'boolean') {
    return valor ? 'si' : 'no'
  }
  if (campo === 'origenes') {
    return valor === 'todos' ? 'todos' : 'estos'
  }
  return String(valor)
}

const TOPE_DE_NOMBRES = 3

// Los orígenes elegidos por su nombre, en el orden de la lista de orígenes: «A, B y C»; con más, «A, B, C y 2 más». Un id que ya no está no se nombra.
function textoDeLosOrigenes(origenes: OrigenesDelLive, todos: readonly OrigenDelLive[]): string {
  if (origenes === 'todos') {
    return TODOS_LOS_ORIGENES
  }
  const elegidos = new Set(origenes)
  const nombres = todos.filter((o) => elegidos.has(o.id)).map((o) => o.nombre)
  if (nombres.length === 0) {
    return 'Ninguno de los que hay'
  }
  if (nombres.length > TOPE_DE_NOMBRES) {
    const resto = nombres.length - TOPE_DE_NOMBRES
    return `${nombres.slice(0, TOPE_DE_NOMBRES).join(', ')} y ${String(resto)} más`
  }
  return nombres.length === 1
    ? (nombres[0] ?? '')
    : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1) ?? ''}`
}

// El valor de un campo como se lee en la tarjeta y en «Como su rol (…)».
export function textoDelValor(
  campo: CampoDelLive,
  ajustes: AjustesDelLive,
  origenes: readonly OrigenDelLive[],
): string {
  if (campo === 'origenes') {
    return textoDeLosOrigenes(ajustes.origenes, origenes)
  }
  const opcion = opcionDelValor(campo, ajustes[campo])
  return OPCIONES[campo].find((o) => o.valor === opcion)?.etiqueta ?? opcion
}

export type FilaDelLive = { campo: CampoDelLive; etiqueta: string; valor: string }

// Las filas de la tarjeta de un rol: lo combinado con lo por defecto (un rol sin fila se ve con lo por defecto).
export function filasDelRol(
  ajustes: AjustesParcialesDelLive | null,
  origenes: readonly OrigenDelLive[],
): FilaDelLive[] {
  const { ajustes: combinados } = combinarAjustesDelLive({ rol: ajustes, persona: null })
  return CAMPOS_DEL_LIVE.map((campo) => ({
    campo,
    etiqueta: ETIQUETAS_DEL_LIVE[campo],
    valor: textoDelValor(campo, combinados, origenes),
  }))
}

// La línea de una persona en «Ajustes por persona».
export function resumenDeLaPersona(persona: Pick<PersonaDelLive, 'rol' | 'ajustes'>): string {
  const pisados = camposPisados(persona.ajustes)
  if (pisados > 0) {
    return `Ajuste propio en ${String(pisados)} ${pisados === 1 ? 'campo' : 'campos'}`
  }
  return persona.rol ? `Como su rol (${persona.rol.nombre})` : 'Por defecto (sin rol)'
}

// La primera opción de cada campo en el modal de una persona: lo que tendría sin pisarlo, «Como su rol (…)» o, sin rol, «Por defecto (…)».
export function etiquetaDeLoHeredado(
  campo: CampoDelLive,
  persona: Pick<PersonaDelLive, 'rol'>,
  origenes: readonly OrigenDelLive[],
): string {
  const { ajustes } = combinarAjustesDelLive({ rol: persona.rol?.ajustes ?? null, persona: null })
  const valor = textoDelValor(campo, ajustes, origenes)
  return persona.rol ? `Como su rol (${valor})` : `Por defecto (${valor})`
}
