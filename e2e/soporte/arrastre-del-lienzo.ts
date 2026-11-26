// Arrastrar una pieza en el lienzo del editor de la hoja (docs/LECCIONES.md › «e2e (Playwright)»: `dragTo` suelta sin esperar la colisión del último paso):
// `mouse.down()` y `hover` en pasos, la marca de soltar con el estado esperado y recién entonces `mouse.up()`. No mide cajas: sirve a las pruebas sin celular.
import { expect, type Locator, type Page } from './prueba'

export type EstadoDeLaMarca = 'libre' | 'pisa' | 'se_sale' | 'no_admite' | 'apilada'

const elegir = (page: Page, pieza: string) => page.locator(`[data-elegir="${pieza}"]`)

// Dónde se toma la pieza (elegida, su «+» cae sobre el centro) y a cuánto de la esquina de arriba a la izquierda de lo que se arrastra está el punto que decide
// dónde cae (`puntoDe()` de `use-arrastre-de-la-hoja.ts`).
const AGARRE = { x: 12, y: 6 }
const DENTRO_DE_LA_ESQUINA = 8

// Lleva la pieza hasta que el punto que decide dónde cae quede en `en` de `destino` (sus coordenadas, cerca de su esquina de arriba a la izquierda), espera
// la marca y suelta.
export async function arrastrarEnElLienzo(
  page: Page,
  pieza: string,
  destino: Locator,
  { marca, en = { x: 6, y: 6 } }: { marca: EstadoDeLaMarca; en?: { x: number; y: number } },
): Promise<void> {
  await elegir(page, pieza).hover({ position: AGARRE })
  await page.mouse.down()
  // Lo bastante lejos para que empiece el arrastre (6 px).
  await elegir(page, pieza).hover({ position: { x: AGARRE.x + 28, y: AGARRE.y }, force: true })
  const puntero = {
    x: Math.max(0, en.x + AGARRE.x - DENTRO_DE_LA_ESQUINA),
    y: Math.max(0, en.y + AGARRE.y - DENTRO_DE_LA_ESQUINA),
  }
  await destino.hover({ position: puntero, force: true })
  await expect(page.locator(`[data-marca-de-soltar="${marca}"]`)).toBeVisible()
  await page.mouse.up()
}
