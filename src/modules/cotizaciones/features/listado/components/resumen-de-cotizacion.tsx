'use client'

import { useEffect, type ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { Skeleton } from '@/shared/ui/skeleton'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  MENSAJE_DE_COTIZACION_NO_DISPONIBLE,
  rutaDelResumen,
  vistaDelResumen,
  type LecturaDelServidor,
  type VistaDelResumen,
} from '../../../entities/listado/resumen-del-listado'
import {
  rutaDelVehiculoDeLaFila,
  SIN_VEHICULOS_VISIBLES,
  type VehiculosVisibles,
} from '../../../entities/listado/ruta-del-vehiculo'
import type {
  AprobarEnDelResumen,
  HuecosDelResumen,
  QuienDelResumen,
} from '../../hoja/components/huecos-del-resumen'
import { usePedidoAlServidor } from '../hooks/use-pedido-al-servidor'
import { useResumenDeCotizacion } from '../hooks/use-resumen-de-cotizacion'
import { AccionesDelResumen } from './acciones-del-resumen'
import { CabeceraDelResumen } from './cabecera-del-resumen'
import {
  nombreDelOrigen,
  type CompartirDe,
  type FilaDeCotizacion,
  type MenuDeFila,
  type OrigenDelListado,
} from './tipos'

type Props = {
  // Las filas de la página: de ahí sale lo que se ve de inmediato.
  filas: readonly FilaDeCotizacion[]
  origenes: readonly OrigenDelListado[]
  // Lo que el servidor leyó de la cotización de la URL cuando no está en la página.
  delServidor: LecturaDelServidor | null
  // Lo que las áreas llenan bajo el detalle (las pestañas) y lo que quien mira puede hacer con cada cotización (por id). Sin ellos, el resumen es sólo lo que trae la fila.
  huecos?: HuecosDelResumen
  quienes?: Readonly<Record<string, QuienDelResumen>>
  // Dónde aprueba quien mira (para «De este vehículo»; sin él, «Aprobar esta» apagado con su motivo) y qué hacer tras aprobar desde el resumen.
  aprobarEn?: AprobarEnDelResumen
  alCambiarLaAprobada?: () => void
  // La barra de arriba: el «⋯» de la fila (sin «Compartir») y «Compartir» de la tarjeta, los mismos del listado. Sin ellos, sólo «Abrir cotización».
  menuDeFila?: MenuDeFila | undefined
  compartirDe?: CompartirDe | undefined
  // Los diálogos del «⋯» y de «Compartir» mientras el resumen está abierto: dentro del Drawer, para que abrirlos no cuente como un clic afuera que lo cierra.
  dialogos?: ReactNode
  // En qué orígenes quien mira ve vehículos: con ello el título y el dato «Vehículo» enlazan a su ficha. Sin él, texto.
  vehiculosVisibles?: VehiculosVisibles | undefined
  // Abierto desde una ficha: la ruta a la que vuelve «Abrir cotización» (la ficha, con su consulta). En el listado, nulo.
  volverA?: string | null
  // Avisa que su código llegó y está montado: recién ahí el listado le pasa los diálogos.
  alMontarse?: (listo: true) => void
}

// Lo que dibuja la barra de arriba del resumen.
type BarraDelResumen = {
  menuDeFila: MenuDeFila | undefined
  compartirDe: CompartirDe | undefined
  volverA: string | null
}

// Lo que el resumen le pasa a «De este vehículo».
type DeEsteVehiculoEnElDetalle = {
  aprobarEn: AprobarEnDelResumen
  alCambiarLaAprobada: (() => void) | undefined
}

function EsqueletoDelResumen() {
  return (
    <div aria-busy="true" aria-label="Cargando la cotización" className="grid gap-3">
      <Skeleton className="h-11 w-full md:h-9" />
      <div className="flex gap-3">
        <Skeleton className="h-14 w-24 shrink-0 sm:w-32" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <Skeleton className="h-11 w-full md:h-9" />
    </div>
  )
}

