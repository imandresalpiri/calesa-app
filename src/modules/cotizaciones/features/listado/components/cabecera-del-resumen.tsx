'use client'

import type { ReactNode } from 'react'
import { fechaRelativa } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { ETIQUETA_DE_APROBADA, ETIQUETA_DE_CLASE } from '../../../entities/historial-del-vehiculo'
import { tituloDeLaCotizacion } from '../../../entities/titulo-de-la-cotizacion'
import { EnlaceAlVehiculo } from './enlace-al-vehiculo'
import { InsigniaPrivada } from '../../privada/components/insignia-privada'
import { SIN_NOMBRE, type FilaDeCotizacion } from './tipos'
import { Vigencia } from './vigencia'

type Props = {
  cotizacion: FilaDeCotizacion
  // La miniatura de la imagen de la tarjeta (el hueco `Imagen`), o nada sin ella.
  miniatura: ReactNode
  // La ficha del vehículo vinculado (`/vehiculos/<id>`), o nulo sin vehículo, sin permiso de verlo o en la ficha del propio vehículo: el título y el dato son texto.
  rutaDelVehiculo?: string | null
}

function Dato({ nombre, children }: { nombre: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap gap-x-1.5">
      <dt className="text-(--color-ink-soft)">{nombre}</dt>
      <dd className="min-w-0 [overflow-wrap:anywhere] text-(--color-ink)">{children}</dd>
    </div>
  )
}

// El título de la cotización (`tituloDeLaCotizacion()`): el suyo o el del vehículo; el de respaldo es el número, que ya dice el título del panel.
function TituloDelResumen({
  cotizacion,
  rutaDelVehiculo,
}: {
  cotizacion: FilaDeCotizacion
  rutaDelVehiculo: string | null
}) {
  const titulo = tituloDeLaCotizacion(cotizacion)
  return titulo === null || titulo.fuente === 'numero' ? null : (
    <p
      data-titulo-de-la-cotizacion=""
      className="text-(length:--text-base) leading-snug font-medium [overflow-wrap:anywhere] text-(--color-ink)"
    >
      {rutaDelVehiculo === null ? (
        titulo.texto
      ) : (
        <EnlaceAlVehiculo ruta={rutaDelVehiculo} titulo={titulo.texto}>
          {titulo.texto}
        </EnlaceAlVehiculo>
      )}
    </p>
  )
}

// La cabecera resumida del resumen (≤ 120 px de alto con el texto al 100 %): a la izquierda la miniatura de la imagen de la tarjeta (su clic abre el visor) y, a su derecha, el título
// (el número ya está en el del panel), la clase con «Aprobada» y «Vencida», el total con su modo, y cliente, vehículo, quién y cuándo la creó y su vigencia. Queda fija arriba: lo que
// se desplaza son las pestañas. Con el texto al 200 % crece, no se corta.
export function CabeceraDelResumen({ cotizacion, miniatura, rutaDelVehiculo = null }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <div data-cabecera-del-resumen="" className="flex min-w-0 items-start gap-3">
      {miniatura ? (
        <div data-miniatura-del-resumen="" className="w-24 shrink-0 sm:w-32">
          {miniatura}
        </div>
      ) : null}
      <div className="grid min-w-0 flex-1 gap-1 text-(length:--text-sm)">
        <TituloDelResumen cotizacion={cotizacion} rutaDelVehiculo={rutaDelVehiculo} />
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-(length:--text-base) font-semibold text-(--color-ink) tabular-nums">
            <Monto valor={cotizacion.totalBase} />
          </span>
          {cotizacion.modo === null ? null : (
            <span
              data-modo-del-total=""
              className="text-(length:--text-xs) text-(--color-ink-soft)"
            >
              {cotizacion.modo}
            </span>
          )}
          <Badge variant="secondary">{ETIQUETA_DE_CLASE[cotizacion.clase]}</Badge>
          {cotizacion.aprobada ? <Badge variant="secondary">{ETIQUETA_DE_APROBADA}</Badge> : null}
          {cotizacion.privada ? <InsigniaPrivada /> : null}
          {cotizacion.vencida ? (
            <Vigencia venceEl={cotizacion.venceEl} vencida={cotizacion.vencida} />
          ) : null}
        </div>
        <dl className="flex min-w-0 flex-wrap gap-x-3 gap-y-0.5">
          <Dato nombre="Cliente">{cotizacion.cliente ?? SIN_NOMBRE}</Dato>
          <Dato nombre="Vehículo">
            {rutaDelVehiculo === null || cotizacion.vehiculo === null ? (
              (cotizacion.vehiculo ?? SIN_NOMBRE)
            ) : (
              <EnlaceAlVehiculo ruta={rutaDelVehiculo}>{cotizacion.vehiculo}</EnlaceAlVehiculo>
            )}
          </Dato>
          <Dato nombre="Creada">
            {fechaRelativa(cotizacion.creadoEn, { zona: zonaHoraria })} · {cotizacion.autor}
            {cotizacion.vencida ? null : (
              <>
                {' · '}
                <Vigencia venceEl={cotizacion.venceEl} vencida={cotizacion.vencida} />
              </>
            )}
          </Dato>
        </dl>
      </div>
    </div>
  )
}
