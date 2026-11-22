import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SeccionDelDiseno } from '@/modules/cotizaciones/pantallas/diseno'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { NoSeAbre } from '../../../../no-se-abre'
import { abrirFormula } from '../abrir-formula'

export const metadata: Metadata = { title: 'Hoja de la fórmula' }

// Configuración › Orígenes › un origen › Fórmulas › una fórmula › Hoja: cómo se ve y se llena la cotización (el diseño de la hoja). Con `?vista=412|1280|200`, la
// vista previa en vivo; desde `xl`, al costado.
export default async function PaginaDeLaHoja({
  params,
}: PageProps<'/configuracion/origenes/[id]/formulas/[formula]/hoja'>) {
  const pedida = await params
  return (
    <div className="grid max-w-6xl min-w-0 gap-4">
      <Suspense fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
        <Hoja origenId={pedida.id} formulaId={pedida.formula} />
      </Suspense>
    </div>
  )
}

async function Hoja({ origenId, formulaId }: { origenId: string; formulaId: string }) {
  const abierto = await abrirFormula(origenId, formulaId)
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  if (abierto.archivada) {
    return null
  }
  const { id, nombre, activo } = abierto.origen
  return <SeccionDelDiseno origen={{ id, nombre, activo }} formula={abierto.formula} />
}
