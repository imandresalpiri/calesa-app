'use client'

import type { ReactNode } from 'react'
import { fechaRelativa } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { AbrirResumen, CeldaPegada, FilaDeLista, SufijoDeVisto } from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { TableCell } from '@/shared/ui/table'
import { ETIQUETA_DE_APROBADA, ETIQUETA_DE_CLASE } from '../../../entities/historial-del-vehiculo'
import { tituloDeLaCotizacion } from '../../../entities/titulo-de-la-cotizacion'
import { EnlaceAlVehiculo } from './enlace-al-vehiculo'
import { InsigniaPrivada } from '../../privada/components/insignia-privada'
import { nombreDelOrigen, SIN_NOMBRE, type FilaDeCotizacion, type OrigenDelListado } from './tipos'
import { Vigencia } from './vigencia'

const VACIO = <span className="text-(--color-ink-faint)">{SIN_NOMBRE}</span>
// «N.º n» (el botón de la fila, la parada de Tab), pegado a la izquierda.
function CeldaDelNumero({ cotizacion }: { cotizacion: FilaDeCotizacion }) {
  return (
    <CeldaPegada lado="nombre">
      <span className="flex items-center">
        <AbrirResumen
          nombre={`N.º ${String(cotizacion.numero)}`}
          className="w-fit font-medium text-(--color-ink) tabular-nums"
        >
          N.º {cotizacion.numero}
        </AbrirResumen>
        {/* Fuera del botón: su `aria-label` tapa a los hijos. */}
        <SufijoDeVisto id={cotizacion.id} />
      </span>
    </CeldaPegada>
  )
}

// El título (`tituloDeLaCotizacion()`: el suyo o el del vehículo; el de respaldo es el número, que ya está en su columna), en dos líneas como mucho y entero en `title`.
function CeldaDelTitulo({
  cotizacion,
  rutaDelVehiculo,
}: {
  cotizacion: FilaDeCotizacion
  rutaDelVehiculo: string | null
}) {
  const titulo = tituloDeLaCotizacion(cotizacion)
  return (
    <TableCell>
      {titulo === null || titulo.fuente === 'numero' ? (
        VACIO
      ) : (
        <span
          data-titulo-de-la-cotizacion=""
          title={titulo.texto}
          className="line-clamp-2 max-w-60 text-(length:--text-sm) break-words whitespace-normal text-(--color-ink)"
        >
          {rutaDelVehiculo === null ? (
            titulo.texto
          ) : (
            <EnlaceAlVehiculo ruta={rutaDelVehiculo} titulo={titulo.texto}>
              {titulo.texto}
            </EnlaceAlVehiculo>
          )}
        </span>
      )}
    </TableCell>
  )
}

type PropsDeLaFila = {
  cotizacion: FilaDeCotizacion
  origenes: readonly OrigenDelListado[]
  // La ficha del vehículo, si tiene y quien mira lo ve: la celda «Vehículo» y el título la enlazan. Nulo, texto.
  rutaDelVehiculo: string | null
  abierta: boolean
  alAbrir: () => void
  // El botón del conteo de un grupo, debajo del vehículo.
  conteo: ReactNode
  // El «⋯»; `undefined` = la tabla no tiene esa columna.
  menu: ReactNode | undefined
}

// La fila de una cotización (o de la cabeza de un grupo): «N.º n», título, cliente, vehículo (con el conteo del grupo), origen, clase, total, vigencia, creada y el «⋯».
export function FilaDeLaCotizacion({
  cotizacion,
  origenes,
  rutaDelVehiculo,
  abierta,
  alAbrir,
  conteo,
  menu,
}: PropsDeLaFila) {
  const { zonaHoraria } = useRegional()
  return (
    <FilaDeLista idDeVisto={cotizacion.id} abierta={abierta} alAbrir={alAbrir}>
      <CeldaDelNumero cotizacion={cotizacion} />
      <CeldaDelTitulo cotizacion={cotizacion} rutaDelVehiculo={rutaDelVehiculo} />
      <TableCell className="max-w-48 truncate">{cotizacion.cliente ?? VACIO}</TableCell>
      <TableCell className="max-w-56">
        <span className="block truncate">
          {rutaDelVehiculo === null || cotizacion.vehiculo === null ? (
            (cotizacion.vehiculo ?? VACIO)
          ) : (
            <EnlaceAlVehiculo ruta={rutaDelVehiculo}>{cotizacion.vehiculo}</EnlaceAlVehiculo>
          )}
        </span>
        {conteo}
      </TableCell>
      <TableCell className="max-w-40 truncate">
        {nombreDelOrigen(origenes, cotizacion.origenId)}
      </TableCell>
      <TableCell>
        <span className="flex flex-wrap gap-1">
          <Badge variant="secondary">{ETIQUETA_DE_CLASE[cotizacion.clase]}</Badge>
          {cotizacion.aprobada ? <Badge variant="secondary">{ETIQUETA_DE_APROBADA}</Badge> : null}
          {cotizacion.privada ? <InsigniaPrivada /> : null}
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <Monto valor={cotizacion.totalBase} />
      </TableCell>
      <TableCell>
        <Vigencia venceEl={cotizacion.venceEl} vencida={cotizacion.vencida} />
      </TableCell>
      <TableCell className="text-(length:--text-sm) text-(--color-ink-soft)">
        {fechaRelativa(cotizacion.creadoEn, { zona: zonaHoraria })} · {cotizacion.autor}
      </TableCell>
      {menu === undefined ? null : (
        <CeldaPegada lado="acciones" className="text-right">
          {menu}
        </CeldaPegada>
      )}
    </FilaDeLista>
  )
}
