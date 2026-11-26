'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { fechaRelativa } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { AbrirResumen, EsquinaDeAcciones, SufijoDeVisto, TarjetaDeLista } from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { ETIQUETA_DE_APROBADA, ETIQUETA_DE_CLASE } from '../../../entities/historial-del-vehiculo'
import { tituloDeLaCotizacion } from '../../../entities/titulo-de-la-cotizacion'
import { EnlaceAlVehiculo } from './enlace-al-vehiculo'
import { InsigniaPrivada } from '../../privada/components/insignia-privada'
import {
  PROPORCION_EN_LA_LISTA,
  SIN_NOMBRE,
  type FilaParaLaTarjeta,
  type OrigenDelListado,
  type ImagenDeLaFila,
} from './tipos'
import { Vigencia } from './vigencia'

type Props = {
  cotizacion: FilaParaLaTarjeta
  origen: OrigenDelListado | null
  abierta: boolean
  alAbrir: () => void
  // El «⋯» sin «Compartir» (ya es la acción principal), sobre la imagen.
  menu: ReactNode
  // «Compartir»: abre el panel de compartir; nulo sin la oferta o en Modo Live (no se dibuja).
  compartir: (() => void) | null
  Imagen?: ImagenDeLaFila | undefined
  // La ruta de las fichas de los clientes, si quien mira ve leads (el cliente va enlazado); si no, nulo.
  rutaDeClientes: string | null
  // La fila del conteo de un grupo («3 cotizaciones de este vehículo»): su lugar se reserva aunque esté vacía.
  conteo?: ReactNode
  // Las fichas del lead y del vehículo (`FilaDeTarjetas`): sin la línea del cliente (la ficha ya lo es o no lo necesita), con la casilla de «Comparar» sobre la imagen (arriba a la
  // izquierda) y «Aprobar esta» bajo «Compartir». En el listado ninguna de las tres.
  sinCliente?: boolean
  casilla?: ReactNode
  aprobar?: ReactNode
  // La ficha del vehículo de la cotización (`/vehiculos/<id>`), si tiene y quien mira lo ve: el título es su enlace (el clic en él no abre el resumen). Nulo, texto.
  rutaDelVehiculo?: string | null
}

// La insignia del origen: su nombre con el color de su fila (texto y color, nunca sólo color).
function InsigniaDelOrigen({ origen }: { origen: OrigenDelListado | null }) {
  if (origen === null) {
    return null
  }
  return (
    <span className="inline-flex h-5 min-w-0 shrink items-center gap-1.5 rounded-(--radius-pill) border border-(--color-line) bg-(--color-surface) px-2 text-(length:--text-xs) font-medium whitespace-nowrap text-(--color-ink)">
      {origen.color === null ? null : (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: origen.color }}
        />
      )}
      <span className="truncate">{origen.nombre}</span>
    </span>
  )
}

// Arriba: la imagen de la tarjeta (su clic abre el visor, no el resumen) con el «⋯» encima; sin el hueco, el marco vacío de la misma proporción.
function CabeceraDeLaTarjeta({
  cotizacion,
  menu,
  Imagen,
  casilla,
}: Pick<Props, 'cotizacion' | 'menu' | 'Imagen' | 'casilla'>) {
  return (
    <div className="relative w-full">
      {Imagen ? (
        <div data-no-abre="">
          <Imagen
            cotizacionId={cotizacion.id}
            numero={cotizacion.numero}
            total={{ valor: cotizacion.totalBase }}
            ancho={480}
            recorte="cubrir"
            lugar="lista"
          />
        </div>
      ) : (
        <div
          className="w-full rounded-(--radius-card) border border-(--color-line) bg-(--color-paper-dim)"
          style={{ aspectRatio: String(PROPORCION_EN_LA_LISTA) }}
        />
      )}
      {menu ? <EsquinaDeAcciones sobreImagen>{menu}</EsquinaDeAcciones> : null}
      {casilla ? (
        <div
          data-no-abre=""
          className="absolute top-1 left-1 rounded-(--radius-md) bg-(--color-surface)/90 shadow-sm"
        >
          {casilla}
        </div>
      ) : null}
    </div>
  )
}

