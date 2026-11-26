import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { unParametro } from '@/shared/lib/rutas'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { EditorDelFlujo } from '../../../../_flujo/editor-del-flujo'
import { NoSeAbre } from '../../no-se-abre'
import { abrirLaPuestaEnMarcha } from '../abrir'
import { MarcoDelPaso, PasoSinPermiso, conPermiso } from '../marco-del-paso'
import { Seguir } from '../seguir'

export const metadata: Metadata = { title: 'Puesta en marcha: Flujo' }

// Paso 3: las fases del origen, con el editor de la pestaña Fases (sin fases, ofrece «Empezar con las fases de…» otro origen).
export default async function PasoFlujo({
  params,
  searchParams,
}: PageProps<'/configuracion/origenes/[id]/puesta-en-marcha/flujo'>) {
  const [{ id }, parametros] = await Promise.all([params, searchParams])
  return (
    <>
      <h1 className="sr-only">Puesta en marcha: Flujo</h1>
      <Suspense fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
        <Flujo
          id={id}
          seccion={unParametro(parametros['seccion'])}
          panel={unParametro(parametros['panel'])}
        />
      </Suspense>
    </>
  )
}

async function Flujo({
  id,
  seccion,
  panel,
}: {
  id: string
  seccion: string | undefined
  panel: string | undefined
}) {
  await connection()
  const abierta = await abrirLaPuestaEnMarcha(id)
  if (abierta.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierta} />
  }
  return (
    <MarcoDelPaso abierta={abierta} paso="flujo">
      {conPermiso(abierta, 'flujo') ? (
        <>
          <EditorDelFlujo
            permisos={abierta.sesion.permisos}
            fijo={{ origenId: id }}
            seccionPedida={seccion}
            panelPedido={panel}
          />
          <Seguir origenId={id} paso="flujo" estado={abierta.estado} />
        </>
      ) : (
        <PasoSinPermiso abierta={abierta} paso="flujo" />
      )}
    </MarcoDelPaso>
  )
}
