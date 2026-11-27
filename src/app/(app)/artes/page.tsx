import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import {
  claveDelPedido,
  esquemaDeFiltrosDeArtes,
  leerMisPorDefecto,
  leerPaginaDeImagenes,
  leerPaginaDePlantillas,
  leerPestana,
  MOTIVO_SIN_ARTES,
  origenesDeArtes,
  pedidoDePlantillas,
  type OrigenDeArtes,
  type QuienMira,
} from '@/modules/artes'
import {
  EsqueletoDeArtes,
  PestanaDeImagenesDiferida,
  PestanaDePlantillas,
  PestanasDeArtes,
} from '@/modules/artes/pantallas/artes-seccion'
import { puede, requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { leerFiltros, type ParametrosDeUrl } from '@/shared/lib/filtros'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { ocultoEnElLive } from '../_live/guarda'

export const metadata: Metadata = { title: 'Artes' }

// Artes (`docs/UX.md` › «Artes»): las plantillas de arte con que se comparte una cotización y la biblioteca de imágenes que usan, en dos
// pestañas (`?pestana=imagenes`). Se entra con `cotizaciones.ver` en algún origen; lo que se ve lo decide la RLS (las de los orígenes donde ve
// cotizaciones; las privadas, sólo su autor). Sin entrada en el menú: llega desde «Compartir» de una cotización y con el editor de artes.
export default function PaginaDeArtes({ searchParams }: PageProps<'/artes'>) {
  return (
    <>
      {/* El h1 va fuera del Suspense: está también cargando y sin permiso. Sin cabecera visible: la ocupan las pestañas. */}
      <h1 className="sr-only">Artes</h1>
      <Suspense fallback={<EsqueletoDeArtes />}>
        <Artes searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Artes({ searchParams }: { searchParams: PageProps<'/artes'>['searchParams'] }) {
  const oculto = await ocultoEnElLive('cotizaciones')
  if (oculto) {
    return oculto
  }
  await connection()
  const [sesion, parametros, todos] = await Promise.all([
    requerirSesion(),
    searchParams,
    getOrigenes(),
  ])
  const origenes = origenesDeArtes(sesion.permisos, datosO(todos))
  if (origenes.length === 0) {
    return <EstadoSinPermiso descripcion={MOTIVO_SIN_ARTES} />
  }
  const quien: QuienMira = {
    yo: sesion.usuarioId,
    gestiona: puede(sesion.permisos, 'artes.empresa.gestionar'),
  }
  const pestana = leerPestana(parametros)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <PestanasDeArtes valor={pestana} />
      {pestana === 'imagenes' ? (
        <PestanaDeImagenesDiferida inicial={datosO(await leerPaginaDeImagenes())} quien={quien} />
      ) : (
        <Plantillas parametros={parametros} origenes={origenes} quien={quien} />
      )}
    </div>
  )
}

// La pestaña de entrada: la primera página con los filtros de la URL y las por defecto de quien mira (marcan su tarjeta y su «⋯»). Otros
// filtros, otra `key`: lo cargado empieza de cero.
async function Plantillas({
  parametros,
  origenes,
  quien,
}: {
  parametros: ParametrosDeUrl
  origenes: OrigenDeArtes[]
  quien: QuienMira
}) {
  const pedido = pedidoDePlantillas(leerFiltros(esquemaDeFiltrosDeArtes(origenes), parametros))
  const [pagina, porDefecto] = await Promise.all([
    leerPaginaDePlantillas(pedido, quien.yo),
    leerMisPorDefecto(),
  ])
  return (
    <PestanaDePlantillas
      key={claveDelPedido(pedido)}
      inicial={datosO(pagina)}
      pedido={pedido}
      quien={quien}
      origenes={origenes}
      porDefecto={datosO(porDefecto)}
    />
  )
}
