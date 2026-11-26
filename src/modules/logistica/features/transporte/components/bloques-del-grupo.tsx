'use client'

import { Bloque } from '@/shared/ui/bloque'
import type { AlcanceDelCatalogo } from '../../../entities/nucleo/alcance-del-catalogo'
import {
  opcionesDeTransporte,
  type ElementoDelCatalogo,
  type ElementoDeOferta,
} from '../../../entities/transporte/oferta'
import {
  CamposDeContenedorDelGrupo,
  CamposDeFechasDelGrupo,
  CamposDeRutaDelGrupo,
  type PropsDeCamposDelGrupo,
} from './campos-del-grupo'

type Props = PropsDeCamposDelGrupo & {
  navieras: readonly ElementoDelCatalogo[]
  puertos: readonly ElementoDelCatalogo[]
  // Lo que pueden usar todas las unidades del grupo (`alcanceDelGrupo`).
  alcanceDeNavieras: AlcanceDelCatalogo
  alcanceDePuertos: AlcanceDelCatalogo
}

const SIN_OFRECER: readonly ElementoDeOferta[] = []

// Las opciones: los activos que pueden usar todas las unidades más lo común si hoy está inactivo, tapado o es de otro origen (D40; la oferta de cada flujo la revisa la base por
// unidad).
function opciones(
  catalogo: readonly ElementoDelCatalogo[],
  alcance: AlcanceDelCatalogo,
  comun: string,
  femenino: boolean,
) {
  return opcionesDeTransporte({
    ofrecidos: SIN_OFRECER,
    catalogo,
    alcance,
    guardado: comun === '' ? null : comun,
    femenino,
  })
}

// Los tres bloques abiertos de «Editar grupo» (6.08-4): Ruta, Contenedor y booking, Fechas. Sin notas (D39).
export function BloquesDelGrupo({
  navieras,
  puertos,
  alcanceDeNavieras,
  alcanceDePuertos,
  ...campos
}: Props) {
  const { valores } = campos
  return (
    <>
      <Bloque titulo="Ruta">
        <CamposDeRutaDelGrupo
          {...campos}
          navieras={opciones(navieras, alcanceDeNavieras, valores.naviera, true)}
          puertosOrigen={opciones(puertos, alcanceDePuertos, valores.puertoOrigen, false)}
          puertosDestino={opciones(puertos, alcanceDePuertos, valores.puertoDestino, false)}
          hayNavieras={navieras.some((n) => n.activo && alcanceDeNavieras.usables.has(n.id))}
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
