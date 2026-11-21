'use client'

import { useMemo } from 'react'
import { EstadoSinResultados } from '@/shared/ui/estados'
import type { AccionDeMenu } from '@/shared/ui/lista'
import {
  hojaLlena,
  type CatalogosDeLaHoja,
  type MonedaDeLaHoja,
} from '../../../entities/items/hoja'
import { TEXTO_SIN_RESULTADOS } from '../../../entities/items/hoja'
import { accionesDelItem } from '../../../entities/items/acciones'
import { filtrarItems, opcionesDelFiltro } from '../../../entities/items/filtro'
import { agruparPorPaso, type GrupoPorPaso } from '../../../entities/items/grupos-por-paso'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { useEliminarItemPorUrl } from '../hooks/use-eliminar-item-por-url'
import { useFiltroDeItems } from '../hooks/use-filtro-de-items'
import { useHojaDeItems } from '../hooks/use-hoja-de-items'
import { useImagenesPorUrl } from '../hooks/use-imagenes-por-url'
import { useNuevoItemPorUrl } from '../hooks/use-nuevo-item-por-url'
import { AvisoDeCerrado, AvisoDeTopeDeLaHoja, HojaVacia } from './avisos-de-la-hoja'
import { BarraDeItems } from './barra-de-items'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import { DrawersDeLaHoja, type Url } from './drawers-de-la-hoja'
import type { ApiDelHueco, HuecoDeLaHoja } from './hueco-de-la-hoja'
import { TarjetasPorPaso } from './tarjetas-por-paso'

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
  // Lo que otra área pone en cada tarjeta y su panel (8.10-2); lo llena `src/app`.
  hueco?: HuecoDeLaHoja
  // Otra pestaña del proyecto está abierta: la hoja sigue montada (sus filas vivas alimentan la barra de progreso y volver no la relee) pero no se ve.
  oculta?: boolean
}

const ignorar = () => undefined
const primeraMoneda = (monedas: readonly MonedaDeLaHoja[]) => monedas[0]?.codigo ?? null

const apiDelHueco = (
  hoja: Pick<ReturnType<typeof useHojaDeItems>, 'filas' | 'cambiarFila'>,
  props: Pick<PropsDeLaHoja, 'puedeEditar' | 'cerrado'>,
): ApiDelHueco => ({
  filas: hoja.filas,
  puedeEditar: props.puedeEditar,
  cerrado: props.cerrado,
  cambiarFila: hoja.cambiarFila,
})

// Lo que se dibuja cuando no hay tarjetas: el vacío de primera vez o el de los filtros.
function SinTarjetas({ hayFilas, alLimpiar }: { hayFilas: boolean; alLimpiar: () => void }) {
  if (!hayFilas) {
    return <HojaVacia />
  }
  return <EstadoSinResultados alLimpiar={alLimpiar} descripcion={TEXTO_SIN_RESULTADOS} />
}

type PropsDeLaLista = {
  grupos: readonly GrupoPorPaso[]
  hayFilas: boolean
  alLimpiar: () => void
  catalogos: CatalogosDeLaHoja
  monedaPorDefecto: string | null
  hueco: HuecoDeLaHoja | undefined
  accionesDe: (fila: FilaDeItem) => readonly AccionDeMenu[]
}

// Las tarjetas por paso o, si no hay ninguna, el vacío que toca (primera vez o filtros).
function ListaDeLaHoja({ grupos, hayFilas, alLimpiar, hueco, ...resto }: PropsDeLaLista) {
  if (grupos.length === 0) {
    return <SinTarjetas hayFilas={hayFilas} alLimpiar={alLimpiar} />
  }
  return (
    <TarjetasPorPaso
      grupos={grupos}
      catalogos={resto.catalogos}
      monedaPorDefecto={resto.monedaPorDefecto}
      alAbrir={hueco?.item.abrir ?? ignorar}
      accionesDe={resto.accionesDe}
      siguienteDe={(fila) => hueco?.pasoDeFila?.(fila) ?? null}
    />
  )
}

