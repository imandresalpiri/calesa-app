// La planilla de la fórmula con un editor de verdad sobre una fórmula de prueba, para las pruebas de sus piezas (la cuadrícula, la barra). Quien la usa simula
// la action de guardar, `composicion.client` y los avisos (`vi.mock` vale sólo en su archivo) y le da a jsdom `scrollIntoView`.
import { render } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { useState } from 'react'
import type { FormulaParaEditar } from '../../../../entities/formula/edicion'
import {
  formulaDePrueba,
  type FilaDePrueba,
} from '../../../../entities/formula/fila-de-prueba.soporte'
import { UNIDAD_EN_CEROS } from '../../../../entities/formula/unidad-de-ejemplo'
import { useEditorDeLaFormula } from '../../hooks/use-editor-de-la-formula'
import { PlanillaDeLaFormula } from './planilla-de-la-formula'

export const ORIGEN_DE_PRUEBA = { id: '11111111-1111-4111-8111-111111111111', nombre: 'Japón' }

const leidaDe = (filas: readonly FilaDePrueba[]): FormulaParaEditar => ({
  id: '22222222-2222-4222-8222-222222222222',
  formulaDelOrigenId: '44444444-4444-4444-8444-444444444444',
  actualizadoEn: '2026-11-07T15:00:00.123456+00:00',
  estado: 'borrador',
  diseno: null,
  nota: null,
  formula: formulaDePrueba(filas),
})

function PlanillaDePrueba({ leida }: { leida: FormulaParaEditar }) {
  const editor = useEditorDeLaFormula({ origenId: ORIGEN_DE_PRUEBA.id, leida })
  const [unidad, setUnidad] = useState(UNIDAD_EN_CEROS)
  const [modo, setModo] = useState<string | null>(null)
  return (
    <PlanillaDeLaFormula
      editor={editor}
      diseno={null}
      origen={ORIGEN_DE_PRUEBA}
      formulaDelOrigenId={leida.formulaDelOrigenId}
      sobre="Sobre el borrador de Ana."
      estadoGuardado={null}
      unidad={unidad}
      alCambiarUnidad={setUnidad}
      modo={modo}
      alElegirModo={setModo}
      recargando={false}
      alRecargar={() => undefined}
      tarjeta={{ estado: 'sin_tarjeta' }}
      TarjetaEnVivo={() => null}
      NuevoColor={null}
      puedeCambiarTiposDeCambio={false}
      tiposDeCambio={[]}
    />
  )
}

export function dibujarLaPlanilla(filas: readonly FilaDePrueba[]) {
  const leida = leidaDe(filas)
  return render(
    <NuqsTestingAdapter>
      <PlanillaDePrueba leida={leida} />
    </NuqsTestingAdapter>,
  )
}

// Los ids de las filas en el orden dibujado.
export const filasDibujadas = () =>
  [...document.querySelectorAll<HTMLElement>('tr[data-fila]')].map((tr) => tr.dataset['fila'])

// La celda de una fila y una columna.
export function celdaDe(id: string, col: 'A' | 'B' | 'C' | 'D'): HTMLElement {
  const td = document.querySelector<HTMLElement>(`tr[data-fila="${id}"] [data-col="${col}"]`)
  if (td === null) throw new Error(`Falta la celda ${col} de «${id}».`)
  return td
}
