'use client'

import { useRef } from 'react'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { NumeroDeLead } from '@/shared/ui/numero-de-lead'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { ClienteElegido } from '../../../entities/panel-para-cotizar'
import { CLAVE_DE_BUSQUEDA, CLAVE_DE_CLASE, PANEL_DEL_CLIENTE } from '../claves'
import { PanelDelClienteDiferido } from './diferidos'

type Props = {
  // El de la hoja; null = la hoja no tiene lead (o la página lo soltó porque no existe o no se ve).
  elegido: ClienteElegido | null
  // `leads.ver` (lo decide la página con `puede()`); lo que protege es la base.
  puedeVer: boolean
  // `leads.numero_global.ver`: con él «#n» busca el número global y el propio de cualquier creador.
  numeroGlobal: boolean
  // `leads.crear` (lo decide la página con `puede()`): el panel ofrece «+», que abre «Nuevo lead».
  puedeCrear: boolean
  // La clave de la URL donde la hoja lleva su lead: este módulo no la conoce.
  claveDeLaUrl: string
  // El rol no puede guardar sin lead en este origen (`cotizaciones.crear.sin_lead`): sin cliente elegido, la barra dice «Obligatorio».
  obligatorio?: boolean
  // El Modo Live de quien mira (lo decide la página): `'apagado'` oculta los clientes (la barra no abre nada); `'nombres'`, el panel sólo con nombres; null, como siempre.
  enElLive?: 'apagado' | 'nombres' | null
}

const CAJA =
  'flex min-h-[44px] w-full min-w-0 items-center gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) px-2 py-1 text-left md:pointer-fine:min-h-9'

// Con el Modo Live que oculta los clientes: la misma caja y el mismo alto, sin abrir nada (el cliente se elige al salir del Live).
function BarraApagadaPorElLive() {
  return (
    <div className="min-w-0">
      <div role="group" aria-disabled="true" className={CAJA}>
        <span className="sr-only">Cliente: </span>
        <span className="min-w-0 flex-1 truncate text-(--color-ink-soft)">
          Se elige al salir del Modo Live
        </span>
      </div>
    </div>
  )
}

// La barra del cliente sobre la hoja de cotizar, baja como la del vehículo (44 px en el celular, 36 con puntero fino desde `md`): una sola parada de Tab que abre el panel del cliente (`?panel=cliente`). Va fuera de la hoja (`[data-hoja]`) y del
// componente que se vuelve a montar al cambiar de lead: elegir otro no la desmonta y el foco vuelve a ella. Sin `<Badge>` (arrastra Base UI a la carga en frío de la hoja).
export function BarraDelCliente({
  elegido,
  puedeVer,
  numeroGlobal,
  puedeCrear,
  claveDeLaUrl,
  obligatorio = false,
  enElLive = null,
}: Props) {
  const panel = usePanelPorUrl(PANEL_DEL_CLIENTE, [
    CLAVE_DE_CLASE,
    CLAVE_DE_BUSQUEDA,
    CLAVE_DE_CURSOR,
  ])
  const montado = useAbiertoAlgunaVez(panel.abierto)
  const boton = useRef<HTMLButtonElement>(null)
  if (enElLive === 'apagado') {
    return <BarraApagadaPorElLive />
  }
  if (!puedeVer) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">No puedes ver los leads.</p>
    )
  }
  return (
    <div className="min-w-0">
      <button
        ref={boton}
        type="button"
        aria-haspopup="dialog"
        // A este botón vuelve el foco al cerrar «Nuevo lead» abierto desde el «+» del panel (`marco-del-alta.tsx`): quien lo abrió ya no existe.
        data-elige={claveDeLaUrl}
        onClick={() => {
          panel.abrir()
        }}
        className={`${CAJA} hover:bg-(--color-surface-3)`}
      >
        <span className="sr-only">Cliente: </span>
        {elegido ? (
          <>
            <span className="min-w-0 flex-1 truncate font-medium text-(--color-ink)">
              {elegido.nombre}
            </span>
            <NumeroDeLead
              numeros={elegido.numeros}
              className="shrink-0 text-(length:--text-xs) text-(--color-ink-soft) tabular-nums"
            />
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-(--color-ink-soft)">
              Selecciona un cliente
            </span>
            {/* Una etiqueta propia y no `<Badge>` (Base UI a la carga en frío de la hoja); en su propio `<span>`: «Selecciona un cliente» no se parte. */}
            {obligatorio ? (
              <span className="inline-flex h-5 shrink-0 items-center rounded-4xl bg-(--color-peligro-soft) px-2 text-xs font-medium whitespace-nowrap text-(--color-peligro-ink)">
                Obligatorio
              </span>
            ) : null}
          </>
        )}
      </button>
      {montado ? (
        <PanelDelClienteDiferido
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          elegido={elegido}
          claveDeLaUrl={claveDeLaUrl}
          numeroGlobal={numeroGlobal}
          puedeCrear={puedeCrear}
          focoAlCerrar={boton}
          soloNombres={enElLive === 'nombres'}
        />
      ) : null}
    </div>
  )
}
