import { z } from 'zod'
import { esquemaDeAjustesDelLive, esquemaDeAjustesParcialesDelLive } from '../../../entities/live'

// guid y no uuid: `z.uuid()` exige versión y variante RFC, y Postgres acepta cualquier uuid. La versión es la que tenía en pantalla quien edita, el
// `actualizado_en` de su fila tal como lo da la base (ISO con zona); nula, crear la fila.
const version = z.iso.datetime({ offset: true })

// El modal del rol guarda todo lo que se ve.
export const esquemaGuardarRolDelLive = z.object({
  rolId: z.guid(),
  ajustes: esquemaDeAjustesDelLive,
  actualizadoEnEsperado: version.nullable(),
})

export const esquemaQuitarRolDelLive = z.object({
  rolId: z.guid(),
  actualizadoEnEsperado: version,
})

// El de la persona, sólo lo que pisa (vacío: vuelve a lo de su rol).
export const esquemaGuardarPersonaDelLive = z.object({
  usuarioId: z.guid(),
  ajustes: esquemaDeAjustesParcialesDelLive,
  actualizadoEnEsperado: version.nullable(),
})

export const esquemaQuitarPersonaDelLive = z.object({
  usuarioId: z.guid(),
  actualizadoEnEsperado: version,
})