// «De este vehículo» de la quinta pestaña: sólo con un vehículo que quien mira ve. El bloque no dibuja su título (la pestaña lo es) y, sin otras, dice que ésta es la única.
function deEsteVehiculoDe(
  cotizacion: FilaDeCotizacion,
  { DeEsteVehiculo }: HuecosDelResumen,
  { aprobarEn, alCambiarLaAprobada }: DeEsteVehiculoEnElDetalle,
): ReactNode {
  if (
    DeEsteVehiculo === undefined ||
    cotizacion.vehiculoId === null ||
    cotizacion.vehiculo === null
  ) {
    return undefined
  }
  return (
    <DeEsteVehiculo
      key={cotizacion.id}
      vehiculo={{ id: cotizacion.vehiculoId, titulo: cotizacion.vehiculo }}
      cotizacionActual={cotizacion.id}
      aprobarEn={aprobarEn}
      alCambiar={alCambiarLaAprobada}
      conCasillas
      volverA={rutaDelResumen(cotizacion.id)}
      vacio="Ésta es la única cotización de este vehículo."
    />
  )
}

// La cabecera fija (la barra, y la miniatura con los datos) y, debajo, las pestañas que llenan el resto del alto.
function DetalleDeLaCotizacion({
  cotizacion,
  huecos,
  quien,
  abierto,
  deEsteVehiculo,
  barra,
  vehiculosVisibles,
}: {
  cotizacion: FilaDeCotizacion
  abierto: boolean
  huecos: HuecosDelResumen
  quien: QuienDelResumen
  deEsteVehiculo: DeEsteVehiculoEnElDetalle
  barra: BarraDelResumen
  vehiculosVisibles: VehiculosVisibles
}) {
  const { Imagen, Pestanas, Comprobantes } = huecos
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <div className="grid min-w-0 gap-3">
        <AccionesDelResumen
          cotizacionId={cotizacion.id}
          volverA={barra.volverA}
          compartir={barra.compartirDe?.(cotizacion) ?? null}
          menu={barra.menuDeFila?.(cotizacion, { sinCompartir: true, conBorde: true }) ?? null}
        />
        <CabeceraDelResumen
          cotizacion={cotizacion}
          rutaDelVehiculo={rutaDelVehiculoDeLaFila(cotizacion, vehiculosVisibles)}
          miniatura={
            Imagen === undefined ? null : (
              <Imagen
                key={cotizacion.id}
                cotizacionId={cotizacion.id}
                numero={cotizacion.numero}
                total={{ valor: cotizacion.totalBase }}
                ancho={480}
                recorte="cubrir"
                miniatura
              />
            )
          }
        />
      </div>
      {Pestanas === undefined ? null : (
        <Pestanas
          cotizacion={{ id: cotizacion.id, numero: cotizacion.numero, clase: cotizacion.clase }}
          puedeAdjuntar={quien.puedeAdjuntar}
          puedeModerar={quien.puedeModerar}
          abierto={abierto}
          Comprobantes={Comprobantes}
          deEsteVehiculo={deEsteVehiculoDe(cotizacion, huecos, deEsteVehiculo)}
        />
      )}
    </div>
  )
}

// Quien mira sin lo que el servidor calculó (una cotización que no estaba en la página ni la leyó): nada de adjuntar ni de moderar, que es lo conservador.
const SIN_PERMISOS: QuienDelResumen = { puedeAdjuntar: false, puedeModerar: false }
// Sin saber dónde aprueba quien mira, en ningún origen: «Aprobar esta» apagado con su motivo (la base vuelve a decidir al aprobar).
const SIN_DONDE_APROBAR: AprobarEnDelResumen = []

function ContenidoDelResumen({
  vista,
  ultimo,
  reintentar,
  huecos,
  quienes,
  deEsteVehiculo,
  barra,
  vehiculosVisibles,
}: {
  vista: VistaDelResumen
  ultimo: FilaDeCotizacion | null
  reintentar: () => void
  huecos: HuecosDelResumen
  quienes: Readonly<Record<string, QuienDelResumen>>
  deEsteVehiculo: DeEsteVehiculoEnElDetalle
  barra: BarraDelResumen
  vehiculosVisibles: VehiculosVisibles
}) {
  if (vista.tipo === 'no_disponible') {
    return (
      <p role="status" className="text-(length:--text-sm) text-(--color-ink)">
        {MENSAJE_DE_COTIZACION_NO_DISPONIBLE}
      </p>
    )
  }
  if (vista.tipo === 'error') {
    return (
      <div role="alert" className="grid gap-3">
        <p className="text-(length:--text-sm) text-(--color-ink)">
          No se pudo cargar la cotización.
        </p>
        <Button type="button" variant="outline" onClick={reintentar} className="w-fit">
          Reintentar
        </Button>
      </div>
    )
  }
  // La última que se mostró sólo mientras se cierra (`vista` es `cerrado`).
  const cotizacion =
    vista.tipo === 'cotizacion' ? vista.cotizacion : vista.tipo === 'cerrado' ? ultimo : null
  return cotizacion === null ? (
    <EsqueletoDelResumen />
  ) : (
    <DetalleDeLaCotizacion
      cotizacion={cotizacion}
      abierto={vista.tipo === 'cotizacion'}
      huecos={huecos}
      quien={quienes[cotizacion.id] ?? SIN_PERMISOS}
      deEsteVehiculo={deEsteVehiculo}
      barra={barra}
      vehiculosVisibles={vehiculosVisibles}
    />
  )
}

