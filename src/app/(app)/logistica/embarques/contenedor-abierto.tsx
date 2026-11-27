import { connection } from 'next/server'
import { z } from 'zod'
import {
  CONTENEDOR_QUE_NO_ESTA,
  leerContenedor,
  leerTiposDeContenedor,
  PANEL_AGREGAR_VEHICULOS,
  PANEL_EDITAR_CONTENEDOR,
  tituloDelContenedor,
  type ContenedorLeido,
  type HuecoDelGrupo,
} from '@/modules/logistica'
import {
  CuerpoDelContenedor,
  DrawerAgregarVehiculos,
  ModalDelContenedor,
} from '@/modules/logistica/pantallas/transporte'
import { datosO } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { EstadoVacio } from '@/shared/ui/estados'
import { MarcasDeLogistica } from '../marcas-de-logistica'
import { HuecoAbierto } from './hueco-abierto'
import { huecosDelMenu, paraElMenu, puedeMoverEn } from './huecos-del-grupo'

// Lo que se abre sobre el contenedor (`?panel=`): editarlo, agregarle vehículos o uno de sus huecos. Sin permiso, la URL no abre nada; los tipos se leen sólo con el formulario
// abierto, que es lo único que los usa.
async function PanelesDelContenedor({
  c,
  panel,
  editable,
  huecos,
}: {
  c: ContenedorLeido
  panel: string | undefined
  editable: boolean
  huecos: readonly HuecoDelGrupo[]
}) {
  const embarqueId = c.embarque?.id ?? null
  const tipos =
    panel === PANEL_EDITAR_CONTENEDOR && editable ? datosO(await leerTiposDeContenedor()) : null
  return (
    <>
      {tipos === null ? null : (
        <ModalDelContenedor
          original={c}
          embarqueId={embarqueId}
          origenId={c.origenId}
          tipos={tipos}
        />
      )}
      {panel === PANEL_AGREGAR_VEHICULOS && editable ? (
        <DrawerAgregarVehiculos
          destino={{ tipo: 'contenedor', id: c.id, embarqueId }}
          origenId={c.origenId}
          titulo={tituloDelContenedor(c.numero)}
        />
      ) : null}
      <HuecoAbierto
        panel={panel}
        huecos={huecos}
        grupo={{ tipo: 'contenedor', id: c.id, origenId: c.origenId }}
        descripcion={`Del contenedor ${c.numero}.`}
      />
    </>
  )
}

// El cuerpo del drawer del contenedor (`?contenedor=<uuid>`, en la lista y en la página de un embarque) y lo que se abre sobre él. Va dentro del drawer: un modal o un drawer abierto
// desde otro se dibuja entre sus hijos. El que no existe, el que no es un uuid y el que no se ve dicen lo mismo (la base da un solo `P0002`); cualquier otro error sube al `error.tsx`
// de `(app)`, que ofrece «Reintentar».
export async function ContenedorAbierto({
  id,
  panel,
  permisos,
}: {
  id: string
  panel: string | undefined
  permisos: Permisos
}) {
  await connection()
  const valido = z.guid().safeParse(id)
  const leido = valido.success ? await leerContenedor(valido.data) : null
  if (leido === null || (!leido.ok && leido.error.codigo === 'no_encontrado')) {
    return <EstadoVacio titulo={CONTENEDOR_QUE_NO_ESTA} />
  }
  const c = datosO(leido)
  const puedeEditar = puede(permisos, 'logistica.transporte.editar', c.origenId)
  const huecos = huecosDelMenu('contenedor', permisos)
  return (
    <>
      <MarcasDeLogistica ids={c.vehiculos.map((v) => v.vehiculoId)}>
        <CuerpoDelContenedor
          contenedor={c}
          puedeEditar={puedeEditar}
          puedeMover={puedeMoverEn(permisos, c.origenId)}
          huecos={paraElMenu(huecos)}
        />
      </MarcasDeLogistica>
      <PanelesDelContenedor
        c={c}
        panel={panel}
        editable={puedeEditar && c.editable}
        huecos={huecos}
      />
    </>
  )
}
