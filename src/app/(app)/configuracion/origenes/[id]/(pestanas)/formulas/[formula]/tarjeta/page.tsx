import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SeccionDeLaPlantilla } from '@/modules/cotizaciones/pantallas/plantilla'
import { LienzoDeLaPlantillaDiferido } from '@/modules/cotizaciones/pantallas/tarjeta-plantilla'
import { puede } from '@/shared/lib/permisos'
import { NoSeAbre } from '../../../../no-se-abre'
import { abrirFormula } from '../abrir-formula'
import { EsqueletoDeLaTarjeta } from './esqueleto-de-la-tarjeta'
import { leerReferenciaDeLaTarjeta } from './referencia'

export const metadata: Metadata = { title: 'Tarjeta de la fórmula' }

// Configuración › Orígenes › un origen › Fórmulas › una fórmula › Tarjeta: la imagen que recibe el cliente (la plantilla de la tarjeta de la cotización), editada
// como un Excel sobre el lienzo, a todo el ancho: el lienzo es la vista previa (`?panel=publicar-tarjeta`, `descartar-plantilla`; `?lugar=` elige esa celda al
// abrir). La referencia del lienzo (la cotización más reciente del origen que quien configura ve) se pide aquí como promesa, sin esperarla: la sección la espera
// junto a la plantilla y la latencia es la de la más lenta.
export default async function PaginaDeLaTarjeta({
  params,
}: PageProps<'/configuracion/origenes/[id]/formulas/[formula]/tarjeta'>) {
  const pedida = await params
  return (
    <Suspense fallback={<EsqueletoDeLaTarjeta />}>
      <Tarjeta origenId={pedida.id} formulaId={pedida.formula} />
    </Suspense>
  )
}

async function Tarjeta({ origenId, formulaId }: { origenId: string; formulaId: string }) {
  const abierto = await abrirFormula(origenId, formulaId)
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  if (abierto.archivada) {
    return null
  }
  const { sesion } = abierto
  const { id, nombre, activo } = abierto.origen
  return (
    <SeccionDeLaPlantilla
      origen={{ id, nombre, activo }}
      formula={abierto.formula}
      referencia={leerReferenciaDeLaTarjeta(id, sesion.permisos)}
      Lienzo={LienzoDeLaPlantillaDiferido}
      puedeCambiarElLogo={puede(sesion.permisos, 'empresa.ajustes.gestionar')}
    />
  )
}
