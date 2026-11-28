'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { PedidoDePlantillas } from '../../../entities/filtros'
import type { PaginaDeArtes, PlantillaDeArte } from '../../../entities/tipos'
import { leerMasPlantillasDeArte } from '../actions/leer-mas-plantillas'
import { useCargaDeArtes } from './use-carga-de-artes'

const NO_SE_LEYERON = 'No se pudieron cargar las plantillas de arte.'

// Las plantillas de arte cargadas con los filtros de la URL. Otros filtros = otra `key` de la lista: empiezan de cero. «Ver más» lee en el
// servidor (`leerMasPlantillasDeArte`): la rejilla no carga supabase-js.
export function usePlantillas({
  inicial,
  pedido,
}: {
  inicial: PaginaDeArtes<PlantillaDeArte>
  pedido: PedidoDePlantillas
}) {
  const mas = useAction(leerMasPlantillasDeArte)
  return useCargaDeArtes({
    inicial,
    mensaje: NO_SE_LEYERON,
    leerMas: (cursor) => enviarAccion(mas.executeAsync({ pedido, cursor }), NO_SE_LEYERON),
  })
}

export type PlantillasCargadas = ReturnType<typeof usePlantillas>
