'use client'

import type { ContextoDeHoja } from '../../../../entities/binding'
import type { HojaDeLaVistaPrevia } from '../../../../entities/diseno/hoja-del-diseno'
import { CabeceraDeHoja } from '../../../hoja/components/cabecera-de-hoja'
import { ResumenDeHoja } from '../../../hoja/components/resumen-de-hoja'
import type { ApoyoDelLienzo } from '../../hooks/use-apoyo-del-lienzo'
import { ESTADO_AL_DIA, nada } from './acciones-quietas'
import { PiezaFija } from './pieza-fija'

export type PropsDelResumen = {
  hoja: HojaDeLaVistaPrevia
  contexto: ContextoDeHoja
  totalEnLaHoja: boolean
  apoyo: ApoyoDelLienzo
}

// El resumen de la hoja, como en `/cotizaciones/nuevo`: con la tarjeta del total en una sección, se ve y no se elige; sin ella, es la pieza de la tarjeta.
export function ResumenDelLienzo({ hoja, contexto, totalEnLaHoja, apoyo }: PropsDelResumen) {
  const modo = hoja.cabecera.modos.find((m) => m.clave === contexto.entradas.modoTc)?.nombre ?? null
  const resumen = (
    <ResumenDeHoja
      tarjeta={hoja.tarjetaTotal}
      monedaDelTotalBs={null}
      modo={modo}
      contexto={contexto}
      estado={ESTADO_AL_DIA}
      avisoDelVehiculo={null}
      alReintentar={nada}
      alRecargar={nada}
      guardar={null}
      avisoDeGuardado={null}
      totalEnLaHoja={totalEnLaHoja}
    />
  )
  return totalEnLaHoja ? (
    <div inert className={AL_COSTADO}>
      {resumen}
    </div>
  ) : (
    <PiezaFija
      pieza={{ pieza: 'total' }}
      nombre="la tarjeta del total"
      vacio=""
      apoyo={apoyo}
      className={AL_COSTADO}
    >
      {resumen}
    </PiezaFija>
  )
}

// Al costado mide lo que mide el resumen (su `@4xl/hoja:w-[22rem]`): un ancho propio aquí lo recortaría.
const AL_COSTADO = 'min-w-0 @4xl/hoja:shrink-0'

export function CabeceraDelLienzo({
  hoja,
  contexto,
  apoyo,
}: Omit<PropsDelResumen, 'totalEnLaHoja'>) {
  return (
    <PiezaFija
      pieza={{ pieza: 'cabecera' }}
      nombre="la cabecera"
      vacio="Cabecera: sin modos ni «Ver total en moneda local»."
      apoyo={apoyo}
    >
      <CabeceraDeHoja
        cabecera={hoja.cabecera}
        modoElegido={contexto.entradas.modoTc}
        alElegirModo={nada}
        verTotalBs={false}
        alCambiarVerTotalBs={nada}
      />
    </PiezaFija>
  )
}
