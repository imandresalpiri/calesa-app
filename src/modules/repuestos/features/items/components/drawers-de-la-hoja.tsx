'use client'

import { useState } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { useEliminarItemPorUrl } from '../hooks/use-eliminar-item-por-url'
import type { useHojaDeItems } from '../hooks/use-hoja-de-items'
import type { useImagenesPorUrl } from '../hooks/use-imagenes-por-url'
import type { useNuevoItemPorUrl } from '../hooks/use-nuevo-item-por-url'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import {
  ConfirmarEliminarItemDiferido,
  DrawerDeImagenesDiferido,
  DrawerDeItemsNuevosDiferido,
  PanelDelItemEnLaHojaDiferido,
} from './diferidos'
import type { HuecoDeLaHoja } from './hueco-de-la-hoja'

// Al cerrar un drawer el foco vuelve a la tarjeta del ítem (a su botón «Abrir …»); si ya no está, al elemento que lo tenía antes.
function focoDeLaTarjeta(id: string | null): HTMLElement | true {
  if (id === null) return true
  return (
    document.querySelector<HTMLElement>(`[data-tarjeta-de-item="${id}"] [data-abre-resumen]`) ??
    true
  )
}

export type Url = {
  eliminacion: ReturnType<typeof useEliminarItemPorUrl>
  imagenes: ReturnType<typeof useImagenesPorUrl>
  nuevo: ReturnType<typeof useNuevoItemPorUrl>
  idAbierto: string | null
}

type PropsDeLosDrawers = {
  hoja: ReturnType<typeof useHojaDeItems>
  url: Url
  contexto: ContextoDeLaHoja
  llena: boolean
  editable: boolean
  cerrado: boolean
  hueco: HuecoDeLaHoja | undefined
}

// Los drawers de la hoja, cada uno pedido al abrirse por primera vez (`useAbiertoAlgunaVez`): el panel del ítem, «Agregar ítems», eliminar y las imágenes. Siguen montados al cerrarse para deslizarse.
export function DrawersDeLaHoja({
  hoja,
  url,
  contexto,
  llena,
  editable,
  cerrado,
  hueco,
}: PropsDeLosDrawers) {
  const { eliminacion, imagenes, nuevo, idAbierto } = url
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const montarImagenes = useAbiertoAlgunaVez(imagenes.abierto)
  const montarNuevo = useAbiertoAlgunaVez(nuevo.abierto)
  const montarItem = useAbiertoAlgunaVez(idAbierto !== null)
  const filaAbierta = hoja.filas.find((fila) => fila.id === idAbierto) ?? null
  // El último ítem abierto: al cerrarse el drawer `idAbierto` ya es nulo cuando Base UI pide a dónde vuelve el foco (tras recargar no hay quien lo abrió).
  const [ultimoAbierto, setUltimoAbierto] = useState<string | null>(null)
  if (idAbierto !== null && idAbierto !== ultimoAbierto) {
    setUltimoAbierto(idAbierto)
  }
  const alAgregar = async (id: string, descripcion: string) => {
    const motivo = await hoja.agregar(id, descripcion)
    if (motivo === null) {
      nuevo.agregado(id)
    }
    return motivo
  }
  return (
    <>
      {montarItem && hueco ? (
        <PanelDelItemEnLaHojaDiferido
          abierto={idAbierto !== null}
          alCerrar={hueco.item.cerrar}
          fila={filaAbierta}
          secciones={hueco.item.secciones}
          idAbierto={idAbierto}
          contexto={contexto}
          cerrado={cerrado}
          conflicto={hoja.conflicto}
          alRecargar={hoja.olvidarConflicto}
          focoAlCerrar={() => focoDeLaTarjeta(ultimoAbierto)}
        />
      ) : null}
      {montarNuevo ? (
        <DrawerDeItemsNuevosDiferido
          abierto={nuevo.abierto}
          alCerrar={nuevo.cerrar}
          apertura={nuevo.apertura}
          filas={hoja.filas}
          ids={nuevo.ids}
          contexto={contexto}
          alAgregar={alAgregar}
          llena={llena}
          conflicto={hoja.conflicto}
          alRecargar={hoja.olvidarConflicto}
          focoAlCerrar={() => document.querySelector<HTMLElement>('[data-agregar-item]') ?? true}
        />
      ) : null}
      {montarEliminar ? (
        <ConfirmarEliminarItemDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          item={eliminacion.item}
          alEliminar={hoja.eliminar}
          focoAlCerrar={() => focoDeLaTarjeta(eliminacion.item?.id ?? null)}
        />
      ) : null}
      {montarImagenes ? (
        <DrawerDeImagenesDiferido
          abierto={imagenes.abierto}
          alCerrar={imagenes.cerrar}
          apertura={imagenes.apertura}
          item={imagenes.item}
          editable={editable}
          cerrado={cerrado}
          focoAlCerrar={() => focoDeLaTarjeta(imagenes.item?.id ?? null)}
        />
      ) : null}
    </>
  )
}