// Lo que se ve de la hoja con la búsqueda y los filtros de la URL: las filas que pasan, agrupadas por paso, y las opciones de cada ficha (O(n) sobre ≤ 200).
function useVistaDeLaHoja(filas: readonly FilaDeItem[], props: PropsDeLaHoja) {
  const filtroDeUrl = useFiltroDeItems()
  const { filtro } = filtroDeUrl
  const { catalogos, ordenDeLasFases, hayMas } = props
  const visibles = useMemo(() => filtrarItems(filas, filtro, catalogos), [filas, filtro, catalogos])
  const grupos = useMemo(
    () => agruparPorPaso(visibles, ordenDeLasFases, hayMas),
    [visibles, ordenDeLasFases, hayMas],
  )
  const opciones = useMemo(
    () => opcionesDelFiltro(filas, catalogos, filtro, ordenDeLasFases),
    [filas, catalogos, filtro, ordenDeLasFases],
  )
  return { filtroDeUrl, filtro, visibles, grupos, opciones }
}

// Las acciones del «⋯» de cada tarjeta: Imágenes, las del hueco (Stock, Mover a…) y Eliminar.
function useAccionesDeLaTarjeta(url: Url, editable: boolean, hueco: HuecoDeLaHoja | undefined) {
  const { imagenes, eliminacion } = url
  return (fila: FilaDeItem) =>
    accionesDelItem(
      {
        editable,
        alImagenes: () => {
          imagenes.abrir(fila.id)
        },
        alEliminar: () => {
          eliminacion.abrir(fila.id)
        },
      },
      hueco?.accionesDeFila(fila) ?? [],
    )
}

// Los ítems de un proyecto (8.09-2, C8 a C13; imágenes: 8.09-3): el buscador y los filtros, y los ítems como tarjetas agrupadas por paso (hasta 200, filtradas en el navegador). Un clic en la tarjeta abre su
// panel de abajo (`?item=`) con la fila del ítem como Excel, editable celda a celda con `repuestos.editar` y el proyecto abierto; «Agregar ítem» abre otro con la fila nueva (`?panel=nuevo-item`). Con el
// proyecto cerrado, sin permiso o con el tope de 200 se dice en su lugar.
export function HojaDeItems(props: PropsDeLaHoja) {
  const editable = props.puedeEditar && !props.cerrado
  const monedaPorDefecto = primeraMoneda(props.monedas)
  const hoja = useHojaDeItems({
    proyectoId: props.proyectoId,
    filasDelServidor: props.filas,
    monedaPorDefecto,
  })
  const vista = useVistaDeLaHoja(hoja.filas, props)
  const llena = hojaLlena(hoja.filas, props.hayMas)
  const hueco = props.hueco
  const url: Url = {
    eliminacion: useEliminarItemPorUrl(hoja.filas, editable),
    imagenes: useImagenesPorUrl(hoja.filas),
    nuevo: useNuevoItemPorUrl({ editable, llena }),
    idAbierto: hueco?.item.abierto ?? null,
  }
  const accionesDe = useAccionesDeLaTarjeta(url, editable, hueco)
  const contexto: ContextoDeLaHoja = {
    editable,
    catalogos: props.catalogos,
    monedas: props.monedas,
    monedaPorDefecto,
    errores: hoja.errores,
    guardar: hoja.guardar,
    alConfirmarNumero: hoja.alConfirmarNumero,
    alReiniciar: hoja.alReiniciar,
  }
  const api = apiDelHueco(hoja, props)
  const { filtroDeUrl } = vista

  return (
    <>
      {hueco?.arriba ? hueco.arriba(api) : null}
      <section
        aria-label="Ítems del proyecto"
        hidden={props.oculta === true}
        className="grid grid-cols-[minmax(0,1fr)] gap-3"
      >
        <BarraDeItems
          filtro={vista.filtro}
          opciones={vista.opciones}
          cuantas={vista.visibles.length}
          total={hoja.filas.length}
          hayMas={props.hayMas}
          alCambiar={filtroDeUrl.cambiar}
          alAlternarSinPrecio={filtroDeUrl.alternarSinPrecio}
          alLimpiar={filtroDeUrl.limpiar}
          alAgregar={editable && !llena ? url.nuevo.abrir : null}
        />
        {props.cerrado ? <AvisoDeCerrado /> : null}
        <ListaDeLaHoja
          grupos={vista.grupos}
          hayFilas={hoja.filas.length > 0}
          alLimpiar={filtroDeUrl.limpiar}
          catalogos={props.catalogos}
          monedaPorDefecto={monedaPorDefecto}
          hueco={hueco}
          accionesDe={accionesDe}
        />
        {props.hayMas ? <AvisoDeTopeDeLaHoja /> : null}
        <DrawersDeLaHoja
          hoja={hoja}
          url={url}
          contexto={contexto}
          llena={llena}
          editable={editable}
          cerrado={props.cerrado}
          hueco={hueco}
        />
        {hueco ? hueco.panel(api) : null}
      </section>
    </>
  )
}
