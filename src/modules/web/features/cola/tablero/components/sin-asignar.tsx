'use client'

import { conteoEnFrase } from '@/shared/lib/conteo'
import { fechaRelativa, formatearFechaHora } from '@/shared/lib/fechas'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { TarjetaDeLista } from '@/shared/ui/lista'
import {
  conteoDeSinAsignar,
  firmaDePagina,
  type PaginaDeSolicitudes,
  type SolicitudSinAsignar,
} from '../../../../entities/cola/solicitudes'
import { useSinAsignar } from '../hooks/use-sin-asignar'
import { REJILLA_DE_TARJETAS } from './rejilla-de-tarjetas'
import { SeccionDeLaCola } from './seccion-de-la-cola'

type Props = { primera: PaginaDeSolicitudes }

// «Sin asignar», arriba de la rueda: las solicitudes de la web que no encontraron asesor (al visitante ya se lo mandó al WhatsApp de respaldo), la más nueva
// primero, una tarjeta de la lista por solicitud. El conteo es el de la primera página («más de 20»), nunca un total. La lista se reinicia cuando «Actualizar»
// trae otra primera página.
export function SinAsignar({ primera }: Props) {
  const conteo = conteoEnFrase(conteoDeSinAsignar(primera))
  return (
    <SeccionDeLaCola
      id="sin-asignar-titulo"
      titulo={
        <>
          Sin asignar
          <span className="font-normal text-(--color-ink-soft) tabular-nums"> · {conteo}</span>
        </>
      }
    >
      <ListaDeSinAsignar key={firmaDePagina(primera)} primera={primera} />
    </SeccionDeLaCola>
  )
}

function ListaDeSinAsignar({ primera }: Props) {
  const lista = useSinAsignar(primera)
  if (lista.solicitudes.length === 0) {
    return <EstadoVacio compacto titulo="Ninguna solicitud sin asignar." />
  }
  return (
    <div className="grid gap-3">
      <ul className={REJILLA_DE_TARJETAS}>
        {lista.solicitudes.map((solicitud) => (
          <TarjetaDeSinAsignar key={solicitud.id} solicitud={solicitud} />
        ))}
      </ul>
      {lista.error ? (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
            {lista.error.mensaje}
          </p>
          <Button variant="outline" className="min-h-11 md:min-h-9" onClick={lista.verMas}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {lista.enElTope && lista.hayMas ? (
        <AvisoDeTope texto={`Mostrando las ${String(TOPE_DE_LO_CARGADO)} más recientes.`} />
      ) : lista.hayMas && !lista.error ? (
        <Button
          variant="outline"
          className="min-h-11 w-fit md:min-h-9"
          disabled={lista.cargando}
          onClick={lista.verMas}
        >
          {lista.cargando ? 'Cargando…' : 'Ver más'}
        </Button>
      ) : null}
    </div>
  )
}

// La fuente y la ruta son texto que mandó la web del visitante: se dibujan tal cual, nunca como enlace. Hoy una solicitud sin asignar no tiene ninguna acción
// (la lista sólo informa): la tarjeta va sin «⋯» y sin clic, lista para recibirlos cuando exista una acción.
function TarjetaDeSinAsignar({ solicitud }: { solicitud: SolicitudSinAsignar }) {
  const vehiculo =
    solicitud.vehiculoTitulo ?? (solicitud.vehiculoId ? 'Ya no se ve en la web' : null)
  return (
    <TarjetaDeLista estirada>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="font-medium text-(--color-ink)">{solicitud.codigo}</span>
        <time
          dateTime={solicitud.creadoEn}
          title={formatearFechaHora(solicitud.creadoEn)}
          className="text-(length:--text-sm) text-(--color-ink-soft)"
        >
          {fechaRelativa(solicitud.creadoEn)}
        </time>
      </div>
      <p className="min-w-0 text-(length:--text-sm) break-words text-(--color-ink-soft)">
        {solicitud.fuente}
        {vehiculo ? ` · ${vehiculo}` : ''}
      </p>
      {solicitud.ruta ? (
        <p className="min-w-0 text-(length:--text-sm) break-all text-(--color-ink-faint)">
          {solicitud.ruta}
        </p>
      ) : null}
    </TarjetaDeLista>
  )
}
