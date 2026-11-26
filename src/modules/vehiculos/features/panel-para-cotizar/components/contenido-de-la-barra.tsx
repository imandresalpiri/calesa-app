import type { ReactNode } from 'react'
import { referenciaDelVehiculo, type VehiculoElegido } from '../../../entities/panel-para-cotizar'
import { Miniatura } from '../../listado/components/miniatura'

export const SIN_VER = 'No puedes ver los vehículos de este origen.'

// Una etiqueta propia y no `<Badge>`: éste arrastra Base UI a la carga en frío de la hoja (≈ 9 KB, medido en el 4.14-2b).
const ETIQUETA =
  'inline-flex h-5 shrink-0 items-center rounded-4xl px-2 text-xs font-medium whitespace-nowrap'

// La barra es baja (una línea): el título se corta con «…» y queda completo en `title` y en el panel; lo de debajo va en la misma línea, tras él, y se corta
// primero. Al 200 % y en el celular no desborda: la barra crece de alto, nunca de ancho.
const GRANDE = 'min-w-0 shrink truncate font-medium text-(--color-ink)'
const DEBAJO = 'min-w-0 truncate text-(length:--text-xs) text-(--color-ink-soft)'
const LINEA = 'flex min-w-0 flex-1 items-baseline gap-2'

type Props = {
  elegido: VehiculoElegido | null
  puedeVer: boolean
  cotizado: string | null
  obligatorio: boolean
  // `undefined`: la barra sólo nombra el vehículo; null: todavía no hay título.
  titulo: string | null | undefined
  // `undefined`: «Selecciona un vehículo».
  textoSinVehiculo: string | null | undefined
}

function ConElegido({
  elegido,
  titulo,
  cotizado,
}: {
  elegido: VehiculoElegido
  titulo: string | null
  cotizado: string | null
}) {
  // Debajo del título, el vehículo: su título si no es el mismo, y su referencia.
  const debajo = [titulo === elegido.titulo ? null : elegido.titulo, referenciaDelVehiculo(elegido)]
    .filter((t) => t !== null)
    .join(' · ')
  return (
    <>
      <span className={LINEA}>
        {titulo === null ? (
          <>
            <span className={GRANDE} title={elegido.titulo}>
              {elegido.titulo}
            </span>
            <span className={`${DEBAJO} tabular-nums`}>{referenciaDelVehiculo(elegido)}</span>
          </>
        ) : (
          <>
            <span className={GRANDE} title={titulo}>
              {titulo}
            </span>
            <span className={`${DEBAJO} tabular-nums`}>{debajo}</span>
          </>
        )}
      </span>
      {cotizado === null ? null : (
        <span className={`${ETIQUETA} bg-(--color-surface-3) text-(--color-ink)`}>
          Cotizado ({cotizado})
        </span>
      )}
    </>
  )
}

function SinElegido({
  titulo,
  texto,
  etiqueta,
}: {
  titulo: string | null
  texto: string | null
  etiqueta: ReactNode
}) {
  return (
    <>
      {titulo === null ? (
        <span className="min-w-0 flex-1 truncate text-(--color-ink-soft)">{texto}</span>
      ) : (
        <span className={LINEA}>
          <span className={GRANDE} title={titulo}>
            {titulo}
          </span>
          {texto === null ? null : <span className={DEBAJO}>{texto}</span>}
        </span>
      )}
      {etiqueta}
    </>
  )
}

// Lo que dice la barra del vehículo (botón o no), en una línea: con título, el título y tras él el vehículo; sin vehículo, el título con «Selecciona un vehículo»
// tras él; sin ninguno de los dos, «Selecciona un vehículo» como siempre.
export function ContenidoDeLaBarra(props: Props) {
  const { elegido, puedeVer, cotizado, obligatorio, titulo, textoSinVehiculo } = props
  const conTitulo = titulo ?? null
  return (
    <>
      <Miniatura ruta={elegido?.portadaRuta} className="w-8" />
      {/* La barra abre el panel «Vehículo»: su nombre empieza así siempre, con o sin título. */}
      <span className="sr-only">Vehículo: </span>
      {elegido ? (
        <ConElegido elegido={elegido} titulo={conTitulo} cotizado={cotizado} />
      ) : (
        <SinElegido
          titulo={conTitulo}
          texto={
            puedeVer
              ? textoSinVehiculo === undefined
                ? 'Selecciona un vehículo'
                : textoSinVehiculo
              : SIN_VER
          }
          etiqueta={
            obligatorio && puedeVer ? (
              // En su propio `<span>`: «Selecciona un vehículo» no se parte.
              <span className={`${ETIQUETA} bg-(--color-peligro-soft) text-(--color-peligro-ink)`}>
                Obligatorio
              </span>
            ) : null
          }
        />
      )}
    </>
  )
}
