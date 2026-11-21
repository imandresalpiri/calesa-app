'use client'

import { useMemo, type ReactNode } from 'react'
import { UnaSolaVista } from '@/shared/ui/lista'
import { SimbolosDeXCell } from '@/shared/ui/xcell'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  hojaLlena,
  type CatalogosDeLaHoja,
  type MonedaDeLaHoja,
} from '../../../entities/items/hoja'
import { agruparPorPaso, type GrupoPorPaso } from '../../../entities/items/grupos-por-paso'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { useEliminarItemPorUrl } from '../hooks/use-eliminar-item-por-url'
import { useImagenesPorUrl } from '../hooks/use-imagenes-por-url'
import { useHojaDeItems } from '../hooks/use-hoja-de-items'
import {
  AvisoDeCerrado,
  AvisoDeConflictoDeLaHoja,
  AvisoDeTopeDeLaHoja,
  HojaVacia,
} from './avisos-de-la-hoja'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import type { ApiDelHueco, HuecoDeLaHoja } from './hueco-de-la-hoja'
import { ConfirmarEliminarItemDiferido, DrawerDeImagenesDiferido } from './diferidos'
import { FilaNueva } from './fila-nueva'
import { TablaDeItems } from './tabla-de-items'
import { TarjetasDeItems } from './tarjetas-de-items'

export type PropsDeLaHoja = {
  proyectoId: string
  filas: readonly FilaDeItem[]
  hayMas: boolean
  catalogos: CatalogosDeLaHoja
  // Las monedas activas, en su orden: la primera es la por defecto (D52).
  monedas: readonly MonedaDeLaHoja[]
  // `puede(permisos, 'repuestos.editar')`, calculado en el servidor.
  puedeEditar: boolean
  cerrado: boolean
  // El lugar de cada fase en el orden del flujo (la hoja agrupa por paso con él); nulo = flujo sin fases o ilegible: todo en «Sin fase». Lo pasa `src/app` (de
  // `IndiceDelFlujo.lugar`): `items` no importa `flujo`.
  ordenDeLasFases: ReadonlyMap<string, number> | null
  // Lo que otra área pone en cada fila y su panel (8.10-2); lo llena `src/app`.
  hueco?: HuecoDeLaHoja
  // Otra pestaña del proyecto está abierta: la hoja sigue montada (sus filas vivas alimentan la barra de progreso y volver no la relee) pero no se ve.
  oculta?: boolean
}

// Las filas vivas agrupadas por paso: se recalcula sólo si cambian las filas, el orden o el tope (O(n) sobre ≤ 200).
function useGruposPorPaso(
  filas: readonly FilaDeItem[],
  ordenDeLasFases: ReadonlyMap<string, number> | null,
  hayMas: boolean,
) {
  return useMemo(
    () => agruparPorPaso(filas, ordenDeLasFases, hayMas),
    [filas, ordenDeLasFases, hayMas],
  )
}

const primeraMoneda = (monedas: readonly MonedaDeLaHoja[]) => monedas[0]?.codigo ?? null
const cabeOtro = (editable: boolean, filas: readonly FilaDeItem[], hayMas: boolean) =>
  editable && !hojaLlena(filas, hayMas)

function Vistas({
  grupos,
  contexto,
  filaNueva,
}: {
  grupos: readonly GrupoPorPaso[]
  contexto: ContextoDeLaHoja
  filaNueva: ReactNode
}) {
  return (
    <UnaSolaVista
      tabla={() => <TablaDeItems grupos={grupos} contexto={contexto} filaNueva={filaNueva} />}
      tarjetas={() => <TarjetasDeItems grupos={grupos} contexto={contexto} filaNueva={filaNueva} />}
    />
  )
}

