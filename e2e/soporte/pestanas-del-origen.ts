import { expect, type Page, type Request } from '@playwright/test'

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

// La Server Action que recuerda la pestaña abierta (`recordarLaPestana`, sus argumentos llevan `parte`): sale sola al montar las pestañas, sin esperar, y puede
// caer después de que un spec empiece a contar los pedidos de lo que prueba. Esos conteos la descartan con esto.
export const esLaQueRecuerdaLaPestana = (pedido: Request): boolean =>
  (pedido.postData() ?? '').includes('"parte":')
