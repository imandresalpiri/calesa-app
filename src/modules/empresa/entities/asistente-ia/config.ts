// El asistente de IA (docs/GLOSARIO.md): un proveedor compatible con OpenAI que redacta los textos de compartir. Su configuración no secreta
// vive en `integraciones.config` de la fila `asistente_ia`; la clave, en Vault, y de ella la fila guarda sólo los últimos 4
// (`clave_termina_en`, que escribe únicamente `integracion_guardar_secreto`). Los topes son los mismos que exige `integracion_guardar`.
import { z } from 'zod'
import type { Integracion } from '../integraciones'

export const LARGO_MAXIMO_PROMPT_BASE = 4000
// El tope es de diseño: el modal dibuja todas las filas sin virtualizar.
export const TOPE_DE_ATAJOS = 20
export const LARGO_MAXIMO_NOMBRE_DE_ATAJO = 40
export const LARGO_MAXIMO_INSTRUCCION = 500
// El texto que se manda a redactar y el que vuelve.
export const LARGO_MAXIMO_TEXTO = 8000
export const LARGO_MAXIMO_MODELO = 100
export const MAX_TOKENS_MINIMO = 16
export const MAX_TOKENS_MAXIMO = 2000
// El tope de salida de un atajo que nace en la interfaz (no se edita ahí).
export const MAX_TOKENS_DE_UN_ATAJO_NUEVO = 700

export const PREAJUSTES = ['deepseek', 'otro'] as const
export type PreajusteDelAsistente = (typeof PREAJUSTES)[number]

// DeepSeek llena la dirección y el modelo; «Otro proveedor» deja escribirlos.
export const PREAJUSTES_DEL_ASISTENTE = {
  deepseek: { nombre: 'DeepSeek', urlBase: 'https://api.deepseek.com', modelo: 'deepseek-chat' },
  otro: { nombre: 'Otro proveedor' },
} as const satisfies Record<
  PreajusteDelAsistente,
  { nombre: string; urlBase?: string; modelo?: string }
>

export type AtajoDelAsistente = {
  id: string
  nombre: string
  instruccion: string
  activo: boolean
  maxTokens: number
}

export type ConfigDelAsistente = {
  preajuste: PreajusteDelAsistente
  urlBase: string
  modelo: string
  promptBase: string
  atajos: AtajoDelAsistente[]
  // Los últimos 4 de la clave guardada, o null.
  claveTerminaEn: string | null
}

export const PROMPT_BASE_POR_DEFECTO =
  'Escribe de tú, con un tono cercano y profesional. Usa sólo los datos del texto: no inventes precios, fechas ni plazos.'

// Los mismos ids, nombres, instrucciones y topes que siembra la migración del asistente (la prueba SQL y la de `config.test.ts` los comparan).
export const ATAJOS_POR_DEFECTO: readonly AtajoDelAsistente[] = [
  {
    id: 'a5157e00-0000-4000-8000-000000000001',
    nombre: 'Para WhatsApp',
    instruccion:
      'Mensaje en primera persona para iniciar un chat con un cliente. No es un anuncio: cercano y breve. Cierra invitando a responder y firma con el nombre de quien comparte.',
    activo: true,
    maxTokens: 260,
  },
  {
    id: 'a5157e00-0000-4000-8000-000000000002',
    nombre: 'Para Facebook',
    instruccion:
      'Anuncio largo, emocional y premium. Gancho fuerte, beneficios en viñetas con emojis, la fecha de subasta si la hay y una invitación a escribir. No menciones el lote.',
    activo: true,
    maxTokens: 650,
  },
  {
    id: 'a5157e00-0000-4000-8000-000000000003',
    nombre: 'Para TikTok',
    instruccion:
      'Gancho fuerte, texto corto y dinámico. Cierra con 4 a 6 hashtags del vehículo y de la importación de vehículos en el país de la empresa. No menciones el lote.',
    activo: true,
    maxTokens: 220,
  },
  {
    id: 'a5157e00-0000-4000-8000-000000000004',
    nombre: 'Más corto',
    instruccion: 'Hazlo más corto: conserva lo esencial y todos los datos.',
    activo: true,
    maxTokens: 300,
  },
  {
    id: 'a5157e00-0000-4000-8000-000000000005',
    nombre: 'Más formal',
    instruccion: 'Hazlo más formal y profesional, sin emojis.',
    activo: true,
    maxTokens: 700,
  },
]

