import { z } from 'zod'
import { esquemaNombreDeGrupo, esquemaVersion } from '@/shared/lib/campos'
import { esquemaDestinoAlQuitar } from '@/shared/lib/catalogo'

export const esquemaCrearGrupoDelOrigen = z.object({
  origenId: z.guid(),
  nombre: esquemaNombreDeGrupo,
})

const edicion = { origenId: z.guid(), id: z.guid(), actualizadoEnEsperado: esquemaVersion }

export const esquemaGuardarGrupoDelOrigen = z.object({
  ...edicion,
  cambios: z
    .object({ nombre: esquemaNombreDeGrupo.optional(), activo: z.boolean().optional() })
    .refine((cambios) => cambios.nombre !== undefined || cambios.activo !== undefined, {
      error: 'No hay nada que guardar.',
    }),
})

export const esquemaMoverGrupoDelOrigen = z.object({ ...edicion, despuesDe: z.guid().nullable() })

export const esquemaQuitarGrupoDelOrigen = z.object({ ...edicion, destino: esquemaDestinoAlQuitar })
