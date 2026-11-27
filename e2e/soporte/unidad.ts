// El ayudante de los e2e de la unidad de logística: abre la sección de un hueco sea cual sea el lugar. Cada hueco vive en el drawer de su tarjeta: `?hueco=<tarjeta>` en su página,
// `?seccion=<tarjeta>` en el drawer de gastos y en el panel del ítem. «Qué falta» está siempre a la vista. No mide nada: lo puede usar un spec sin celular.
import { expect, type Locator, type Page } from '@playwright/test'

// La tarjeta que contiene cada hueco (`TARJETA_DEL_HUECO` de `logistica`): gastos, pagos y margen están en «Dinero».
const TARJETA_DEL_HUECO: Readonly<Record<string, string>> = {
  gastos: 'dinero',
  pagos: 'dinero',
  margen: 'dinero',
}

/**
 * Abre la sección de ese hueco: toca su tarjeta (abre el drawer), cerrando antes con Escape el de otra tarjeta si quedó abierto (como haría una persona: la tarjeta está debajo).
 * «Qué falta» se trae a la vista. Devuelve el contenido del hueco (`[data-hueco=<clave>]`). Espera a que el hueco exista (con permiso y regla) antes de decidir el lugar.
 */
export async function abrirSeccionDeLaUnidad(page: Page, clave: string): Promise<Locator> {
  const ancla = page.locator(`[data-bloque-del-hueco="${clave}"]`).first()
  await ancla.waitFor({ state: 'attached' })
  const hueco = page.locator(`[data-hueco="${clave}"]`)
  // El drawer de la tarjeta ya muestra el hueco cuando aparece su ancla adentro, aunque el hueco todavía lea (su esqueleto no lleva `data-hueco`).
  const abierto = page.locator(`[role="dialog"] [data-bloque-del-hueco="${clave}"]`)
  const tarjeta = TARJETA_DEL_HUECO[clave] ?? clave
  const toque = page.locator(`[data-slot="panel-de-la-unidad"] [data-abre-tarjeta="${tarjeta}"]`)
  if ((await toque.count()) > 0) {
    // Un toque antes de que la página hidrate se pierde (la tarjeta viene del servidor): se repite hasta que el drawer muestre el hueco.
    const otro = page.locator(
      `[role="dialog"] [data-bloque-del-hueco]:not([hidden]):not([data-bloque-del-hueco="${clave}"]):not([data-bloque-del-hueco="que-falta"])`,
    )
    await expect(async () => {
      if (await abierto.isVisible()) return
      if ((await otro.count()) > 0 && (await otro.first().isVisible())) {
        await page.keyboard.press('Escape')
        await expect(otro.first()).toBeHidden({ timeout: 1000 })
      }
      await toque.click({ timeout: 1000 })
      await expect(abierto).toBeVisible({ timeout: 1000 })
    }).toPass()
  } else {
    // «Qué falta» (o un hueco sin tarjeta): a la vista.
    await ancla.scrollIntoViewIfNeeded()
  }
  return hueco
}

/** ¿La página (la ventana) se desplaza en vertical? Falso cuando todo cabe en la pantalla. */
export const sinDesplazarLaPagina = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)
