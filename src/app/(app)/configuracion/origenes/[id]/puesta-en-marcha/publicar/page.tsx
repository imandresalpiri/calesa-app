import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { leerFormulasDelOrigen } from '@/modules/cotizaciones'
import { PublicarLaFormula } from '@/modules/cotizaciones/pantallas/formulas-del-origen-publicar'
import { redirigir } from '@/shared/lib/navegacion'
import { datosO } from '@/shared/lib/errores'
import { rutaDeLaPuestaEnMarcha } from '@/shared/lib/rutas'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { NoSeAbre } from '../../no-se-abre'
import { abrirLaPuestaEnMarcha } from '../abrir'
import { MarcoDelPaso, PasoSinPermiso, conPermiso } from '../marco-del-paso'
import { SinFormula } from '../sin-formula'
import { Seguir } from '../seguir'
import { ocultoEnElLive } from '../../../../../_live/guarda'

export const metadata: Metadata = { title: 'Puesta en marcha: Publicar' }

// Paso 6: qué se publica de la fórmula de trabajo (la planilla y la tarjeta) y «Publicar…», que la activa con su nota y lleva a «Listo». Con la fórmula
// ya activa no hay nada que publicar: va a «Listo». La lista es la de la barra de la fórmula (tope 50, una lectura).
export default async function PasoPublicar({
  params,
}: PageProps<'/configuracion/origenes/[id]/puesta-en-marcha/publicar'>) {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const { id } = await params
  return (
    <>
      <h1 className="sr-only">Puesta en marcha: Publicar</h1>
      <Suspense fallback={<EsqueletoFormulario bloques={1} campos={3} />}>
        <Publicar id={id} />
      </Suspense>
    </>
  )
}

async function Publicar({ id }: { id: string }) {
  await connection()
  const abierta = await abrirLaPuestaEnMarcha(id)
  if (abierta.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierta} />
  }
  if (abierta.origen.uso.formulaPublicada) {
    redirigir(rutaDeLaPuestaEnMarcha(id, 'listo'))
  }
  if (!conPermiso(abierta, 'publicar')) {
    return (
      <MarcoDelPaso abierta={abierta} paso="publicar">
        <PasoSinPermiso abierta={abierta} paso="publicar" />
      </MarcoDelPaso>
    )
  }
  const { formulas } = datosO(await leerFormulasDelOrigen(id))
  const formula = formulas.find((f) => f.id === abierta.formulaDeTrabajo?.id)
  const activa = formulas.find((f) => f.activa)
  const { nombre } = abierta.origen
  return (
    <MarcoDelPaso abierta={abierta} paso="publicar">
      {formula === undefined ? (
        <SinFormula origenId={id} />
      ) : (
        <PublicarLaFormula
          origen={{ id, nombre }}
          formula={formula}
          activa={activa ? { id: activa.id, nombre: activa.nombre } : null}
          alListo={rutaDeLaPuestaEnMarcha(id, 'listo')}
        />
      )}
      <Seguir origenId={id} paso="publicar" estado={abierta.estado} sinSeguir />
    </MarcoDelPaso>
  )
}
