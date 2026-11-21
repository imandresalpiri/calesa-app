'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useTransition, type ComponentProps, type ReactNode } from 'react'
import { useAlCambiarElDineroDelProyecto } from '@/modules/logistica/pantallas/dinero-proyecto'
import { useItemPorUrl } from '@/modules/repuestos/pantallas/flujo'
import {
  PasoDelItem,
  PasosDelProyecto,
  useIndiceDelFlujo,
  type HitoDelSiguiente,
  type LecturaDeLosPasos,
  type IndiceDelFlujo,
  type PanelDelPaso as Panel,
} from '@/modules/repuestos/pantallas/flujo-pasos'
import { HojaDeItems, type HuecoDeLaHoja } from '@/modules/repuestos/pantallas/items'
import { PanelDeStock, useStockPorUrl } from '@/modules/repuestos/pantallas/stock'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import type { AccionDeMenu } from '@/shared/ui/lista'
import { BarraDePestanas } from './barra-de-pestanas'
import { PanelDelPaso } from './panel-del-paso'
import { usePanelDelPaso } from './use-panel-del-paso'

type Props = Omit<ComponentProps<typeof HojaDeItems>, 'hueco' | 'ordenDeLasFases'> & {
  lectura: LecturaDeLosPasos
  // Si hay un pago vivo; nulo sin `repuestos.costos.ver`.
  pago: boolean | null
  disponibles: readonly Panel[]
  // El panel que dibujó el servidor y cuál es (puede quedar atrás del de la URL mientras llega la página).
  panelDelServidor: { panel: Panel; contenido: ReactNode } | null
  titulos: Readonly<Record<Panel, string>>
  // El número del proyecto, para el nombre compacto de la barra de pestañas pegada.
  numero: number
  // Lo calcula el servidor con `puede()`; la base vuelve a exigirlo.
  puede: { mover: boolean; cotizar: boolean; registrarPago: boolean; configurar: boolean }
  // Las secciones del panel del ítem de `?item=` que dibujó el servidor y de qué ítem son (nulo sin `?item=`).
  seccionesDelItem: { id: string; contenido: ReactNode } | null
}

type PropsDeArriba = Pick<Props, 'lectura' | 'pago' | 'disponibles' | 'titulos' | 'hayMas'> & {
  indice: IndiceDelFlujo | null
  filas: ComponentProps<typeof PasosDelProyecto>['filas']
  paso: ReturnType<typeof usePanelDelPaso>
  contenido: ReactNode
  puedeConfigurar: boolean
  numero: number
}

const CLAVE_DE_LA_HOJA = 'items'

// Mientras llega la pestaña elegida: lo mismo que ella dibuja al leer, en el mismo alto reservado.
function EsqueletoDeLaPestana() {
  return <EsqueletoListado filas={4} columnas={4} />
}

// Lo que va arriba de la hoja: la barra de progreso, las pestañas del proyecto (Ítems siempre; las otras con su permiso) y, si la abierta no es Ítems, su contenido.
function ArribaDeLaHoja({
  indice,
  lectura,
  paso,
  titulos,
  contenido,
  numero,
  ...props
}: PropsDeArriba) {
  const router = useRouter()
  const pestanas = [
    { clave: CLAVE_DE_LA_HOJA, titulo: 'Ítems' },
    ...props.disponibles.map((panel) => ({ clave: panel, titulo: titulos[panel] })),
  ]
  return (
    <>
      <PasosDelProyecto
        indice={indice}
        estado={lectura.estado}
        filas={props.filas}
        hayMas={props.hayMas}
        pago={props.pago}
        disponibles={props.disponibles}
        alElegirPanel={paso.elegir}
        puedeConfigurar={props.puedeConfigurar}
        alReintentar={() => {
          router.refresh()
        }}
      />
      <BarraDePestanas
        titulo={`Proyecto #${String(numero)}`}
        pestanas={pestanas}
        valor={paso.abierto ?? CLAVE_DE_LA_HOJA}
        alElegir={(clave) => {
          paso.elegir(props.disponibles.find((p) => p === clave) ?? null)
        }}
      />
      {paso.abierto === null ? null : (
        <PanelDelPaso
          titulo={titulos[paso.abierto]}
          enfocar={paso.enfocar}
          alEnfocar={paso.yaEnfocado}
        >
          {contenido}
        </PanelDelPaso>
      )}
    </>
  )
}