// La hoja de ítems de un proyecto (8.09-2, C8 a C13; imágenes: 8.09-3): la tabla desde 768 px y, debajo, una tarjeta por ítem, en una sola vista, editable celda a celda con `repuestos.editar` y el proyecto abierto; sin
// eso, de lectura. Vacío de primera vez, aviso del proyecto cerrado, tope de 200 (D54: con 200 no se dibuja la fila nueva) y el conflicto con «Recargar». No filtra ni pagina: hasta 200 filas,
// agrupadas por paso en el navegador (`agruparPorPaso`: el orden del flujo, «Sin fase» al final, «N+» con la hoja topada).
export function HojaDeItems(props: PropsDeLaHoja) {
  const editable = props.puedeEditar && !props.cerrado
  const monedaPorDefecto = primeraMoneda(props.monedas)
  const hoja = useHojaDeItems({
    proyectoId: props.proyectoId,
    filasDelServidor: props.filas,
    monedaPorDefecto,
  })
  const eliminacion = useEliminarItemPorUrl(hoja.filas, editable)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const aEliminar = eliminacion.item
  const imagenes = useImagenesPorUrl(hoja.filas)
  const montarImagenes = useAbiertoAlgunaVez(imagenes.abierto)
  const deImagenes = imagenes.item
  const grupos = useGruposPorPaso(hoja.filas, props.ordenDeLasFases, props.hayMas)

  const contexto: ContextoDeLaHoja = {
    editable,
    catalogos: props.catalogos,
    monedas: props.monedas,
    monedaPorDefecto,
    errores: hoja.errores,
    guardar: hoja.guardar,
    alConfirmarNumero: hoja.alConfirmarNumero,
    alReiniciar: hoja.alReiniciar,
    alPedirEliminar: eliminacion.abrir,
    alPedirImagenes: imagenes.abrir,
    accionDeFila: accionDelHueco(props.hueco),
    pasoDeFila: pasoDelHueco(props.hueco),
  }
  const filaNueva = cabeOtro(editable, hoja.filas, props.hayMas) ? (
    <FilaNueva alAgregar={hoja.agregar} />
  ) : null
  const hayFilas = hoja.filas.length > 0
  const api = apiDelHueco(hoja, props)

  return (
    <>
      {arribaDelHueco(props.hueco, api)}
      <section
        aria-label="Ítems del proyecto"
        hidden={props.oculta === true}
        className="grid grid-cols-[minmax(0,1fr)] gap-3"
      >
        <SimbolosDeXCell />
        {props.cerrado ? <AvisoDeCerrado /> : null}
        {hoja.conflicto ? (
          <AvisoDeConflictoDeLaHoja mensaje={hoja.conflicto} alRecargar={hoja.olvidarConflicto} />
        ) : null}
        {hayFilas ? null : <HojaVacia />}
        {hayFilas || filaNueva !== null ? (
          <Vistas grupos={grupos} contexto={contexto} filaNueva={filaNueva} />
        ) : null}
        {props.hayMas ? <AvisoDeTopeDeLaHoja /> : null}
        {montarEliminar ? (
          <ConfirmarEliminarItemDiferido
            abierto={eliminacion.abierto}
            alCerrar={eliminacion.cerrar}
            item={aEliminar}
            alEliminar={hoja.eliminar}
            focoAlCerrar={() => focoDeEliminar(aEliminar)}
          />
        ) : null}
        {montarImagenes ? (
          <DrawerDeImagenesDiferido
            abierto={imagenes.abierto}
            alCerrar={imagenes.cerrar}
            apertura={imagenes.apertura}
            item={deImagenes}
            editable={editable}
            cerrado={props.cerrado}
            focoAlCerrar={() => focoDeImagenes(deImagenes)}
          />
        ) : null}
        {panelDelHueco(props.hueco, api)}
      </section>
    </>
  )
}

const apiDelHueco = (
  hoja: Pick<ReturnType<typeof useHojaDeItems>, 'filas' | 'cambiarFila'>,
  props: Pick<PropsDeLaHoja, 'puedeEditar' | 'cerrado'>,
): ApiDelHueco => ({
  filas: hoja.filas,
  puedeEditar: props.puedeEditar,
  cerrado: props.cerrado,
  cambiarFila: hoja.cambiarFila,
})
const accionDelHueco = (hueco: HuecoDeLaHoja | undefined) => hueco?.accionDeFila
const pasoDelHueco = (hueco: HuecoDeLaHoja | undefined) => hueco?.pasoDeFila
const arribaDelHueco = (hueco: HuecoDeLaHoja | undefined, api: ApiDelHueco) =>
  hueco?.arriba ? hueco.arriba(api) : null
const panelDelHueco = (hueco: HuecoDeLaHoja | undefined, api: ApiDelHueco) =>
  hueco ? hueco.panel(api) : null

// Al cerrar el diálogo el foco vuelve al botón «Eliminar» de esa fila (la URL lo abrió y el botón pudo redibujarse).
function focoDeEliminar(item: FilaDeItem | null): HTMLElement | true {
  return (item && document.querySelector<HTMLElement>(`[data-eliminar-item="${item.id}"]`)) ?? true
}

// Al cerrar el panel el foco vuelve al botón «Imágenes» de esa fila (la URL lo abrió y el botón pudo redibujarse).
function focoDeImagenes(item: FilaDeItem | null): HTMLElement | true {
  return (item && document.querySelector<HTMLElement>(`[data-imagenes-item="${item.id}"]`)) ?? true
}
