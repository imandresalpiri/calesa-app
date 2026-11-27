import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { leerFormulasDelOrigen } from '@/modules/cotizaciones'
import { SeccionDeLaPlantilla } from '@/modules/cotizaciones/pantallas/plantilla'
import { LienzoDeLaPlantillaDiferido } from '@/modules/cotizaciones/pantallas/tarjeta-plantilla'
import { puede } from '@/shared/lib/permisos'
import { Aviso } from '@/shared/ui/aviso'
import { NoSeAbre } from '../../no-se-abre'
import { EsqueletoDeLaTarjeta } from '../../(pestanas)/tarjeta/esqueleto-de-la-tarjeta'
import { leerReferenciaDeLaTarjeta } from '../../(pestanas)/tarjeta/referencia'
import { abrirLaPuestaEnMarcha } from '../abrir'
import { MarcoDelPaso, PasoSinPermiso, conPermiso } from '../marco-del-paso'
import { SinFormula } from '../sin-formula'
import { Seguir } from '../seguir'
import { ocultoEnElLive } from '../../../../../_live/guarda'

export const metadata: Metadata = { title: 'Puesta en marcha: Tarjeta' }

const SIN_PLANILLA_POR_OMISION =
  'La fórmula trae la tarjeta por omisión. La editas cuando su planilla esté publicada, en la pestaña «Tarjeta» de la fórmula.'
const SIN_PLANILLA_COPIADA = 'La fórmula trae la tarjeta de la copia.'

// Paso 5: la tarjeta de la fórmula de trabajo, como en su pestaña «Tarjeta». Mientras la planilla no esté publicada no se edita: la fórmula ya trae una
// (la por omisión o la de la copia) y se sigue con ella.
export default async function PasoTarjeta({
  params,
}: PageProps<'/configuracion/origenes/[id]/puesta-en-marcha/tarjeta'>) {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const { id } = await params
  return (
    <>
      <h1 className="sr-only">Puesta en marcha: Tarjeta</h1>
      <Suspense fallback={<EsqueletoDeLaTarjeta />}>
        <Tarjeta id={id} />
      </Suspense>
    </>
  )
}

// Sólo se lee si la planilla no está publicada: la lista dice si la fórmula se copió de otro origen.
async function SinPlanilla({ origenId, formulaId }: { origenId: string; formulaId: string }) {
  const lista = await leerFormulasDelOrigen(origenId)
  const copiada =
    lista.ok && lista.data.formulas.some((f) => f.id === formulaId && f.copiadaDeOtroOrigen)
  return <Aviso tono="info">{copiada ? SIN_PLANILLA_COPIADA : SIN_PLANILLA_POR_OMISION}</Aviso>
}

async function Tarjeta({ id }: { id: string }) {
  await connection()
  const abierta = await abrirLaPuestaEnMarcha(id)
  if (abierta.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierta} />
  }
  if (!conPermiso(abierta, 'tarjeta')) {
    return (
      <MarcoDelPaso abierta={abierta} paso="tarjeta">
        <PasoSinPermiso abierta={abierta} paso="tarjeta" />
      </MarcoDelPaso>
    )
  }
  const formula = abierta.formulaDeTrabajo
  const { sesion } = abierta
  const { nombre, activo } = abierta.origen
  return (
    <MarcoDelPaso abierta={abierta} paso="tarjeta">
      {formula === null ? (
        <SinFormula origenId={id} />
      ) : (
        <SeccionDeLaPlantilla
          origen={{ id, nombre, activo }}
          formula={formula}
          referencia={leerReferenciaDeLaTarjeta(id, sesion.permisos)}
          Lienzo={LienzoDeLaPlantillaDiferido}
          puedeCambiarElLogo={puede(sesion.permisos, 'empresa.ajustes.gestionar')}
          sinPlanilla={<SinPlanilla origenId={id} formulaId={formula.id} />}
        />
      )}
      <Seguir origenId={id} paso="tarjeta" estado={abierta.estado} />
    </MarcoDelPaso>
  )
}
