import type { Route } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { z } from 'zod'
import {
  EMBARQUE_QUE_NO_ESTA,
  leerCatalogosDeTransporte,
  leerEmbarque,
  leerTiposDeContenedor,
  PANEL_AGREGAR_CONTENEDOR,
  PANEL_AGREGAR_VEHICULOS,
  PANEL_EDITAR_EMBARQUE,
  tituloDelEmbarque,
  type EmbarqueLeido,
} from '@/modules/logistica'
import {
  DrawerAgregarVehiculos,
  DrawerDelContenedor,
  FichaDelEmbarque,
  ModalDelContenedor,
  ModalDelEmbarque,
} from '@/modules/logistica/pantallas/transporte'
import { datosO } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EsqueletoDetalle } from '@/shared/ui/esqueletos'
import { EstadoVacio } from '@/shared/ui/estados'
import { BarraDeLaUnidad } from '../../barra-de-logistica'
import { MarcasDeLogistica } from '../../marcas-de-logistica'
import { ContenedorAbierto } from '../contenedor-abierto'
import { HuecoAbierto } from '../hueco-abierto'
import { huecosDelMenu, paraElMenu, puedeMoverEn } from '../huecos-del-grupo'

type Props = {
  id: string
  permisos: Permisos
  falta: boolean
  panel: string | undefined
  contenedor: string | undefined
}

function NoEsta() {
  return (
    <>
      <BarraDeLaUnidad origenId={null} pestana="embarques" />
      <h1 className="sr-only">Embarque</h1>
      <EstadoVacio
        titulo={EMBARQUE_QUE_NO_ESTA}
        accion={
          <Link
            href={RUTAS.embarques as Route}
            className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-9' })}
          >
            Ir a los embarques
          </Link>
        }
      />
    </>
  )
}

// Lo que se abre sobre la página sin un contenedor (`?panel=`): editar el embarque, agregarle un contenedor o vehículos, o uno de sus huecos. Sin permiso, la URL no abre nada; los
// catálogos y los tipos se leen sólo con su formulario abierto.
async function PanelesDelEmbarque({
  e,
  panel,
  editable,
  catalogos,
  permisos,
}: {
  e: EmbarqueLeido
  panel: string | undefined
  editable: boolean
  catalogos: Awaited<ReturnType<typeof leerCatalogosDeTransporte>>
  permisos: Permisos
}) {
  const tipos =
    panel === PANEL_AGREGAR_CONTENEDOR && editable ? datosO(await leerTiposDeContenedor()) : null
  return (
    <>
      {panel === PANEL_EDITAR_EMBARQUE && editable ? (
        <ModalDelEmbarque original={e} origenId={e.origenId} catalogos={datosO(catalogos)} />
      ) : null}
      {tipos === null ? null : (
        <ModalDelContenedor original={null} embarqueId={e.id} origenId={e.origenId} tipos={tipos} />
      )}
      {panel === PANEL_AGREGAR_VEHICULOS && editable ? (
        <DrawerAgregarVehiculos
          destino={{ tipo: 'embarque', id: e.id }}
          origenId={e.origenId}
          titulo={tituloDelEmbarque(e.booking)}
        />
      ) : null}
      <HuecoAbierto
        panel={panel}
        huecos={huecosDelMenu('embarque', permisos)}
        grupo={{ tipo: 'embarque', id: e.id, origenId: e.origenId }}
        descripcion={`Del embarque ${e.booking}.`}
      />
    </>
  )
}

// La página de un embarque con su barra (el origen del embarque, en la pestaña Embarques; no se recuerda). El que no existe, el que no es un uuid y el que no se ve dicen lo mismo (la base da
// un solo `P0002`); cualquier otro error sube al `error.tsx` de `(app)`, que ofrece «Reintentar».
export async function EmbarqueEnSuPagina({ id, permisos, falta, panel, contenedor }: Props) {
  const valido = z.guid().safeParse(id)
  if (!valido.success) return <NoEsta />
  const [leido, catalogos] = await Promise.all([
    leerEmbarque(valido.data, { falta }),
    leerCatalogosDeTransporte(),
  ])
  if (!leido.ok && leido.error.codigo === 'no_encontrado') return <NoEsta />
  const e = datosO(leido)
  const puedeEditar = puede(permisos, 'logistica.transporte.editar', e.origenId)
  return (
    <>
      <BarraDeLaUnidad origenId={e.origenId} pestana="embarques" />
      <MarcasDeLogistica ids={e.vehiculos.map((v) => v.vehiculoId)}>
        <FichaDelEmbarque
          embarque={e}
          catalogos={datosO(catalogos)}
          puedeEditar={puedeEditar}
          puedeMover={puedeMoverEn(permisos, e.origenId)}
          huecosDelEmbarque={paraElMenu(huecosDelMenu('embarque', permisos))}
          huecosDelContenedor={paraElMenu(huecosDelMenu('contenedor', permisos))}
          falta={falta}
        />
      </MarcasDeLogistica>
      {contenedor === undefined ? (
        <PanelesDelEmbarque
          e={e}
          panel={panel}
          editable={puedeEditar && e.editable}
          catalogos={catalogos}
          permisos={permisos}
        />
      ) : (
        <DrawerDelContenedor>
          <Suspense key={contenedor} fallback={<EsqueletoDetalle />}>
            <ContenedorAbierto id={contenedor} panel={panel} permisos={permisos} />
          </Suspense>
        </DrawerDelContenedor>
      )}
    </>
  )
}
