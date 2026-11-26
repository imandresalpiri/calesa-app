// Lo que mide la geometría de la XCell en el banco (`e2e/xcell-geometria.spec.ts`): las cajas de cada celda, su alto y el rótulo que flota.
import { expect, type Page } from './prueba'

// Las cajas de cada celda: ninguna se encima con otra, ninguna se sale de la celda, dos controles quedan a 4 px o más (el contorno del foco
// ocupa 4) y el orden visual (de arriba abajo y, en una fila, de izquierda a derecha) es el del DOM.
export const problemasDeCaja = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const problemas: string[] = []
    const nombre = (e: Element) => e.getAttribute('aria-label') ?? e.textContent.trim().slice(0, 24)
    const esControl = (e: Element) => ['BUTTON', 'INPUT'].includes(e.tagName)
    // Lo que dice el par (a, b), en el orden del DOM; vacío si está bien.
    const juzgar = (a: Element, b: Element): string => {
      const ca = a.getBoundingClientRect()
      const cb = b.getBoundingClientRect()
      const ancho = Math.min(ca.right, cb.right) - Math.max(ca.left, cb.left)
      const alto = Math.min(ca.bottom, cb.bottom) - Math.max(ca.top, cb.top)
      if (ancho > 1 && alto > 1) return 'se encima con'
      const aparte = Math.max(
        cb.left - ca.right,
        ca.left - cb.right,
        cb.top - ca.bottom,
        ca.top - cb.bottom,
      )
      if (esControl(a) && esControl(b) && aparte < 4)
        return `queda a ${String(Math.round(aparte))} px (el contorno del foco lo tocaría) de`
      const mismaFila = cb.top < ca.bottom - 1 && cb.bottom > ca.top + 1
      const antes = cb.top < ca.top - 1 && !mismaFila
      return antes || (mismaFila && cb.left < ca.left - 1)
        ? 'se lee antes en el DOM y después en la pantalla que'
        : ''
    }
    for (const celda of document.querySelectorAll('[data-xcell]')) {
      const marco = celda.getBoundingClientRect()
      const hitos = [
        ...celda.querySelectorAll(
          '[id$="e"], [data-parada="10"], [data-parada="11"], [data-parada="12"], [data-parada="13"], :scope > button, :scope > input, :scope > p',
        ),
      ]
      hitos.forEach((a, i) => {
        const ca = a.getBoundingClientRect()
        const donde = `${nombre(celda)} › «${nombre(a)}»`
        if (ca.left < marco.left - 0.5 || ca.right > marco.right + 0.5)
          problemas.push(`${donde} se sale de su celda`)
        for (const b of hitos.slice(i + 1)) {
          const dicho = juzgar(a, b)
          if (dicho !== '') problemas.push(`${donde} ${dicho} «${nombre(b)}»`)
        }
      })
    }
    return problemas
  })

// El alto de cada celda del banco (al medio píxel): el mismo en todo estado (abrir, cancelar, confirmar, un aviso, un error). Sólo lo cambian la letra,
// el puntero y el ancho de la celda.
export const altos = (page: Page): Promise<Record<string, number>> =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('[data-caso]')].map((caso) => [
        caso.getAttribute('data-caso') ?? '',
        Math.round((caso.querySelector('[data-xcell]')?.getBoundingClientRect().height ?? 0) * 2) /
          2,
      ]),
    ),
  )

// Con la entrada abierta el rótulo flota: sube y queda en tres cuartos (por `transform`: se espera a que termine la transición).
export async function rotuloFlota(page: Page, caso: string): Promise<void> {
  await expect
    .poll(() =>
      page.locator(`[data-caso="${caso}"] [id$="e"]`).evaluate((e) => getComputedStyle(e).scale),
    )
    .toBe('0.75')
}
