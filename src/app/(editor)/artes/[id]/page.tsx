import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { z } from 'zod'
import {
  leerPlantillaParaEditar,
  MOTIVO_SIN_ARTES,
  origenesDeArtes,
  puedeEditarLaPlantilla,
} from '@/modules/artes'
import {
  ErrorDelDocumento,
  FueraDelEditor,
  MarcoDelEditor,
  PantallaDelEditor,
} from '@/modules/artes/pantallas/artes-plantilla'
import { conArchivo, leerLogos } from '@/modules/empresa'
import { puede, requerirSesion } from '@/modules/equipo'
import { getOrigenes, type OrigenResumen } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso } from '@/shared/ui/estados/estado-sin-permiso'
import { EstadoVacio } from '@/shared/ui/estados/estado-vacio'
import { ocultoEnElLive } from '../../../(app)/_live/guarda'
import { leerDatosDelEditor } from './datos-del-editor'

export const metadata: Metadata = { title: 'Editor de artes' }

const TITULO = 'Plantilla de arte'
const NO_ESTA = 'No encontramos esta plantilla de arte.'
const NO_SE_LEYO_EL_ORIGEN = 'No pudimos leer el origen de esta plantilla.'

// El editor de artes de una plantilla (`/artes/<id>`), a pantalla completa. Una que no existe o que quien mira no ve (la RLS) dice que no la
// encontramos, sin redirigir; la de otra persona, o la de la empresa sin `artes.empresa.gestionar`, se abre en sólo lectura.
export default function PaginaDelEditorDeArtes({ params }: PageProps<'/artes/[id]'>) {
  return (
    <Suspense fallback={<MarcoDelEditor />}>
      <EditorDeLaPlantilla params={params} />
    </Suspense>
  )
}

// El origen de la plantilla: entre los activos que ya leyó la página o, si se desactivó después, entre todos (una plantilla de un origen
// inactivo se sigue abriendo).
async function origenDeLaPlantilla(origenId: string, activos: readonly OrigenResumen[]) {
  const activo = activos.find((o) => o.id === origenId)
  if (activo) {
    return activo
  }
  const todos = await getOrigenes(true)
  return todos.ok ? (todos.data.find((o) => o.id === origenId) ?? null) : null
}

// Las variantes del logo con archivo, sólo lo que el editor dibuja (el archivo se pide por `/artes/logos/<variante>`). Si no se pueden leer,
// el editor se abre sin ellas.
async function logosDelEditor() {
  const logos = await leerLogos()
  if (!logos.ok) {
    return []
  }
  return conArchivo(logos.data).map(({ id, nombre, ancho, alto }) => ({ id, nombre, ancho, alto }))
}

async function EditorDeLaPlantilla({ params }: { params: PageProps<'/artes/[id]'>['params'] }) {
  const oculto = await ocultoEnElLive('cotizaciones')
  if (oculto) {
    return <FueraDelEditor titulo={TITULO}>{oculto}</FueraDelEditor>
  }
  await connection()
  const [sesion, { id }, todos] = await Promise.all([requerirSesion(), params, getOrigenes()])
  if (origenesDeArtes(sesion.permisos, datosO(todos)).length === 0) {
    return (
      <FueraDelEditor titulo={TITULO}>
        <EstadoSinPermiso descripcion={MOTIVO_SIN_ARTES} />
      </FueraDelEditor>
    )
  }
  const leido = z.guid().safeParse(id)
  const [plantilla, logos] = leido.success
    ? await Promise.all([leerPlantillaParaEditar(leido.data), logosDelEditor()])
    : [null, []]
  const encontrada = plantilla === null ? null : datosO(plantilla)
  if (encontrada === null) {
    return (
      <FueraDelEditor titulo={TITULO}>
        <EstadoVacio
          titulo={NO_ESTA}
          accion={
            <Link href={RUTAS.artes} className={buttonVariants({ variant: 'outline' })}>
              Volver a Artes
            </Link>
          }
        />
      </FueraDelEditor>
    )
  }
  const { documento, ...resto } = encontrada
  const origen = await origenDeLaPlantilla(resto.origenId, datosO(todos))
  if (!documento.ok || origen === null) {
    return (
      <FueraDelEditor titulo={resto.nombre}>
        <ErrorDelDocumento
          mensaje={documento.ok ? NO_SE_LEYO_EL_ORIGEN : documento.error.mensaje}
        />
      </FueraDelEditor>
    )
  }
  const quien = {
    yo: sesion.usuarioId,
    gestiona: puede(sesion.permisos, 'artes.empresa.gestionar'),
  }
  const permiso = puedeEditarLaPlantilla(quien, resto)
  const datos = await leerDatosDelEditor(origen, sesion.permisos)
  return (
    // Otra versión guardada (al recargar tras un conflicto), otro editor: empieza de cero con lo nuevo.
    <PantallaDelEditor
      key={resto.actualizadoEn}
      plantilla={{ ...resto, documento: documento.data }}
      logos={logos}
      motivoDeSoloLectura={permiso.ok ? null : permiso.motivo}
      personaId={sesion.usuarioId}
      {...datos}
    />
  )
}
