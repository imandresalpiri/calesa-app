import { z } from 'zod'
import { esquemaNombreDeGrupo } from '@/shared/lib/campos'

export const esquemaCrearGrupoDelOrigen = z.object({
  origenId: z.guid(),
  nombre: esquemaNombreDeGrupo,
})
