'use client'

import { Bloque } from '@/shared/ui/bloque'
import { opcionesDeTransporte, type ElementoDeOferta } from '../../../entities/transporte/oferta'
import {
  CamposDeContenedorDelGrupo,
  CamposDeFechasDelGrupo,
  CamposDeRutaDelGrupo,
  type PropsDeCamposDelGrupo,
} from './campos-del-grupo'

type Props = PropsDeCamposDelGrupo & {
  navieras: readonly ElementoDeOferta[]
  puertos: readonly ElementoDeOferta[]
}

const SIN_OFRECER: readonly ElementoDeOferta[] = []

// Las opciones: todos los activos del catálogo más lo común si hoy está inactivo (D40; la oferta de cada flujo la revisa la base por unidad).
function opciones(catalogo: readonly ElementoDeOferta[], comun: string, femenino: boolean) {
  return opcionesDeTransporte({
    ofrecidos: SIN_OFRECER,
    catalogo,
    guardado: comun === '' ? null : comun,
    femenino,
  })
}

// Los tres bloques abiertos de «Editar grupo» (6.08-4): Ruta, Contenedor y booking, Fechas. Sin notas (D39).
export function BloquesDelGrupo({ navieras, puertos, ...campos }: Props) {
  const { valores } = campos
  return (
    <>
      <Bloque titulo="Ruta">
        <CamposDeRutaDelGrupo
          {...campos}
          navieras={opciones(navieras, valores.naviera, true)}
          puertosOrigen={opciones(puertos, valores.puertoOrigen, false)}
          puertosDestino={opciones(puertos, valores.puertoDestino, false)}
          hayNavieras={navieras.some((n) => n.activo)}
        />
      </Bloque>
      <Bloque titulo="Contenedor y booking">
        <CamposDeContenedorDelGrupo {...campos} />
      </Bloque>
      <Bloque titulo="Fechas">
        <CamposDeFechasDelGrupo {...campos} />
      </Bloque>
    </>
  )
}
