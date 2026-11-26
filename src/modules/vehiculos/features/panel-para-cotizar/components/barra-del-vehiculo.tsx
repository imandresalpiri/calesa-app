'use client'

import { useRef, type ReactNode } from 'react'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { ParaElegirConLector } from '../../../entities/dato-para-elegir'
import type { VehiculoElegido } from '../../../entities/panel-para-cotizar'
import type { AltaDelPanel } from '../alta-del-panel'
import { CLAVE_DE_ALTA, CLAVE_DE_BUSQUEDA, CLAVE_DE_LISTA, PANEL_DEL_VEHICULO } from '../claves'
import { ContenidoDeLaBarra, SIN_VER } from './contenido-de-la-barra'
import { PanelDelVehiculoDiferido } from './diferidos'

// Qué deja hacer la barra: `elegir` (la hoja nueva: buscar, elegir, quitar), `cambiar` (lo mismo sin «Quitar»: una preventa guardada, que no se queda sin vehículo),
// `ver_elegido` (el panel abre con lo de arriba y el elegido en sólo lectura: una final que se puede guardar) o `solo_mostrar` (la barra no es un botón y no hay panel:
// quien sólo ve una guardada).
export type ModoDeLaBarra = 'elegir' | 'cambiar' | 'ver_elegido' | 'solo_mostrar'

type Props = {
  origenId: string
  // «Cierre subasta» sólo en un origen de subasta.
  esSubasta: boolean
  // El de la hoja; null = la hoja no tiene vehículo (o lo soltó: la hoja dice por qué).
  elegido: VehiculoElegido | null
  // Para dar de alta desde el panel (4.14-2c1): lo arma la página sólo si quien mira puede crear vehículos en el origen; null = el panel sólo busca y elige.
  alta: AltaDelPanel | null
  // `vehiculos.ver` del origen (lo decide la página con `puede()`); lo que protege es la base.
  puedeVer: boolean
  // La clave de la URL donde la hoja lleva su vehículo: este módulo no la conoce.
  claveDeLaUrl: string
  // El «n» de «Cotizado (n)» («2», «20+»): cuántas cotizaciones del elegido ve quien mira, leído y escrito por la página al abrir la hoja (4.14-2b); null = no hay insignia.
  // Va como texto y no como `ConteoAcotado`: esta barra va en la carga en frío de la hoja y no importa `conteoCorto`. Sólo la insignia: no se mueve al guardar.
  cotizado: string | null
  // El historial del elegido, armado por la página (`src/app`): `vehiculos` no conoce `cotizaciones`. Va dentro del panel, en la región «Elegido».
  historial: ReactNode
  // El dato del elegido que se elige entre las filas de una tabla de la hoja (4.14-2c3), con su lector: lo arma `src/app` (`vehiculos` no conoce `cotizaciones`). null = ninguno.
  paraElegir?: ParaElegirConLector | null
  // El rol no puede guardar sin vehículo en este origen (`cotizaciones.crear.sin_vehiculo`): sin vehículo elegido, la barra dice «Obligatorio».
  obligatorio?: boolean
  // El título de lo que se cotiza, ya resuelto por `src/app` (el de la cotización, T307): la barra lo dibuja grande y el vehículo debajo; null = todavía no hay.
  // Sin la prop, la barra nombra sólo el vehículo.
  titulo?: string | null
  // Lo que va arriba del panel, antes del buscador (el campo del título, que llena `src/app`). Con él, quien no ve los vehículos del origen abre igual el panel, sólo con esto.
  arribaDelPanel?: ReactNode
  modo?: ModoDeLaBarra
  // Lo que dice sin vehículo elegido: «Selecciona un vehículo» al elegir; en una guardada, «Sin vehículo», o nada si tiene uno que quien mira no ve.
  textoSinVehiculo?: string | null
  // Por qué el panel de `ver_elegido` no deja elegir otro (lo escribe `src/app`: «Una cotización final no cambia de vehículo.»); va bajo lo de arriba. null = nada.
  motivoSinCambiar?: string | null
  // Un aviso sobre el vehículo pedido, bajo la barra, con «Elegir otro vehículo» que abre el panel (lo escribe `src/app`: «No se puede usar ese vehículo.»). null = nada.
  avisoDelElegido?: string | null
}

