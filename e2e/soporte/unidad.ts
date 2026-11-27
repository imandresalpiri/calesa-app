// El ayudante de los e2e de la unidad de logística: abre la sección de un hueco sea cual sea el lugar. En su página cada hueco vive en el drawer de su tarjeta (`?hueco=<tarjeta>`);
// en un drawer (gastos, ítem), en secciones a la vista. No mide nada: lo puede usar un spec sin celular.
import { expect, type Locator, type Page } from '@playwright/test'

// La tarjeta que contiene cada hueco (`TARJETA_DEL_HUECO` de `logistica`): gastos, pagos y margen están en «Dinero».
const TARJETA_DEL_HUECO: Readonly<Record<string, string>> = {
  gastos: 'dinero',
  pagos: 'dinero',
  margen: 'dinero',
}

/**
 * Abre la sección de ese hueco: en la página toca su tarjeta (abre el drawer); en un drawer lleva su sección a la vista (su contenido se monta al acercarse). Devuelve el contenido
 * del hueco (`[data-hueco=<clave>]`). Espera a que el hueco exista (con permiso y regla) antes de decidir el lugar.
 */
export async function abrirSeccionDeLaUnidad(page: Page, clave: string): Promise<Locator> {
  const ancla = page.locator(`[data-bloque-del-hueco="${clave}"]`).first()
  await ancla.waitFor({ state: 'attached' })
  const hueco = page.locator(`[data-hueco="${clave}"]`)
  const tarjeta = TARJETA_DEL_HUECO[clave] ?? clave
  const toque = page.locator(`[data-slot="panel-de-la-unidad"] [data-abre-tarjeta="${tarjeta}"]`)
  if ((await toque.count()) > 0) {
    // Un toque antes de que la página hidrate se pierde (la tarjeta viene del servidor): se repite hasta que el drawer muestre el hueco.
    await expect(async () => {
      if (!(await hueco.isVisible())) await toque.click()
      await expect(hueco).toBeVisible({ timeout: 1000 })
    }).toPass()
  } else {
    // Secciones a la vista: el hueco se monta al acercarse.
    await ancla.scrollIntoViewIfNeeded()
  }
  return hueco
}

/** ¿La página (la ventana) se desplaza en vertical? Falso cuando todo cabe en la pantalla. */
export const sinDesplazarLaPagina = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)
