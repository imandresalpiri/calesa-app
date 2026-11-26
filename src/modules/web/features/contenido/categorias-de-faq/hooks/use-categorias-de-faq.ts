'use client'

import { useAction } from 'next-safe-action/hooks'
import type { CatalogoLeido, ElementoDeCatalogo } from '@/shared/lib/catalogo'
import type { Resultado } from '@/shared/lib/errores'
import { crearDesdeAccion } from '@/shared/ui/combo-de-catalogo'
import { crearCategoriaDeFaq } from '../actions/crear-categoria-de-faq'

export type CategoriasDelCombo = CatalogoLeido & {
  crear: (nombre: string) => Promise<Resultado<ElementoDeCatalogo>>
}

// El catálogo de categorías de FAQ para el combo de una pregunta, con su «crear». La página ya exige `web.contenido.gestionar`.
export function useCategoriasDeFaq(leidas: CatalogoLeido): CategoriasDelCombo {
  const { executeAsync } = useAction(crearCategoriaDeFaq)
  return { ...leidas, crear: crearDesdeAccion((nombre) => executeAsync({ nombre })) }
}
