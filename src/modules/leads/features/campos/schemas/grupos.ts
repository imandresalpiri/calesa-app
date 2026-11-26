import { z } from 'zod'
import { esquemaNombreDeGrupo } from '@/shared/lib/campos'

export const esquemaCrearGrupoDeCampos = z.object({ nombre: esquemaNombreDeGrupo })
