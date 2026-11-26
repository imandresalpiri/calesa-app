import type { HojaDeUnaGuardada } from '@/modules/cotizaciones'
import type { CambioPermitido } from '@/modules/cotizaciones'
import {
  EnlaceALaHermana,
  PantallaDeUnaGuardada,
  PantallaDeUnParGuardadoDiferida,
} from '@/modules/cotizaciones/pantallas/cotizacion'
import { PANEL_DEL_VEHICULO } from '@/modules/vehiculos/pantallas/cotizar'
import type { leerElParDeLaGuardada } from './par-de-la-guardada'

type DelPar = Awaited<ReturnType<typeof leerElParDeLaGuardada>>
type Lectura = Parameters<typeof leerElParDeLaGuardada>[0]

// Bajo la cabecera de una hermana (glosario: «Cotizaciones hermanas»): el enlace a la otra y, si se abrió sola, por qué.
export function LaHermana({ hoja, delPar }: { hoja: HojaDeUnaGuardada; delPar: DelPar }) {
  if (!hoja.hermana || delPar.etiquetaDeLaOtra === null) return null
  return (
    <EnlaceALaHermana
      hermana={hoja.hermana}
      etiqueta={delPar.etiquetaDeLaOtra}
      aviso={delPar.modo.modo === 'sola' ? delPar.modo.aviso : null}
    />
  )
}

// La hoja de la guardada: la de siempre o, con la hermana disponible, las dos juntas (la cáscara diferida: lo del par se pide sólo entonces). En par la ayuda sólo se
// consulta: sin «Tu vehículo» (`valoresDelVehiculo`, los datos del vehículo de la hoja que casan sus tablas).
export function HojaDeLaGuardada({
  lectura,
  delPar,
  personaId,
  cambio,
  valoresDelVehiculo,
}: {
  lectura: Lectura
  delPar: DelPar
  personaId: string
  cambio: CambioPermitido
  valoresDelVehiculo: Readonly<Record<string, number | string>> | undefined
}) {
  const { hoja, inicial, vehiculoNuevo } = lectura
  const comun = {
    personaId,
    panelDelTitulo: PANEL_DEL_VEHICULO,
    vehiculoNuevo,
    cambiaVehiculo: cambio === 'elige',
  }
  if ('hojas' in delPar) {
    return (
      <PantallaDeUnParGuardadoDiferida
        key={`${hoja.cotizacion.id}:par`}
        hojas={delPar.hojas}
        iniciales={delPar.iniciales}
        abierta={delPar.abierta}
        par={delPar.par}
        {...comun}
      />
    )
  }
  return (
    <PantallaDeUnaGuardada
      key={hoja.cotizacion.id}
      hoja={hoja}
      inicial={inicial}
      valoresDelVehiculo={valoresDelVehiculo}
      {...comun}
    />
  )
}