function tituloDelResumen(mostrada: FilaDeCotizacion | null, sinCotizacion: boolean): string {
  if (sinCotizacion) {
    return 'Cotización no disponible'
  }
  return mostrada === null ? 'Cotización' : `Cotización n.º ${String(mostrada.numero)}`
}

// El resumen de una cotización (`?cotizacion=`) sin salir de la pantalla (el listado o la ficha del lead y del vehículo), en un panel ancho. Arriba y fijo, «Abrir cotización» (a su
// página), «Compartir cotización» y el «⋯» de la fila sin «Compartir» (`menuDeFila`, `compartirDe`) y la cabecera resumida (la miniatura de la imagen de la tarjeta y los datos de la fila);
// debajo, las pestañas «Todo», «Adjuntos», «Revisiones», «Comentarios» y, con vehículo, «De este vehículo» que llenan las áreas (`huecos`) y ocupan el resto del alto. Si la cotización no está en la página, la leyó el servidor (`delServidor`); si tampoco, se le pide una vez
// (`router.refresh()`) y, si no llega, dice «error» con «Reintentar». Una que no existe o que quien mira no ve dice lo mismo, sin explicar por qué y sin la barra.
export function ResumenDeCotizacion({
  filas,
  origenes,
  delServidor,
  huecos,
  quienes,
  aprobarEn,
  alCambiarLaAprobada,
  menuDeFila,
  compartirDe,
  dialogos,
  vehiculosVisibles = SIN_VEHICULOS_VISIBLES,
  volverA = null,
  alMontarse,
}: Props) {
  useEffect(() => {
    alMontarse?.(true)
  }, [alMontarse])
  const resumen = useResumenDeCotizacion()
  const base = vistaDelResumen({ texto: resumen.texto, filas, delServidor, yaPedido: false })
  const pedido = usePedidoAlServidor(resumen.id, base.tipo === 'cargando')
  const vistaPedida = vistaDelResumen({
    texto: resumen.texto,
    filas,
    delServidor,
    yaPedido: pedido.yaPedido,
  })
  // Mientras el pedido está en camino (el primero o un «Reintentar») se espera: el esqueleto, no el error.
  const vista: VistaDelResumen =
    vistaPedida.tipo === 'error' && pedido.pendiente ? { tipo: 'cargando' } : vistaPedida
  const ultimo = useUltimo(vista.tipo === 'cotizacion' ? vista.cotizacion : null)
  const mostrada = vista.tipo === 'cotizacion' ? vista.cotizacion : ultimo
  const sinCotizacion = vista.tipo === 'no_disponible'
  return (
    <Drawer
      ancho="amplio"
      desplazamiento="propio"
      abierto={resumen.texto !== null}
      alCerrar={resumen.cerrar}
      titulo={tituloDelResumen(mostrada, sinCotizacion)}
      descripcion={
        sinCotizacion || mostrada === null
          ? undefined
          : nombreDelOrigen(origenes, mostrada.origenId)
      }
    >
      <ContenidoDelResumen
        vista={vista}
        ultimo={ultimo}
        reintentar={pedido.pedir}
        huecos={huecos ?? {}}
        quienes={quienes ?? {}}
        deEsteVehiculo={{ aprobarEn: aprobarEn ?? SIN_DONDE_APROBAR, alCambiarLaAprobada }}
        barra={{ menuDeFila, compartirDe, volverA }}
        vehiculosVisibles={vehiculosVisibles}
      />
      {dialogos}
    </Drawer>
  )
}
