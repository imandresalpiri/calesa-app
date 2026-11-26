import { z } from 'zod'
import { MOTIVO_TOPE_DE_ATAJOS } from '../../../entities/asistente-ia/atajos'
import {
  LARGO_MAXIMO_INSTRUCCION,
  LARGO_MAXIMO_MODELO,
  LARGO_MAXIMO_NOMBRE_DE_ATAJO,
  LARGO_MAXIMO_PROMPT_BASE,
  MAX_TOKENS_MAXIMO,
  MAX_TOKENS_MINIMO,
  PREAJUSTES,
  PREAJUSTES_DEL_ASISTENTE,
  TOPE_DE_ATAJOS,
} from '../../../entities/asistente-ia/config'
import { LARGO_MAXIMO_DIRECCION, esDireccionDeRevalidacion } from '../../../entities/integraciones'

// El `actualizado_en` que tenía en pantalla quien edita: detecta un cambio ajeno.
const version = z.string().min(1)

export const MENSAJE_DIRECCION_DEL_ASISTENTE =
  'La dirección tiene que empezar con https:// y no puede apuntar a una red interna.'

const DEEPSEEK = PREAJUSTES_DEL_ASISTENTE.deepseek

// El proveedor: prender o apagar no manda la configuración, y al revés. El formulario no sabe en qué entorno corre: acepta el loopback, y
// llamar lo corta en el servidor cuando la base es de la nube. Con DeepSeek, la dirección y el modelo son los del preajuste, mande lo que mande
// el navegador. Los campos van sueltos: next-safe-action sólo devuelve los errores del primer nivel.
export const esquemaGuardarAsistente = z
  .object({
    actualizadoEnEsperado: version,
    activa: z.boolean().optional(),
    preajuste: z.enum(PREAJUSTES).optional(),
    urlBase: z
      .string()
      .trim()
      .min(1, { error: 'Escribe la dirección base.' })
      .max(LARGO_MAXIMO_DIRECCION, { error: 'La dirección es demasiado larga.' })
      .refine((direccion) => esDireccionDeRevalidacion(direccion, { loopback: true }), {
        error: MENSAJE_DIRECCION_DEL_ASISTENTE,
      })
      .optional(),
    modelo: z
      .string()
      .trim()
      .min(1, { error: 'Escribe el modelo.' })
      .max(LARGO_MAXIMO_MODELO, { error: 'El modelo va hasta 100 caracteres.' })
      .regex(/^\S+$/, { error: 'El modelo va sin espacios.' })
      .optional(),
  })
  .refine(
    ({ preajuste, urlBase, modelo }) =>
      (preajuste === undefined) === (urlBase === undefined) &&
      (preajuste === undefined) === (modelo === undefined),
    {
      path: ['urlBase'],
      error: 'La configuración se guarda entera: el proveedor, la dirección y el modelo.',
    },
  )
  .transform((pedido) =>
    pedido.preajuste === 'deepseek'
      ? {
          ...pedido,
          urlBase: DEEPSEEK.urlBase,
          modelo: DEEPSEEK.modelo,
        }
      : pedido,
  )

const esquemaAtajo = z.object({
  id: z.guid(),
  nombre: z
    .string()
    .trim()
    .min(1, { error: 'Escribe el nombre del atajo.' })
    .max(LARGO_MAXIMO_NOMBRE_DE_ATAJO, { error: 'El nombre va hasta 40 caracteres.' }),
  instruccion: z
    .string()
    .trim()
    .min(1, { error: 'Escribe qué tiene que hacer el atajo.' })
    .max(LARGO_MAXIMO_INSTRUCCION, { error: 'La instrucción va hasta 500 caracteres.' }),
  activo: z.boolean(),
  maxTokens: z.int().min(MAX_TOKENS_MINIMO).max(MAX_TOKENS_MAXIMO),
})

// El prompt base y los atajos, en una escritura con la versión de la fila. Dos atajos no se llaman igual (sin mirar mayúsculas, como la base).
export const esquemaGuardarIndicaciones = z
  .object({
    actualizadoEnEsperado: version,
    promptBase: z
      .string()
      .trim()
      .max(LARGO_MAXIMO_PROMPT_BASE, {
        error: 'El prompt base no puede pasar de 4.000 caracteres.',
      }),
    atajos: z.array(esquemaAtajo).max(TOPE_DE_ATAJOS, { error: MOTIVO_TOPE_DE_ATAJOS }),
  })
  .superRefine(({ atajos }, ctx) => {
    const vistos = new Set<string>()
    atajos.forEach((atajo, indice) => {
      const nombre = atajo.nombre.toLowerCase()
      if (vistos.has(nombre)) {
        ctx.addIssue({
          code: 'custom',
          path: ['atajos', indice, 'nombre'],
          message: 'Ya hay un atajo con ese nombre.',
        })
      }
      vistos.add(nombre)
    })
  })

export type EntradaDeIndicaciones = z.input<typeof esquemaGuardarIndicaciones>

// La clave del motivo de un campo de un atajo: cada fila tiene los suyos.
export const claveDelCampoDelAtajo = (id: string, campo: 'nombre' | 'instruccion') =>
  `${id}:${campo}`

// El primer motivo de cada campo: `promptBase`, `atajos` (la lista) o `<id>:nombre` y `<id>:instruccion` (el de su fila).
export function motivosDeLasIndicaciones(
  problemas: readonly z.core.$ZodIssue[],
  atajos: readonly { id: string }[],
): Record<string, string> {
  const porCampo: Record<string, string> = {}
  for (const { path, message } of problemas) {
    const [raiz, indice, campo] = path
    const atajo = typeof indice === 'number' ? atajos[indice] : undefined
    const clave =
      raiz === 'atajos' && atajo && (campo === 'nombre' || campo === 'instruccion')
        ? claveDelCampoDelAtajo(atajo.id, campo)
        : String(raiz)
    porCampo[clave] ??= message
  }
  return porCampo
}
