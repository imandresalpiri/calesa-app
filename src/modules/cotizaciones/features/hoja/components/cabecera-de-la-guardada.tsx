'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useContext, type ReactNode } from 'react'
import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import type { CadenaDeLaCotizacion } from '../../../entities/hoja-de-una-guardada'
import { ETIQUETA_DE_CLASE } from '../../../entities/historial-del-vehiculo'
import { rutaDeLaCotizacion } from '../../../entities/ruta-de-la-hoja'
import { InsigniaPrivada } from '../../privada/components/insignia-privada'
import { RevisionesDeLaCotizacion } from '../../revisiones/components/revisiones-de-la-cotizacion'
import { TEXTO_DE_SOLO_LECTURA } from './cierre-de-la-hoja'
import { ContextoDeLaVistaPrevia } from './hueco-de-la-vista-previa'
import { ContextoDeLaRanura } from './menu-de-la-guardada/contexto'
import { MenuDeLaGuardada } from './menu-de-la-guardada/menu-de-la-guardada'
import { RanuraDeLaCabecera } from './ranura-de-la-cabecera'

type Props = {
  id: string
  numero: number
  clase: keyof typeof ETIQUETA_DE_CLASE
  // Su `actualizadoEn` (el texto de la base): las revisiones leídas son de una versión de la fila.
  actualizadoEn: string
  // Su versión en la cadena (1, 2…) y lo que quien mira ve de ella: la anterior y la versión nueva (P4, P11).
  version: number
  cadena: CadenaDeLaCotizacion
  // El último día en que vale, `YYYY-MM-DD` de la zona de la empresa, y si ya pasó.
  venceEl: string
  vencida: boolean
  origen: string
  // Lo que quien mira ve del cliente y del vehículo: el que no se ve no se nombra.
  cliente: string | null
  vehiculo: string | null
  // La barra del vehículo con el título de la cotización (T307), ya armada por la página (`vehiculos` y `cotizaciones` no se conocen): reemplaza «Vehículo: X».
  barra?: ReactNode
  // Si quien mira la puede guardar (`puede_guardar` de la base): así va el lugar de «Guardar»; si no, que es de sólo lectura (P13).
  guardable: boolean
  // La cabecera quieta (`CabeceraQuieta`) que la ranura de la cabecera, junto a la barra, muestra antes de hidratar.
  reservaDeLaCabecera?: ReactNode
  // Lo que las áreas suman al «⋯» (4.15-6b): sus líneas y sus diálogos, ya dibujados por la página; no dibujan nada a la vista.
  acciones?: ReactNode
  // Lo que un área suma después de la clase y de la vigencia (4.27-4): sus insignias, ya dibujadas por la página.
  insignias?: ReactNode
  // Si es privada (glosario: «Cotización privada»): su insignia va tras la vigencia, antes de las de las áreas.
  privada?: boolean
}

