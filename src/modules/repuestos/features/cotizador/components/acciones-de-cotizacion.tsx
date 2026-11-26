'use client'

import { Button } from '@/shared/ui/button'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { MOTIVO_SIN_CONEXION } from '../../../entities/cotizador/acciones-de-la-tarjeta'
import { useAceptarPorUrl, useAnularPorUrl } from '../hooks/use-confirmacion-de-cotizacion-por-url'
import type { CotizacionParaConfirmar } from '../hooks/use-pedidos-de-cotizacion'
import { ConfirmacionesDeCotizacion } from './confirmaciones-de-cotizacion'

type Props = {
  cotizacion: CotizacionParaConfirmar
  proyectoId: string
  // `undefined`: sin «Aceptar» (la hoja de lectura). `null`: se puede. Un texto: apagado con ese motivo (D47).
  motivoParaNoAceptar?: string | null
  sinGuardar?: boolean
}

// «Aceptar» y «Anular» de una cotización de repuestos (8.12-4, C13), cada uno con su confirmación en la URL. Tras la acción la página se relee (la
// action revalida la ruta): una aceptada o anulada se ve en sólo lectura. El motivo de «Aceptar» apagado tiene su línea reservada bajo los botones (aparece y
// desaparece al guardar sin mover nada).
export function AccionesDeCotizacion({
  cotizacion,
  proyectoId,
  motivoParaNoAceptar,
  sinGuardar = false,
}: Props) {
  const aceptar = useAceptarPorUrl(motivoParaNoAceptar ?? null)
  const anular = useAnularPorUrl()
  const enLinea = useEnLinea()
  const conAceptar = motivoParaNoAceptar !== undefined
  // Un motivo de fondo (permiso, sin guardar, sin total) manda sobre el de la red.
  const motivo = motivoParaNoAceptar ?? (enLinea ? null : MOTIVO_SIN_CONEXION)
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {conAceptar ? (
          <Button
            type="button"
            className="h-11 md:h-8"
            disabled={motivo !== null}
            aria-describedby={motivo ? 'motivo-de-aceptar' : undefined}
            onClick={() => {
              aceptar.abrir()
            }}
          >
            Aceptar
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-8"
          disabled={!enLinea}
          title={enLinea ? undefined : MOTIVO_SIN_CONEXION}
          onClick={() => {
            anular.abrir()
          }}
        >
          Anular
        </Button>
      </div>
      {conAceptar ? (
        <p
          id="motivo-de-aceptar"
          className="min-h-10 max-w-72 text-(length:--text-sm) text-(--color-ink-soft) md:min-h-5 md:max-w-none md:text-right"
        >
          {motivo}
        </p>
      ) : null}
      <ConfirmacionesDeCotizacion
        proyectoId={proyectoId}
        cotizacion={cotizacion}
        aceptar={aceptar}
        anular={anular}
        sinGuardar={sinGuardar}
      />
    </>
  )
}