export const CONFIG_DEL_ASISTENTE_POR_DEFECTO: ConfigDelAsistente = {
  preajuste: 'deepseek',
  urlBase: PREAJUSTES_DEL_ASISTENTE.deepseek.urlBase,
  modelo: PREAJUSTES_DEL_ASISTENTE.deepseek.modelo,
  promptBase: PROMPT_BASE_POR_DEFECTO,
  atajos: [...ATAJOS_POR_DEFECTO],
  claveTerminaEn: null,
}

// Lo guardado, con las claves de la base. Los textos ya llegan recortados y dentro de sus topes: los valida la RPC.
export const esquemaConfigAsistente = z
  .object({
    preajuste: z.enum(PREAJUSTES),
    url_base: z.string().min(1),
    modelo: z.string().min(1).max(LARGO_MAXIMO_MODELO),
    prompt_base: z.string().max(LARGO_MAXIMO_PROMPT_BASE),
    atajos: z
      .array(
        z.object({
          id: z.guid(),
          nombre: z.string().min(1).max(LARGO_MAXIMO_NOMBRE_DE_ATAJO),
          instruccion: z.string().min(1).max(LARGO_MAXIMO_INSTRUCCION),
          activo: z.boolean(),
          max_tokens: z.int().min(MAX_TOKENS_MINIMO).max(MAX_TOKENS_MAXIMO),
        }),
      )
      .max(TOPE_DE_ATAJOS),
    clave_termina_en: z.string().nullable(),
  })
  .transform((c): ConfigDelAsistente => ({
    preajuste: c.preajuste,
    urlBase: c.url_base,
    modelo: c.modelo,
    promptBase: c.prompt_base,
    atajos: c.atajos.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      instruccion: a.instruccion,
      activo: a.activo,
      maxTokens: a.max_tokens,
    })),
    claveTerminaEn: c.clave_termina_en,
  }))

// La configuración guardada, o null si no tiene la forma esperada: entonces el asistente no se llama.
export function leerConfigDelAsistente(config: unknown): ConfigDelAsistente | null {
  const leida = esquemaConfigAsistente.safeParse(config)
  return leida.success ? leida.data : null
}

// Para mostrar y editar: la guardada, o la de fábrica.
export function configDelAsistente(config: unknown): ConfigDelAsistente {
  return leerConfigDelAsistente(config) ?? CONFIG_DEL_ASISTENTE_POR_DEFECTO
}

export function atajosActivos(config: Pick<ConfigDelAsistente, 'atajos'>): AtajoDelAsistente[] {
  return config.atajos.filter((a) => a.activo)
}

// El origen (esquema, host y puerto, en minúsculas) de una dirección: a él viaja la clave. Si cambia con una clave guardada, la base la borra.
// Espejo de `_asistente_ia_origen()`: un `URL.origin` quitaría el `:443` y diría «igual» donde la base dice «otro».
export function origenDeLaDireccion(direccion: string): string | null {
  return /^[A-Za-z]+:\/\/[^/]+/.exec(direccion.trim())?.[0].toLowerCase() ?? null
}

// Si guardar la dirección escrita borra la clave: hay una guardada y la escrita va a otro origen. El modal lo avisa antes de guardar.
export function guardarBorraLaClave(
  integracion: Pick<Integracion, 'secretoGuardadoEn'>,
  guardada: string,
  escrita: string,
): boolean {
  const nuevo = origenDeLaDireccion(escrita)
  return (
    integracion.secretoGuardadoEn !== null &&
    nuevo !== null &&
    nuevo !== origenDeLaDireccion(guardada)
  )
}

export type AsistenteParaCompartir = {
  // Encendido, con clave y con una configuración legible: se puede pedir un texto.
  configurado: boolean
  atajos: { id: string; nombre: string }[]
}

// Lo que necesita el panel de compartir para ofrecer el asistente: si se puede usar y los atajos activos, en su orden.
export function asistenteParaCompartir(
  integracion: Pick<Integracion, 'activa' | 'config' | 'secretoGuardadoEn'> | undefined,
): AsistenteParaCompartir {
  const config = integracion ? leerConfigDelAsistente(integracion.config) : null
  if (!integracion || !config) return { configurado: false, atajos: [] }
  return {
    configurado: integracion.activa && integracion.secretoGuardadoEn !== null,
    atajos: atajosActivos(config).map(({ id, nombre }) => ({ id, nombre })),
  }
}