// La cabecera de una cotización guardada: «Cotización n.º N», su clase, hasta cuándo vale (o «Vencida»), las insignias de las áreas («Aprobar» o «Aprobada», «Reportada»…),
// lo principal a la vista («Guardar», que la hoja dibuja aquí por un portal, o «Sólo lectura» para quien no la puede guardar, y «Compartir», del hueco de la vista previa) y lo
// demás en el «⋯» (`docs/UX.md` › «Cotización guardada»); debajo, la cadena de versiones, de qué origen y cliente es y, en una fila, la barra (su título y su vehículo) y la
// ranura de la cabecera (glosario: «Ranura de la cabecera»: los modos, «Ver total en moneda local» y el ⚙ de la hoja). En el celular el «⋯» queda en la fila del título y «Guardar» y
// «Compartir» van debajo, mitad y mitad; desde `md`, todo en una fila con el «⋯» al final. El número es un identificador: va sin separador de miles. La fecha se muestra en la
// zona de la empresa.
export function CabeceraDeLaGuardada({
  id,
  numero,
  clase,
  actualizadoEn,
  version,
  cadena,
  venceEl,
  vencida,
  origen,
  cliente,
  vehiculo,
  barra,
  guardable,
  reservaDeLaCabecera = null,
  acciones,
  insignias,
  privada = false,
}: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <header data-cabecera-de-la-guardada="" className="grid min-w-0 gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="min-w-0 text-(length:--text-xl) font-semibold [overflow-wrap:anywhere] text-(--color-ink)">
          Cotización n.º {String(numero)}
        </h1>
        <Badge variant="secondary">{ETIQUETA_DE_CLASE[clase]}</Badge>
        {vencida ? (
          <Badge variant="destructive">Vencida</Badge>
        ) : (
          <span className="text-(length:--text-sm) text-(--color-ink-soft)">
            Vale hasta el {formatearFecha(venceEl, { zona: zonaHoraria })}
          </span>
        )}
        {privada ? <InsigniaPrivada /> : null}
        {insignias}
        <div className="ml-auto md:order-last md:ml-0">
          <MenuDeLaGuardada cotizacionId={id} numero={numero} />
        </div>
        <AccionesDeLaCabecera guardable={guardable} />
      </div>
      <RevisionesDeLaCotizacion cotizacionId={id} numero={numero} version={actualizadoEn} />
      {acciones}
      <CadenaDeVersiones version={version} cadena={cadena} />
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
        <span>{origen}</span>
        {cliente === null ? null : <span>Cliente: {cliente}</span>}
        {vehiculo === null || barra !== undefined ? null : <span>Vehículo: {vehiculo}</span>}
      </p>
      <div className="@container/cabecera min-w-0">
        <div
          data-cabecera-de-la-hoja=""
          className="grid min-w-0 items-center gap-2 @3xl/cabecera:grid-cols-[minmax(0,1fr)_auto]"
        >
          {barra === undefined ? null : <div className="min-w-0">{barra}</div>}
          <RanuraDeLaCabecera reserva={reservaDeLaCabecera} />
        </div>
      </div>
    </header>
  )
}

// Lo principal a la vista: el lugar de «Guardar» (lo llena la hoja por un portal) o, para quien no la puede guardar, «Sólo lectura» (P13); y «Compartir».
function AccionesDeLaCabecera({ guardable }: { guardable: boolean }) {
  const compartir = useContext(ContextoDeLaVistaPrevia)?.compartir?.()
  const ponerRanura = useContext(ContextoDeLaRanura)
  return (
    <div
      data-acciones-de-la-cabecera=""
      className="grid w-full auto-cols-fr grid-flow-col items-start gap-2 empty:hidden md:ml-auto md:flex md:w-auto"
    >
      {guardable && ponerRanura !== null ? (
        <div ref={ponerRanura} className="grid min-h-11 md:min-h-8" />
      ) : null}
      {guardable ? null : (
        <p className="self-center text-(length:--text-sm) text-(--color-ink-soft)">
          {TEXTO_DE_SOLO_LECTURA}
        </p>
      )}
      {compartir}
    </div>
  )
}

const ENLACE = 'underline-offset-2 hover:underline'

// Dónde está esta cotización en su cadena (cotizar encima): de cuál viene y si ya tiene una versión nueva. Quien no ve la anterior ve «Versión N» sin enlace; quien no ve la nueva,
// que existe. Sin anterior, en la versión 1 y sin nueva, no hay nada que decir.
function CadenaDeVersiones({ version, cadena }: { version: number; cadena: CadenaDeLaCotizacion }) {
  const { anterior, encima } = cadena
  if (anterior === null && version === 1 && encima === null) {
    return null
  }
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
      {anterior === null ? (
        version > 1 ? (
          <span>Versión {version}</span>
        ) : null
      ) : (
        <Link href={rutaDeLaCotizacion(anterior.id) as Route} className={ENLACE}>
          Versión {version} de la n.º {anterior.numero}
        </Link>
      )}
      {encima === null ? null : 'oculta' in encima ? (
        <span>Hay una versión nueva que no puedes ver.</span>
      ) : (
        <span>
          Hay una versión nueva:{' '}
          <Link href={rutaDeLaCotizacion(encima.id) as Route} className={ENLACE}>
            n.º {encima.numero} (versión {encima.version})
          </Link>
          .
        </span>
      )}
    </p>
  )
}
