// Ajustes del Live (docs/GLOSARIO.md › Ajustes del Live): qué se ve con el Modo Live encendido. Se guardan parciales por rol
// (`live_ajustes_roles`) y por persona (`live_ajustes_personas`, el «Ajuste propio»); lo que falta sale de lo por defecto. En la base las claves
// van en snake_case y las valida `_live_ajustes_validos()`, espejo de `esquemaDeLaBase` de acá.
import { z } from 'zod'

export const CLIENTES_EN_EL_LIVE = ['apagado', 'nombres', 'completo'] as const
export const LOGISTICA_EN_EL_LIVE = ['apagado', 'cadena'] as const
export const REPUESTOS_EN_EL_LIVE = ['apagado', 'estadisticas'] as const
export const ORIGENES_CONFIG_EN_EL_LIVE = ['apagado', 'lectura'] as const

export type ClientesEnElLive = (typeof CLIENTES_EN_EL_LIVE)[number]
export type LogisticaEnElLive = (typeof LOGISTICA_EN_EL_LIVE)[number]
export type RepuestosEnElLive = (typeof REPUESTOS_EN_EL_LIVE)[number]
export type OrigenesConfigEnElLive = (typeof ORIGENES_CONFIG_EN_EL_LIVE)[number]

// «Todos los orígenes activos» (un origen nuevo entra solo) o sólo los elegidos.
export type OrigenesDelLive = 'todos' | readonly string[]

export const TOPE_DE_ORIGENES_DEL_LIVE = 100

export type AjustesDelLive = {
  puedeEncender: boolean
  vehiculos: boolean
  origenes: OrigenesDelLive
  cotizaciones: boolean
  clientes: ClientesEnElLive
  logistica: LogisticaEnElLive
  repuestos: RepuestosEnElLive
  // Inicio y Tablero.
  inicio: boolean
  origenesConfig: OrigenesConfigEnElLive
}

export type CampoDelLive = keyof AjustesDelLive

// El orden en que se muestran y se editan.
export const CAMPOS_DEL_LIVE = [
  'puedeEncender',
  'vehiculos',
  'origenes',
  'cotizaciones',
  'clientes',
  'logistica',
  'repuestos',
  'inicio',
  'origenesConfig',
] as const satisfies readonly CampoDelLive[]

// Lo que se guarda: sólo lo que el rol o la persona pisa.
export type AjustesParcialesDelLive = { readonly [C in CampoDelLive]?: AjustesDelLive[C] }

// Un rol nuevo o sin configurar: todos encienden; vehículos (todos los orígenes) y cotizaciones a la vista; lo demás, oculto.
export const AJUSTES_POR_DEFECTO_DEL_LIVE: AjustesDelLive = {
  puedeEncender: true,
  vehiculos: true,
  origenes: 'todos',
  cotizaciones: true,
  clientes: 'apagado',
  logistica: 'apagado',
  repuestos: 'apagado',
  inicio: false,
  origenesConfig: 'apagado',
}

// Cómo se ve un cliente con «Clientes» apagado (cotizaciones, su tarjeta, el PDF y lo que se comparte).
export const CLIENTE_EN_EL_LIVE = 'Cliente'

const esquemaDeOrigenes = z.union([
  z.literal('todos'),
  z
    .array(z.guid())
    .min(1, { error: 'Elige al menos un origen o «Todos los orígenes activos».' })
    .max(TOPE_DE_ORIGENES_DEL_LIVE),
])

const formaDeLosAjustes = {
  puedeEncender: z.boolean(),
  vehiculos: z.boolean(),
  origenes: esquemaDeOrigenes,
  cotizaciones: z.boolean(),
  clientes: z.enum(CLIENTES_EN_EL_LIVE),
  logistica: z.enum(LOGISTICA_EN_EL_LIVE),
  repuestos: z.enum(REPUESTOS_EN_EL_LIVE),
  inicio: z.boolean(),
  origenesConfig: z.enum(ORIGENES_CONFIG_EN_EL_LIVE),
}

// Los de un rol, completos (el modal del rol guarda todo lo que se ve).
export const esquemaDeAjustesDelLive = z.strictObject(formaDeLosAjustes)
// Los de una persona: sólo lo que pisa.
export const esquemaDeAjustesParcialesDelLive = z.strictObject(formaDeLosAjustes).partial()

const esquemaDeLaBase = z
  .strictObject({
    puede_encender: formaDeLosAjustes.puedeEncender,
    vehiculos: formaDeLosAjustes.vehiculos,
    origenes: esquemaDeOrigenes,
    cotizaciones: formaDeLosAjustes.cotizaciones,
    clientes: formaDeLosAjustes.clientes,
    logistica: formaDeLosAjustes.logistica,
    repuestos: formaDeLosAjustes.repuestos,
    inicio: formaDeLosAjustes.inicio,
    origenes_config: formaDeLosAjustes.origenesConfig,
  })
  .partial()

type AjustesDeLaBase = z.infer<typeof esquemaDeLaBase>

// Lo que devolvió la base (`null` = sin fila). Una forma inesperada es un error: la base ya la valida al escribir.
export function ajustesDesdeLaBase(json: unknown): AjustesParcialesDelLive | null {
  if (json === null || json === undefined) {
    return null
  }
  const b = esquemaDeLaBase.parse(json)
  const ajustes: { -readonly [C in CampoDelLive]?: AjustesDelLive[C] } = {}
  if (b.puede_encender !== undefined) ajustes.puedeEncender = b.puede_encender
  if (b.vehiculos !== undefined) ajustes.vehiculos = b.vehiculos
  if (b.origenes !== undefined) ajustes.origenes = b.origenes
  if (b.cotizaciones !== undefined) ajustes.cotizaciones = b.cotizaciones
  if (b.clientes !== undefined) ajustes.clientes = b.clientes
  if (b.logistica !== undefined) ajustes.logistica = b.logistica
  if (b.repuestos !== undefined) ajustes.repuestos = b.repuestos
  if (b.inicio !== undefined) ajustes.inicio = b.inicio
  if (b.origenes_config !== undefined) ajustes.origenesConfig = b.origenes_config
  return ajustes
}

// Para la RPC: snake_case, sólo lo que viene, y la lista de orígenes sin repetidos.
export function ajustesParaLaBase(ajustes: AjustesParcialesDelLive): AjustesDeLaBase {
  const b: AjustesDeLaBase = {}
  if (ajustes.puedeEncender !== undefined) b.puede_encender = ajustes.puedeEncender
  if (ajustes.vehiculos !== undefined) b.vehiculos = ajustes.vehiculos
  if (ajustes.origenes !== undefined) {
    b.origenes = ajustes.origenes === 'todos' ? 'todos' : [...new Set(ajustes.origenes)]
  }
  if (ajustes.cotizaciones !== undefined) b.cotizaciones = ajustes.cotizaciones
  if (ajustes.clientes !== undefined) b.clientes = ajustes.clientes
  if (ajustes.logistica !== undefined) b.logistica = ajustes.logistica
  if (ajustes.repuestos !== undefined) b.repuestos = ajustes.repuestos
  if (ajustes.inicio !== undefined) b.inicio = ajustes.inicio
  if (ajustes.origenesConfig !== undefined) b.origenes_config = ajustes.origenesConfig
  return b
}

// Cuántos campos pisa (a lo sumo 9: «Ajuste propio en N campos»).
export function camposPisados(ajustes: AjustesParcialesDelLive | null): number {
  return ajustes === null
    ? 0
    : CAMPOS_DEL_LIVE.filter((campo) => ajustes[campo] !== undefined).length
}
