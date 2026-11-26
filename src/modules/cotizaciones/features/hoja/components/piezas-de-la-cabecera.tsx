'use client'

import { InterruptorChico } from './interruptor-chico'
import { ModosDeLaHoja } from './modos-de-la-hoja'

// Qué hace «Ver total en moneda local»: no se ve (guías, sólo las imprescindibles); la leen el lector de pantalla y el `title`.
export const AYUDA_DE_VER_TOTAL = 'Suma el total en moneda local y se guarda con la cotización.'

// Los modos (sólo si hay dos o más) y «Ver total en moneda local» (sólo con un valor: nulo, la hoja no lo ofrece) de la cabecera de la hoja. Los dibujan la cabecera de
// verdad (`CabeceraDeHoja`) y la quieta que la ranura muestra antes de hidratar (`CabeceraQuieta`): las dos miden lo mismo porque son lo mismo.
export function PiezasDeLaCabecera({
  modos,
  modoElegido,
  alElegirModo,
  verTotalBs,
  alCambiarVerTotalBs,
  deshabilitado,
}: {
  modos: readonly { clave: string; nombre: string }[]
  modoElegido: string | null
  alElegirModo: (clave: string) => void
  verTotalBs: boolean | null
  alCambiarVerTotalBs: (valor: boolean) => void
  deshabilitado: boolean
}) {
  return (
    <>
      {modos.length >= 2 ? (
        <ModosDeLaHoja
          modos={modos}
          elegido={modoElegido}
          alElegir={alElegirModo}
          deshabilitado={deshabilitado}
        />
      ) : null}
      {verTotalBs === null ? null : (
        <InterruptorChico
          etiqueta="Ver total en moneda local"
          ayuda={AYUDA_DE_VER_TOTAL}
          valor={verTotalBs}
          alCambiar={alCambiarVerTotalBs}
          deshabilitado={deshabilitado}
        />
      )}
    </>
  )
}
