import type { ReactNode } from 'react'
import { CLAVE_DE_LEAD } from '@/modules/cotizaciones'
import { RanuraDeLaCabecera } from '@/modules/cotizaciones/pantallas/cotizar'
import { barraDelClienteEnElLive, type EstadoDelLive } from '@/modules/equipo'
import { type ClienteElegido } from '@/modules/leads'
import { BarraDelCliente } from '@/modules/leads/pantallas/cotizar'
import type { OrigenResumen } from '@/modules/origenes'
import { elegidoDesde } from '@/modules/vehiculos'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { AvisoDeSubastaDeLaHoja } from '../aviso-de-subasta'
import type { VehiculoDeLaUrl } from '../vehiculo-de-la-hoja'
import { BarraConHistorial } from './barra-con-historial'
import type { leerLoDeLaHoja, paraElegirDe } from './lecturas-de-la-hoja'

// La barra del cliente de la hoja: lo que puede hacer quien mira con los leads, y si su rol no deja guardar sin cliente en este origen. Con el Modo Live, como dice su
// ajuste: apagada con los clientes ocultos; con «Sólo nombres», el panel busca por nombre (con el Live encendido, `leads.ver` no llega en `permisos`).
function BarraDelClienteDeLaHoja({
  cliente,
  permisos,
  live,
  obligatorio,
}: {
  cliente: ClienteElegido | null
  permisos: Permisos
  live: EstadoDelLive
  obligatorio: boolean
}) {
  const enElLive = barraDelClienteEnElLive(live)
  return (
    <BarraDelCliente
      elegido={cliente}
      enElLive={enElLive}
      puedeVer={puede(permisos, 'leads.ver') || enElLive === 'nombres'}
      numeroGlobal={puede(permisos, 'leads.numero_global.ver')}
      puedeCrear={puede(permisos, 'leads.crear')}
      claveDeLaUrl={CLAVE_DE_LEAD}
      obligatorio={obligatorio}
    />
  )
}

// La cabecera de la página de la hoja (`data-cabecera-de-la-hoja`): las dos barras, bajas, y la ranura de la cabecera (los modos, «Ver total en moneda local» y el ⚙ de la
// hoja, que llegan por un portal), en una sola fila desde 64 rem de ancho; más angosta, las barras lado a lado y la ranura debajo. El aviso de subasta cerrada, abajo. Fuera
// de la hoja (`[data-hoja]`) y del componente con `key`, así elegir otro vehículo o cliente no la vuelve a montar. Cada barra dice «Obligatorio» si el rol de quien mira no
// puede guardar sin ese vínculo en este origen. `reservaDeLaCabecera`: la cabecera quieta que la ranura muestra antes de hidratar.
export function BarrasDeLaHoja({
  sesion,
  origen,
  elegido,
  cliente,
  reglas,
  reservaDeLaCabecera,
}: {
  sesion: { permisos: Permisos; live: EstadoDelLive }
  origen: OrigenResumen
  elegido: VehiculoDeLaUrl
  cliente: ClienteElegido | null
  reglas: Pick<Awaited<ReturnType<typeof leerLoDeLaHoja>>, 'conteo' | 'alta'> & {
    obligatorios: { lead: boolean; vehiculo: boolean }
    paraElegir: ReturnType<typeof paraElegirDe>
    abierta: string
  }
  reservaDeLaCabecera: ReactNode
}) {
  const { obligatorios, conteo, alta, paraElegir, abierta } = reglas
  return (
    <>
      <div className="@container/cabecera min-w-0">
        <div
          data-cabecera-de-la-hoja=""
          className="grid min-w-0 grid-cols-2 items-center gap-2 @5xl/cabecera:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <div className="min-w-0">
            <BarraConHistorial
              origen={origen}
              elegido={elegido ? elegidoDesde(elegido.vehiculo) : null}
              conteo={conteo}
              alta={alta}
              puedeVer={puede(sesion.permisos, 'vehiculos.ver', origen.id)}
              paraElegir={paraElegir}
              abierta={abierta}
              obligatorio={obligatorios.vehiculo}
            />
          </div>
          <div className="min-w-0">
            <BarraDelClienteDeLaHoja
              cliente={cliente}
              permisos={sesion.permisos}
              live={sesion.live}
              obligatorio={obligatorios.lead}
            />
          </div>
          <div className="col-span-2 min-w-0 @5xl/cabecera:col-span-1">
            <RanuraDeLaCabecera reserva={reservaDeLaCabecera} />
          </div>
        </div>
      </div>
      <AvisoDeSubastaDeLaHoja elegido={elegido} origen={origen} permisos={sesion.permisos} />
    </>
  )
}
