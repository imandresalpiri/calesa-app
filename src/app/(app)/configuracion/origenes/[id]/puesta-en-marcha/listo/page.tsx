import { CircleCheckIcon } from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { rutaDeLaHoja } from '@/modules/cotizaciones'
import { pasoPendiente } from '@/modules/origenes'
import { redirigir } from '@/shared/lib/navegacion'
import { rutaDeLaPuestaEnMarcha, rutaDelOrigen } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { NoSeAbre } from '../../no-se-abre'
import { abrirLaPuestaEnMarcha } from '../abrir'
import { MarcoDelPaso } from '../marco-del-paso'
import { MOTIVO_DEL_PASO } from '../pasos'
import { ocultoEnElLive } from '../../../../../_live/guarda'

export const metadata: Metadata = { title: 'Puesta en marcha: Listo' }

// El final de la puesta en marcha: con la fórmula activa, «<Origen> ya cotiza.» y «Cotizar con <origen>». Sin ella, si a la persona le queda un paso,
// vuelve al resolvedor; si no (le falta el permiso del cotizador), dice quién la publica, sin redirigir en círculo.
export default async function PasoListo({
  params,
}: PageProps<'/configuracion/origenes/[id]/puesta-en-marcha/listo'>) {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const { id } = await params
  return (
    <>
      <h1 className="sr-only">Puesta en marcha: Listo</h1>
      <Suspense fallback={<EsqueletoFormulario bloques={1} campos={1} />}>
        <Listo id={id} />
      </Suspense>
    </>
  )
}

async function Listo({ id }: { id: string }) {
  await connection()
  const abierta = await abrirLaPuestaEnMarcha(id)
  if (abierta.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierta} />
  }
  const { origen } = abierta
  if (!origen.uso.formulaPublicada && pasoPendiente(abierta.estado) !== 'listo') {
    redirigir(rutaDeLaPuestaEnMarcha(id))
  }
  return (
    <MarcoDelPaso abierta={abierta} paso="listo">
      {origen.uso.formulaPublicada ? (
        <EstadoVacio
          Icono={CircleCheckIcon}
          titulo={`${origen.nombre} ya cotiza.`}
          descripcion="Su fórmula está activa: ya se cotiza con ella."
          accion={
            <Link
              href={rutaDeLaHoja({ origen: id, lead: null }) as Route}
              className={`${buttonVariants({ size: 'lg' })} min-h-11 w-full md:min-h-9 md:w-auto`}
            >
              {`Cotizar con ${origen.nombre}`}
            </Link>
          }
        />
      ) : (
        <EstadoVacio
          titulo="Falta publicar la fórmula."
          descripcion={MOTIVO_DEL_PASO.publicar}
          accion={
            <Link
              href={rutaDelOrigen(id) as Route}
              className={buttonVariants({ variant: 'outline' })}
            >
              Ir a la página del origen
            </Link>
          }
        />
      )}
    </MarcoDelPaso>
  )
}