// «N.º n» (el botón de la tarjeta, la parada de Tab) con sus insignias, en una sola línea: «Aprobada», «Final» y el origen.
function NumeroConInsignias({ cotizacion, origen }: Pick<Props, 'cotizacion' | 'origen'>) {
  const nombre = `N.º ${String(cotizacion.numero)}`
  return (
    <div className="flex min-h-6 min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden">
      <AbrirResumen
        nombre={nombre}
        className="shrink-0 font-medium text-(--color-ink) tabular-nums"
      >
        {nombre}
      </AbrirResumen>
      {/* Fuera del botón: su `aria-label` tapa a los hijos. */}
      <SufijoDeVisto id={cotizacion.id} />
      {cotizacion.aprobada ? <Badge variant="secondary">{ETIQUETA_DE_APROBADA}</Badge> : null}
      {cotizacion.privada ? <InsigniaPrivada /> : null}
      {cotizacion.clase === 'final' ? (
        <Badge variant="secondary">{ETIQUETA_DE_CLASE.final}</Badge>
      ) : null}
      <InsigniaDelOrigen origen={origen} />
    </div>
  )
}

// «Cliente:» enlazado a su ficha si quien mira ve leads y lo ve; si no, su nombre o «—».
function ClienteDeLaTarjeta({
  cotizacion,
  rutaDeClientes,
}: Pick<Props, 'cotizacion' | 'rutaDeClientes'>) {
  const enlazado =
    cotizacion.cliente !== null && rutaDeClientes !== null && cotizacion.leadId !== null
  return (
    <p className="truncate text-(length:--text-sm) text-(--color-ink-soft)">
      Cliente:{' '}
      {enlazado ? (
        <Link
          href={`${rutaDeClientes}/${cotizacion.leadId ?? ''}` as Route}
          className="text-(--color-ink) underline-offset-2 hover:underline"
        >
          {cotizacion.cliente}
        </Link>
      ) : (
        <span className="text-(--color-ink)">{cotizacion.cliente ?? SIN_NOMBRE}</span>
      )}
    </p>
  )
}

// Una tarjeta de la lista de cotizaciones (`docs/GLOSARIO.md` › «Tarjeta de la lista»): la imagen de la tarjeta arriba con el «⋯» encima y, debajo, el título, «N.º n» con sus
// insignias, el total con su modo, el cliente, el autor, la vigencia, la fila del conteo y «Compartir». Todas miden lo mismo sin `auto-rows-fr`: cada fila de la tarjeta tiene su alto fijo (el título dos líneas, cada dato una con «…», la del conteo reservada) y la
// tarjeta se estira a su celda. Un clic en cualquier parte abre el resumen, salvo la imagen, el cliente, el conteo, «Compartir» y el «⋯» (`esClicPropio`).
export function TarjetaEnLaLista(props: Props) {
  const { cotizacion, abierta, alAbrir, compartir, conteo } = props
  const { zonaHoraria } = useRegional()
  const titulo = tituloDeLaCotizacion(cotizacion)?.texto ?? `N.º ${String(cotizacion.numero)}`
  return (
    <TarjetaDeLista idDeVisto={cotizacion.id} abierta={abierta} alAbrir={alAbrir} estirada>
      <div className="flex min-w-0 flex-col gap-2">
        <CabeceraDeLaTarjeta {...props} />
        <h3
          data-titulo-de-la-cotizacion=""
          title={titulo}
          className="line-clamp-2 min-h-[2lh] text-(length:--text-base) font-medium [overflow-wrap:anywhere] text-(--color-ink)"
        >
          {props.rutaDelVehiculo ? (
            <EnlaceAlVehiculo ruta={props.rutaDelVehiculo} titulo={titulo}>
              {titulo}
            </EnlaceAlVehiculo>
          ) : (
            titulo
          )}
        </h3>
        <NumeroConInsignias {...props} />
        <p className="flex min-h-7 min-w-0 items-baseline gap-2">
          <span className="truncate text-(length:--text-lg) font-semibold text-(--color-ink) tabular-nums">
            <Monto valor={cotizacion.totalBase} />
          </span>
          {cotizacion.modo === null ? null : (
            <span className="truncate text-(length:--text-xs) text-(--color-ink-soft)">
              {cotizacion.modo}
            </span>
          )}
        </p>
        {props.sinCliente === true ? null : <ClienteDeLaTarjeta {...props} />}
        <p
          data-autor-de-la-cotizacion=""
          className="truncate text-(length:--text-xs) text-(--color-ink-soft)"
        >
          {cotizacion.autor} · {fechaRelativa(cotizacion.creadoEn, { zona: zonaHoraria })}
        </p>
        <div className="flex min-h-6 items-center">
          <Vigencia venceEl={cotizacion.venceEl} vencida={cotizacion.vencida} />
        </div>
        <div className="flex min-h-11 items-center">{conteo}</div>
        {compartir === null ? null : (
          <Button data-no-abre="" className="min-h-11 w-full md:min-h-9" onClick={compartir}>
            Compartir
          </Button>
        )}
        {props.aprobar ? <div data-no-abre="">{props.aprobar}</div> : null}
      </div>
    </TarjetaDeLista>
  )
}
