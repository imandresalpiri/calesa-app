import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import {
  leerDatosNuevosDeApibara,
  leerGruposDelOrigen,
  leerLayout,
  type OrigenConUso,
} from '@/modules/origenes'
import { DatosNuevosDeApibara, EditorDeCampos } from '@/modules/origenes/pantallas/origen-campos'
import { datosO } from '@/shared/lib/errores'
import { EsqueletoTabla } from '@/shared/ui/esqueletos'
import { NoSeAbre } from '../../no-se-abre'
import { abrirLaPuestaEnMarcha } from '../abrir'
import { MarcoDelPaso, PasoSinPermiso, conPermiso } from '../marco-del-paso'
import { Seguir } from '../seguir'
import { ocultoEnElLive } from '../../../../../_live/guarda'

export const metadata: Metadata = { title: 'Puesta en marcha: Campos' }

// Paso 2: los campos del origen (los de su tipo ya nacieron con él), como en la pestaña Campos. Al salir con cambios, avisa la guarda del editor.
export default async function PasoCampos({
  params,
}: PageProps<'/configuracion/origenes/[id]/puesta-en-marcha/campos'>) {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const { id } = await params
  return (
    <>
      <h1 className="sr-only">Puesta en marcha: Campos</h1>
      <Suspense fallback={<EsqueletoTabla filas={6} columnas={3} />}>
        <Campos id={id} />
      </Suspense>
    </>
  )
}

async function EditorDelPaso({ origen }: { origen: OrigenConUso }) {
  const [layout, grupos, nuevos] = await Promise.all([
    leerLayout(origen.id, { conUso: false }),
    leerGruposDelOrigen(origen.id),
    origen.tipo === 'subasta' ? leerDatosNuevosDeApibara(origen.id) : null,
  ])
  const { campos } = datosO(layout)
  // Si no se pudo averiguar, el editor sigue: es un aviso, no la pantalla.
  const datosNuevos = nuevos?.ok ? nuevos.data : []
  return (
    <div className="grid min-w-0 gap-6">
      {datosNuevos.length > 0 ? (
        <DatosNuevosDeApibara origenId={origen.id} datos={datosNuevos} />
      ) : null}
      <EditorDeCampos
        origenId={origen.id}
        tipoDeOrigen={origen.tipo}
        campos={campos}
        grupos={datosO(grupos)}
        puedeGestionar
        datosClave={origen.datosClave}
        versionDelOrigen={origen.actualizadoEn}
      />
    </div>
  )
}

async function Campos({ id }: { id: string }) {
  await connection()
  const abierta = await abrirLaPuestaEnMarcha(id)
  if (abierta.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierta} />
  }
  return (
    <MarcoDelPaso abierta={abierta} paso="campos">
      {conPermiso(abierta, 'campos') ? (
        <>
          <EditorDelPaso origen={abierta.origen} />
          <Seguir origenId={id} paso="campos" estado={abierta.estado} />
        </>
      ) : (
        <PasoSinPermiso abierta={abierta} paso="campos" />
      )}
    </MarcoDelPaso>
  )
}
