import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { DatosDelOrigen } from '@/modules/origenes/pantallas/origen-datos'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { NoSeAbre } from '../../no-se-abre'
import { abrirLaPuestaEnMarcha } from '../abrir'
import { MarcoDelPaso, PasoSinPermiso, conPermiso } from '../marco-del-paso'
import { Seguir } from '../seguir'
import { ocultoEnElLive } from '../../../../../_live/guarda'

export const metadata: Metadata = { title: 'Puesta en marcha: Datos' }

// Paso 1 de la puesta en marcha, ya con el origen creado (al volver): sus datos, como en la pestaña Datos.
export default async function PasoDatos({
  params,
}: PageProps<'/configuracion/origenes/[id]/puesta-en-marcha/datos'>) {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const { id } = await params
  return (
    <>
      <h1 className="sr-only">Puesta en marcha: Datos</h1>
      <Suspense fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
        <Datos id={id} />
      </Suspense>
    </>
  )
}

async function Datos({ id }: { id: string }) {
  await connection()
  const abierta = await abrirLaPuestaEnMarcha(id)
  if (abierta.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierta} />
  }
  return (
    <MarcoDelPaso abierta={abierta} paso="datos">
      {conPermiso(abierta, 'datos') ? (
        <>
          <div className="grid max-w-3xl gap-4">
            <DatosDelOrigen origen={abierta.origen} puedeGestionar />
          </div>
          <Seguir origenId={id} paso="datos" estado={abierta.estado} />
        </>
      ) : (
        <PasoSinPermiso abierta={abierta} paso="datos" />
      )}
    </MarcoDelPaso>
  )
}
