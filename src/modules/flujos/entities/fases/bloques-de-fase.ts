// Cómo se reparten los campos de una fase en los bloques del panel (5.04-3) y los bloques en sus pestañas: a qué bloque pertenece cada campo, a qué pestaña
// lleva cada bloque, en qué orden se ven (el foco de un error va al primero) y el `id` de cada control. Puro: lo comparten el formulario y la prueba que impide
// que un campo nuevo quede sin bloque.
import { CAMPOS_DE_FASE, type CampoDeFase } from './reglas-de-fase'

export const BLOQUES_DE_FASE = [
  'identidad',
  'en-el-flujo',
  'demora',
  'transporte',
  'web-y-portal',
] as const
export type BloqueDeFase = (typeof BLOQUES_DE_FASE)[number]

// Los campos de cada bloque, en el orden en que se dibujan.
export const CAMPOS_DEL_BLOQUE: Record<BloqueDeFase, readonly CampoDeFase[]> = {
  identidad: ['nombre', 'descripcion', 'color', 'icono'],
  'en-el-flujo': ['es_inicial', 'es_final', 'nota_obligatoria', 'es_logistica', 'es_subasta'],
  demora: ['demora_dias', 'alerta_cada_horas'],
  transporte: ['permite_contenedor', 'permite_aduana', 'cuenta_llegada_repuestos'],
  'web-y-portal': ['publica_web', 'visible_portal', 'alias_portal', 'descripcion_portal'],
}

// Todos los campos en el orden visual.
export const CAMPOS_EN_ORDEN_VISUAL: readonly CampoDeFase[] = BLOQUES_DE_FASE.flatMap(
  (bloque) => CAMPOS_DEL_BLOQUE[bloque],
)

export function bloqueDelCampo(campo: CampoDeFase): BloqueDeFase {
  const bloque = BLOQUES_DE_FASE.find((b) => CAMPOS_DEL_BLOQUE[b].includes(campo))
  if (bloque === undefined) {
    throw new Error(`El campo «${campo}» de la fase no está en ningún bloque.`)
  }
  return bloque
}

// El `id` del control (o de la tarjeta del interruptor) de cada campo: a donde va el foco de un error.
export const ID_DE_CAMPO_DE_FASE: Record<CampoDeFase, string> = Object.fromEntries(
  CAMPOS_DE_FASE.map((campo) => [campo, `fase-${campo.replaceAll('_', '-')}`]),
) as Record<CampoDeFase, string>

export type ErroresPorCampo = Partial<Record<CampoDeFase, string>>

// El primer campo con error, en el orden en que se ven; nulo si no hay.
export function primerCampoConError(errores: ErroresPorCampo): CampoDeFase | null {
  return CAMPOS_EN_ORDEN_VISUAL.find((campo) => errores[campo] !== undefined) ?? null
}

// Los bloques que tienen un error adentro: no pueden quedar plegados.
export function bloquesConError(errores: ErroresPorCampo): ReadonlySet<BloqueDeFase> {
  return new Set(
    CAMPOS_EN_ORDEN_VISUAL.filter((campo) => errores[campo] !== undefined).map(bloqueDelCampo),
  )
}

// Las tres pestañas del panel de una fase, en el orden en que se ven. «Reglas» (requisitos, salidas y reglas que la afectan) no tiene campos del formulario:
// los guarda cada bloque por su cuenta. «Identidad» y «Ajustes» son un solo formulario con un solo «Guardar».
export const PESTANAS_DE_FASE = ['reglas', 'identidad', 'ajustes'] as const
export type PestanaDeFase = (typeof PESTANAS_DE_FASE)[number]
export type PestanaConFormulario = Exclude<PestanaDeFase, 'reglas'>

export const PESTANA_INICIAL_DE_FASE: PestanaDeFase = 'reglas'
// `?pestana=` dentro de `?fase=`: el mismo nombre ya es un enlace viejo en otras pantallas, aquí sólo vale con una fase abierta.
export const CLAVE_DE_PESTANA_DE_FASE = 'pestana'

export const TITULO_DE_PESTANA_DE_FASE: Record<PestanaDeFase, string> = {
  reglas: 'Reglas',
  identidad: 'Identidad',
  ajustes: 'Ajustes',
}

export const PESTANA_DEL_BLOQUE: Record<BloqueDeFase, PestanaConFormulario> = {
  identidad: 'identidad',
  'en-el-flujo': 'ajustes',
  demora: 'ajustes',
  transporte: 'ajustes',
  'web-y-portal': 'ajustes',
}

// La pestaña que pidió la URL; sin ella, o con otro valor, la primera.
export function pestanaPedida(valor: string | null | undefined): PestanaDeFase {
  return PESTANAS_DE_FASE.find((pestana) => pestana === valor) ?? PESTANA_INICIAL_DE_FASE
}

export function pestanaDelCampo(campo: CampoDeFase): PestanaConFormulario {
  return PESTANA_DEL_BLOQUE[bloqueDelCampo(campo)]
}

// Las pestañas que tienen un campo de la lista adentro (con error, o con un cambio sin guardar): se marcan aunque no sean la que se ve.
export function pestanasDeLosCampos(campos: readonly CampoDeFase[]): ReadonlySet<PestanaDeFase> {
  return new Set(campos.map(pestanaDelCampo))
}