// Baja: 44 px en el celular y 36 con puntero fino desde `md` (la cabecera de la hoja cabe en una línea con ella).
const CLASE_DE_LA_BARRA =
  'flex min-h-[44px] w-full min-w-0 items-center gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) px-2 py-1 text-left md:pointer-fine:min-h-9'

// Lo opcional, con su valor por omisión.
function opcionesDe(props: Props) {
  return {
    paraElegir: props.paraElegir ?? null,
    modo: props.modo ?? 'elegir',
    arriba: props.arribaDelPanel ?? null,
    motivo: props.motivoSinCambiar ?? null,
    aviso: props.avisoDelElegido ?? null,
  }
}

// El aviso de bajo la barra y su salida: abrir el panel para elegir otro. En el celular el botón va a lo ancho, a 44 px.
function AvisoDelElegido({ texto, alElegir }: { texto: string; alElegir: () => void }) {
  return (
    <div className="mt-2 grid min-w-0 gap-2 md:flex md:items-center md:gap-3">
      <p
        role="alert"
        className="min-w-0 text-(length:--text-sm) font-medium text-(--color-peligro-ink)"
      >
        {texto}
      </p>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full md:h-9 md:w-auto"
        onClick={alElegir}
      >
        Elegir otro vehículo
      </Button>
    </div>
  )
}

// La barra del vehículo sobre la hoja de cotizar: una sola parada de Tab que abre el panel del vehículo (`?panel=vehiculo`). Va fuera de
// la hoja (`[data-hoja]`) y del componente que se vuelve a montar al cambiar de vehículo: elegir otro no la desmonta y el foco vuelve a ella.
export function BarraDelVehiculo(props: Props) {
  const { origenId, esSubasta, elegido, alta, puedeVer, claveDeLaUrl, cotizado, historial } = props
  const { paraElegir, modo, arriba, motivo, aviso } = opcionesDe(props)
  const panel = usePanelPorUrl(PANEL_DEL_VEHICULO, [
    CLAVE_DE_LISTA,
    CLAVE_DE_BUSQUEDA,
    CLAVE_DE_ALTA,
    CLAVE_DE_CURSOR,
  ])
  const montado = useAbiertoAlgunaVez(panel.abierto)
  const boton = useRef<HTMLButtonElement>(null)
  const contenido = (
    <ContenidoDeLaBarra
      elegido={puedeVer ? elegido : null}
      puedeVer={puedeVer}
      cotizado={cotizado}
      obligatorio={props.obligatorio ?? false}
      titulo={props.titulo}
      textoSinVehiculo={props.textoSinVehiculo}
    />
  )
  // Sin ver los vehículos del origen y sin nada que escribir arriba, no hay panel que abrir.
  if (!puedeVer && arriba === null && modo !== 'solo_mostrar') {
    return <p className="text-(length:--text-sm) text-(--color-ink-soft)">{SIN_VER}</p>
  }
  if (modo === 'solo_mostrar') {
    return (
      <div data-barra-del-vehiculo="" className={`${CLASE_DE_LA_BARRA} min-w-0`}>
        {contenido}
      </div>
    )
  }
  return (
    <div className="min-w-0">
      <button
        ref={boton}
        type="button"
        data-barra-del-vehiculo=""
        aria-haspopup="dialog"
        onClick={() => {
          panel.abrir()
        }}
        className={`${CLASE_DE_LA_BARRA} hover:bg-(--color-surface-3)`}
      >
        {contenido}
      </button>
      {aviso === null ? null : <AvisoDelElegido texto={aviso} alElegir={panel.abrir} />}
      {montado ? (
        <PanelDelVehiculoDiferido
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          origenId={origenId}
          esSubasta={esSubasta}
          elegido={puedeVer ? elegido : null}
          alta={alta}
          claveDeLaUrl={claveDeLaUrl}
          historial={historial}
          paraElegir={paraElegir}
          focoAlCerrar={boton}
          arriba={arriba}
          // Sin ver los vehículos, o en una final: sólo lo de arriba y el elegido, sin buscar ni elegir.
          soloElegido={!puedeVer || modo === 'ver_elegido'}
          sinQuitar={modo === 'cambiar'}
          motivo={motivo}
        />
      ) : null}
    </div>
  )
}
