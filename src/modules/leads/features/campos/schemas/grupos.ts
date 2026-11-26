import { z } from 'zod'
import { esquemaNombreDeGrupo, esquemaVersion } from '@/shared/lib/campos'
import { esquemaDestinoAlQuitar } from '@/shared/lib/catalogo'

export const esquemaCrearGrupoDeCampos = z.object({ nombre: esquemaNombreDeGrupo })

const edicion = { id: z.guid(), actualizadoEnEsperado: esquemaVersion }

export const esquemaGuardarGrupoDeCampos = z.object({
  ...edicion,
  cambios: z
    .object({ nombre: esquemaNombreDeGrupo.optional(), activo: z.boolean().optional() })
    .refine((cambios) => cambios.nombre !== undefined || cambios.activo !== undefined, {
      error: 'No hay nada que guardar.',
    }),
})

export const esquemaMoverGrupoDeCampos = z.object({ ...edicion, despuesDe: z.guid().nullable() })

export const esquemaQuitarGrupoDeCampos = z.object({ ...edicion, destino: esquemaDestinoAlQuitar })
