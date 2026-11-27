import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { z } from 'zod'
import { leerNombreDeLaPlantilla, MOTIVO_SIN_ARTES, origenesDeArtes } from '@/modules/artes'
import { EditorPronto, EsqueletoDelEditorPronto } from '@/modules/artes/pantallas/artes-plantilla'
import { requerirSesion } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'
import { ocultoEnElLive } from '../../_live/guarda'

export const metadata: Metadata = { title: 'Plantilla de arte' }

const NO_ESTA = 'No encontramos esta plantilla de arte.'

// Una plantilla de arte (`/artes/<id>`): el editor de artes llega en otra entrega; hoy, su nombre y el camino de vuelta. Una que no existe o que
// quien mira no ve (la RLS) dice que no la encontramos, sin redirigir.
export default function PaginaDeLaPlantillaDeArte({ params }: PageProps<'/artes/[id]'>) {
  return (
    <Suspense fallback={<EsqueletoDelEditorPronto />}>
      <PlantillaDeArte params={params} />
    </Suspense>
  )
}

async function PlantillaDeArte({ params }: { params: PageProps<'/artes/[id]'>['params'] }) {
  const oculto = await ocultoEnElLive('cotizaciones')
  if (oculto) {
    return oculto
  }
  await connection()
  const [sesion, { id }, todos] = await Promise.all([requerirSesion(), params, getOrigenes()])
  if (origenesDeArtes(sesion.permisos, datosO(todos)).length === 0) {
    return <EstadoSinPermiso descripcion={MOTIVO_SIN_ARTES} />
  }
  const leida = z.guid().safeParse(id)
  const plantilla = leida.success ? datosO(await leerNombreDeLaPlantilla(leida.data)) : null
  if (plantilla === null) {
    return (
      <>
        <h1 className="sr-only">Plantilla de arte</h1>
        <EstadoVacio
          titulo={NO_ESTA}
          accion={
            <Link href={RUTAS.artes} className={buttonVariants({ variant: 'outline' })}>
              Volver a Artes
            </Link>
          }
        />
      </>
    )
  }
  return <EditorPronto nombre={plantilla.nombre} />
}
