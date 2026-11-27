import 'server-only'
import { revalidatePath } from 'next/cache'
import { RUTAS } from '@/shared/lib/rutas'
import { MOTIVO_SIN_PERMISO_DE_TRANSPORTE } from '../../entities/transporte/transporte'

// La lista de embarques y la página de cada uno se dibujan en el servidor: tras escribir, se vuelven a pedir las dos (y la cadena, que filtra por contenedor y embarque).
export function revalidarLosEmbarques(): void {
  revalidatePath(RUTAS.embarques, 'layout')
  revalidatePath(RUTAS.logistica)
}

export const SIN_PERMISO_PARA_LOS_EMBARQUES = MOTIVO_SIN_PERMISO_DE_TRANSPORTE
