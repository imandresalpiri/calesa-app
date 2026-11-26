// Lo que contestó el proveedor del asistente de IA, dicho para la persona. Nunca se devuelve el texto de error del proveedor: puede traer
// datos de la cuenta o de la clave. Un uso se cuenta cuando el proveedor respondió 2xx, aunque el texto venga vacío (gastó tokens).
import { z } from 'zod'
import type { AccionDelAviso } from '@/shared/lib/acciones-del-aviso'
import type { CodigoError, ErrorApp } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { LARGO_MAXIMO_TEXTO } from './config'

export type FallaDelAsistente =
  'no_configurado' | 'clave_invalida' | 'sin_tiempo' | 'vacio' | 'no_disponible' | 'rechazado'

export type RespuestaDelProveedor =
  { ok: true; texto: string } | { ok: false; falla: FallaDelAsistente; codigo?: number }

export const ERRORES_DEL_ASISTENTE = {
  no_configurado: 'El asistente no está configurado.',
  clave_invalida: 'La clave del asistente no es válida.',
  sin_tiempo: 'El asistente no respondió a tiempo.',
  vacio: 'El asistente devolvió un texto vacío.',
  no_disponible: 'El asistente no está disponible ahora. Vuelve a intentar en un momento.',
  rechazado: 'El asistente rechazó el pedido. Revisa la dirección y el modelo.',
} as const satisfies Record<FallaDelAsistente, string>

const CODIGO_DE_LA_FALLA = {
  no_configurado: 'regla',
  clave_invalida: 'regla',
  rechazado: 'regla',
  sin_tiempo: 'inesperado',
  vacio: 'inesperado',
  no_disponible: 'inesperado',
} as const satisfies Record<FallaDelAsistente, CodigoError>

// Lo que destraba cada falla, en `ErrorApp.causa`: sólo a quien gestiona la empresa (los demás no pueden configurarlo).
export const CAUSAS_DEL_ASISTENTE = ['configurar', 'reemplazar_la_clave'] as const
export type CausaDelAsistente = (typeof CAUSAS_DEL_ASISTENTE)[number]

const CAUSA_DE_LA_FALLA: Partial<Record<FallaDelAsistente, CausaDelAsistente>> = {
  no_configurado: 'configurar',
  rechazado: 'configurar',
  clave_invalida: 'reemplazar_la_clave',
}

// Los paneles de Integraciones adonde lleva cada causa (`?panel=`).
export const ACCIONES_DEL_ASISTENTE = {
  configurar: { etiqueta: 'Configurar en Integraciones', panel: 'asistente-ia' },
  reemplazar_la_clave: { etiqueta: 'Reemplazar la clave', panel: 'clave-asistente-ia' },
} as const satisfies Record<CausaDelAsistente, { etiqueta: string; panel: string }>

export function esCausaDelAsistente(valor: unknown): valor is CausaDelAsistente {
  return CAUSAS_DEL_ASISTENTE.some((causa) => causa === valor)
}

// La acción de un error del asistente: en Integraciones abre el panel ahí mismo; desde otra pantalla, lleva a Integraciones con el panel.
export function accionDelAsistente(
  causa: CausaDelAsistente,
  { enIntegraciones }: { enIntegraciones: boolean },
): AccionDelAviso {
  const { etiqueta, panel } = ACCIONES_DEL_ASISTENTE[causa]
  return enIntegraciones
    ? { tipo: 'panel', etiqueta, panel }
    : { tipo: 'ir', etiqueta, ruta: `${RUTAS.integracionesDeEmpresa}?panel=${panel}` }
}

export function errorDelAsistente(
  respuesta: Extract<RespuestaDelProveedor, { ok: false }>,
  { puedeConfigurar }: { puedeConfigurar: boolean },
): ErrorApp {
  const mensaje =
    respuesta.falla === 'rechazado' && respuesta.codigo !== undefined
      ? `El asistente rechazó el pedido (${respuesta.codigo}). Revisa la dirección y el modelo.`
      : ERRORES_DEL_ASISTENTE[respuesta.falla]
  const causa = puedeConfigurar ? CAUSA_DE_LA_FALLA[respuesta.falla] : undefined
  const codigo = CODIGO_DE_LA_FALLA[respuesta.falla]
  return causa === undefined ? { codigo, mensaje } : { codigo, mensaje, causa }
}

// Un uso se cuenta con una respuesta 2xx: llegó y gastó.
export function seCuentaComoUso(status: number): boolean {
  return status >= 200 && status < 300
}

const esquemaDeLaRespuesta = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullish() }) })).min(1),
})

// Un 2xx con contenido da el texto recortado y cortado al tope; sin contenido (o con otra forma), «vacío». Un 401 o 403 es la clave; un 408,
// un 429 o un 5xx, el proveedor que no puede ahora; otro 4xx, un pedido que rechazó (casi siempre el modelo o la dirección).
export function interpretarRespuesta(status: number, cuerpo: unknown): RespuestaDelProveedor {
  if (seCuentaComoUso(status)) {
    const leida = esquemaDeLaRespuesta.safeParse(cuerpo)
    const texto = leida.success ? (leida.data.choices[0]?.message.content ?? '').trim() : ''
    return texto
      ? { ok: true, texto: texto.slice(0, LARGO_MAXIMO_TEXTO) }
      : { ok: false, falla: 'vacio' }
  }
  if (status === 401 || status === 403)
    return { ok: false, falla: 'clave_invalida', codigo: status }
  if (status === 408 || status === 429 || status >= 500) {
    return { ok: false, falla: 'no_disponible', codigo: status }
  }
  return { ok: false, falla: 'rechazado', codigo: status }
}
