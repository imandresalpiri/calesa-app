import { expect, type Page } from '@playwright/test'

export type PestanaDelOrigenEnE2e =
  'Fases' | 'Planilla' | 'Hoja' | 'Tarjeta' | 'Campos' | 'Categorías'

// El nombre accesible de una pestaña del origen: su título y, si tiene algo pendiente (el ⚠), «. <lo que falta>» detrás («Planilla. Sin fórmula activa: no se
// puede cotizar»). Buscarla por nombre exacto cae cuando tiene aviso: va con esto.
export function nombreDeLaPestana(titulo: PestanaDelOrigenEnE2e): RegExp {
  return new RegExp(`^${titulo}(\\.|$)`)
}

// La pestaña `titulo` de la página de un origen (`/configuracion/origenes/<id>/<parte>`).
export function pestanaDelOrigen(
  page: Page,
  titulo: PestanaDelOrigenEnE2e,
  { includeHidden = false } = {},
) {
  return page.getByRole('tab', { name: nombreDeLaPestana(titulo), includeHidden })
}

// La página de un origen ya dibujada con `titulo` abierta: su h1 es el nombre del origen y la pestaña abierta va marcada. Con `?panel=` el modal puede montarse
// antes de mirar y deja la página detrás con `aria-hidden`: `includeHidden` la mira igual.
export async function enLaPestana(
  page: Page,
  titulo: PestanaDelOrigenEnE2e,
  { includeHidden = false }: { includeHidden?: boolean } = {},
) {
  await expect(
    page.getByRole('tab', { name: nombreDeLaPestana(titulo), selected: true, includeHidden }),
  ).toBeVisible()
}
