import type { Metadata } from 'next'
import { Suspense } from 'react'
import { leerLaTarjetaDeLaFormula } from '@/modules/cotizaciones'
import { getTiposCambio } from '@/modules/empresa'
import { SeccionDeLaFormula } from '@/modules/cotizaciones/pantallas/formula'
import { TarjetaEnVivoDiferida } from '@/modules/cotizaciones/pantallas/tarjeta-formula'
import { puede } from '@/shared/lib/permisos'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { NoSeAbre } from '../../../../no-se-abre'
import { abrirFormula } from '../abrir-formula'

export const metadata: Metadata = { title: 'Planilla de la fórmula' }

// Configuración › Orígenes › un origen › Fórmulas › una fórmula › Planilla: qué se calcula. Arriba la publicada, el borrador y las versiones
// (`?panel=publicar-formula`, `revertir-formula&version=`, `descartar-borrador`); abajo la planilla con sus paneles en la URL; con `?fila=<id>`, esa fila
// elegida. A todo el ancho: al costado de la planilla van «Totales» y la tarjeta en vivo. La tarjeta de la fórmula (área `plantilla`) y los tipos de cambio de la
// empresa («Tipo de celda › Tipo de cambio») se piden aquí como promesas, sin esperarlas: la sección las espera junto a la fórmula, y el dibujo de la tarjeta (área
// `tarjeta`) entra por el hueco `TarjetaEnVivo`.
export default async function PaginaDeLaPlanilla({
  params,
}: PageProps<'/configuracion/origenes/[id]/formulas/[formula]/planilla'>) {
  const pedida = await params
  return (
    <Suspense fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
      <Planilla origenId={pedida.id} formulaId={pedida.formula} />
    </Suspense>
  )
}

async function Planilla({ origenId, formulaId }: { origenId: string; formulaId: string }) {
  const abierto = await abrirFormula(origenId, formulaId)
  if (abierto.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierto} />
  }
  if (abierto.archivada) {
    return null
  }
  const { id, nombre, activo } = abierto.origen
  const origen = { id, nombre, activo }
  return (
    <SeccionDeLaFormula
      origen={origen}
      formula={abierto.formula}
      tarjeta={leerLaTarjetaDeLaFormula(origen, abierto.formula.id)}
      TarjetaEnVivo={TarjetaEnVivoDiferida}
      tiposDeCambio={getTiposCambio().then((tipos) =>
        tipos.map(({ clave, nombre }) => ({ clave, nombre })),
      )}
      puedeCambiarTiposDeCambio={puede(abierto.sesion.permisos, 'empresa.tipos_cambio.gestionar')}
    />
  )
}
