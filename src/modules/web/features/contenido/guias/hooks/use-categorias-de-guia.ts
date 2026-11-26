'use client'

import { useAction } from 'next-safe-action/hooks'
import type { ElementoDeCatalogo } from '@/shared/lib/catalogo'
import { crearDesdeAccion } from '@/shared/ui/combo-de-catalogo'
import type { OpcionesDeGuia } from '../../../../entities/contenido/guias'
import { crearCategoriaDesdeLaGuia } from '../../categorias/actions/crear-categoria-desde-la-guia'

// Las categorías de guías para el combo de la guía (en su orden, también las inactivas) y su «crear». La tabla no tiene versión.
export function useCategoriasDeGuia(opciones: OpcionesDeGuia) {
  const { executeAsync } = useAction(crearCategoriaDesdeLaGuia)
  const elementos: ElementoDeCatalogo[] = opciones.categorias.map((categoria, orden) => ({
    id: categoria.id,
    nombre: categoria.nombre,
    orden,
    activo: categoria.activa,
    actualizadoEn: '',
  }))
  return {
    elementos,
    hayMas: opciones.hayMasCategorias,
    crear: crearDesdeAccion((nombre) => executeAsync({ nombre })),
  }
}