// Lo que dibuja la pestaña abierta: lo del servidor si es la misma que dice la URL y, mientras llega, su esqueleto.
function contenidoDeLaPestana(abierto: Panel | null, delServidor: Props['panelDelServidor']) {
  return abierto !== null && delServidor?.panel === abierto ? (
    delServidor.contenido
  ) : (
    <EsqueletoDeLaPestana />
  )
}

type EntradaDeLasAcciones = {
  abrirStock: (id: string) => void
  abrirItem: (id: string) => void
  puedeMover: boolean
  cerrado: boolean
}

// Lo que este hueco suma al «⋯» de la tarjeta: Stock (de todos) y «Mover a…» (abre el panel del ítem, donde está «Qué falta»; sólo con `repuestos.mover`, el proyecto abierto y un ítem que no está en una fase final).
function useAccionesDeFila({ abrirStock, abrirItem, puedeMover, cerrado }: EntradaDeLasAcciones) {
  return useCallback<HuecoDeLaHoja['accionesDeFila']>(
    (fila) => {
      const acciones: AccionDeMenu[] = [
        {
          tipo: 'accion',
          clave: 'stock',
          etiqueta: 'Stock',
          despuesDeCerrar: true,
          alElegir: () => {
            abrirStock(fila.id)
          },
        },
      ]
      if (puedeMover && !cerrado && fila.fase !== null && !fila.fase.esFinal) {
        acciones.push({
          tipo: 'accion',
          clave: 'mover',
          etiqueta: 'Mover a…',
          despuesDeCerrar: true,
          alElegir: () => {
            abrirItem(fila.id)
          },
        })
      }
      return acciones
    },
    [abrirStock, abrirItem, puedeMover, cerrado],
  )
}

// La hoja del proyecto con todo lo que otras áreas ponen en su hueco (un área no importa otra, y una función no cruza de un Server Component a uno de cliente): arriba,
// la barra de progreso, las pestañas y el contenido de la abierta (la hoja sigue montada pero oculta mientras se ve otra pestaña); el orden de las fases, para agrupar la hoja por paso; en cada tarjeta, el botón de su siguiente y, en su «⋯», Stock y «Mover a…»; el panel del ítem (`?item=`) con las secciones que dibuja el servidor; y el panel del stock. Cuando cambia el dinero del
// proyecto (un pago), vuelve a pedir la página para que los pasos y los botones digan si ya hay pago; mientras tanto, los botones del siguiente se apagan.
export function HojaDelProyecto({
  lectura,
  pago,
  disponibles,
  panelDelServidor,
  titulos,
  numero,
  puede,
  seccionesDelItem,
  ...hoja
}: Props) {
  const router = useRouter()
  const [refrescando, iniciar] = useTransition()
  useAlCambiarElDineroDelProyecto(hoja.proyectoId, () => {
    iniciar(() => {
      router.refresh()
    })
  })
  const indice = useIndiceDelFlujo(lectura)
  const stock = useStockPorUrl()
  const { abrir: abrirStock } = stock
  const item = useItemPorUrl()
  const { abrir: abrirItem, cerrar: cerrarItem } = item
  const paso = usePanelDelPaso(disponibles)
  const accionesDeFila = useAccionesDeFila({
    abrirStock,
    abrirItem,
    puedeMover: puede.mover,
    cerrado: hoja.cerrado,
  })
  const contexto = { pago, cerrado: hoja.cerrado, puede }
  const alHito = (_: string, hito: HitoDelSiguiente) => {
    if (hito === 'pago') paso.registrarPago()
    else paso.abrirCotizaciones()
  }
  const contenido = contenidoDeLaPestana(paso.abierto, panelDelServidor)
  return (
    <HojaDeItems
      {...hoja}
      ordenDeLasFases={indice?.lugar ?? null}
      oculta={paso.abierto !== null}
      hueco={{
        item: {
          abierto: item.id,
          abrir: abrirItem,
          cerrar: cerrarItem,
          secciones: seccionesDelItem,
        },
        accionesDeFila,
        panel: (api) => <PanelDeStock url={stock} api={api} />,
        arriba: (api) => (
          <ArribaDeLaHoja
            indice={indice}
            lectura={lectura}
            filas={api.filas}
            hayMas={hoja.hayMas}
            pago={pago}
            disponibles={disponibles}
            paso={paso}
            titulos={titulos}
            contenido={contenido}
            puedeConfigurar={puede.configurar}
            numero={numero}
          />
        ),
        pasoDeFila: (fila) =>
          indice === null ? null : (
            <PasoDelItem
              indice={indice}
              fila={fila}
              contexto={contexto}
              apagado={refrescando}
              alMover={abrirItem}
              alHito={alHito}
            />
          ),
      }}
    />
  )
}
