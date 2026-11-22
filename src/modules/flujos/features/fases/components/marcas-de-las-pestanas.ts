import type { PestanaDeFase } from '../../../entities/fases/bloques-de-fase'

// Qué pestañas del panel de una fase llevan una marca: con un error adentro (gana) o con algo escrito sin guardar.
export type MarcasDeLasPestanas = {
  conError: readonly PestanaDeFase[]
  conCambios: readonly PestanaDeFase[]
}

export const SIN_MARCAS: MarcasDeLasPestanas = { conError: [], conCambios: [] }

export function firmaDeLasMarcas({ conError, conCambios }: MarcasDeLasPestanas): string {
  return `${conError.join(',')}/${conCambios.join(',')}`
}

// El punto de una pestaña y su texto accesible; nada si no tiene marca.
export function marcaDeLaPestana(
  marcas: MarcasDeLasPestanas,
  pestana: PestanaDeFase,
): { texto: string; tono: 'peligro' | 'info' } | undefined {
  if (marcas.conError.includes(pestana)) {
    return { texto: 'con errores', tono: 'peligro' }
  }
  return marcas.conCambios.includes(pestana)
    ? { texto: 'con cambios sin guardar', tono: 'info' }
    : undefined
}
