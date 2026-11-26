'use client'

import { useAction } from 'next-safe-action/hooks'
import type { CatalogoLeido, ElementoDeCatalogo } from '@/shared/lib/catalogo'
import type { Resultado } from '@/shared/lib/errores'
import {
  operacionesDesdeAcciones,
  useConLosCreados,
  type OperacionesDelCatalogo,
} from '@/shared/ui/catalogo-en-drawer'
import { crearDesdeAccion } from '@/shared/ui/combo-de-catalogo'
import { LARGO_DE_CATEGORIA } from '../../../../entities/contenido/categorias-de-faq'
import { agregarCategoriaDeFaq, crearCategoriaDeFaq } from '../actions/crear-categoria-de-faq'
import { guardarCategoriaDeFaq } from '../actions/guardar-categoria-de-faq'
import { moverCategoriaDeFaq } from '../actions/mover-categoria-de-faq'
import { quitarCategoriaDeFaq } from '../actions/quitar-categoria-de-faq'

export type CategoriasDelCombo = CatalogoLeido & {
  crear: (nombre: string) => Promise<Resultado<ElementoDeCatalogo>>
}

const REVISA_LA_CATEGORIA = `Revisa el nombre de la categoría: hasta ${String(LARGO_DE_CATEGORIA)} caracteres.`

// El catálogo de categorías de FAQ: su «crear» para el combo de una pregunta (sin revalidar: lo creado queda en la lista del combo y del
// drawer, `useConLosCreados`) y las operaciones del drawer «Categorías» (revalidan). La página ya exige `web.contenido.gestionar`.
export function useCategoriasDeFaq(
  leidas: CatalogoLeido,
): CategoriasDelCombo & { operaciones: OperacionesDelCatalogo } {
  const crear = useAction(crearCategoriaDeFaq)
  const agregar = useAction(agregarCategoriaDeFaq)
  const guardar = useAction(guardarCategoriaDeFaq)
  const mover = useAction(moverCategoriaDeFaq)
  const quitar = useAction(quitarCategoriaDeFaq)
  const creadas = useConLosCreados(leidas.lista)
  const version = (categoria: ElementoDeCatalogo) => ({
    id: categoria.id,
    actualizadoEnEsperado: categoria.actualizadoEn,
  })
  return {
    ...leidas,
    lista: creadas.lista,
    crear: creadas.conCrear(crearDesdeAccion((nombre) => crear.executeAsync({ nombre }))),
    operaciones: creadas.conQuitar(
      operacionesDesdeAcciones(
        {
          agregar: (nombre) => agregar.executeAsync({ nombre }),
          guardar: (categoria, cambios) => guardar.executeAsync({ ...version(categoria), cambios }),
          mover: (categoria, despuesDe) => mover.executeAsync({ ...version(categoria), despuesDe }),
          quitar: (categoria, destino) => quitar.executeAsync({ ...version(categoria), destino }),
          enCurso: agregar.isPending || guardar.isPending || mover.isPending || quitar.isPending,
        },
        REVISA_LA_CATEGORIA,
      ),
    ),
  }
}
