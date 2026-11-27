import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarPersonasDePrueba, borrarRolesDePrueba } from './soporte/base'
import { capturar } from './soporte/recorrido'
import {
  anchoDeLaBarra,
  arrastrar,
  barridoDeAlto,
  centro,
  elegirCelda,
  lienzo,
  limpiarTerrenoDeArrastrar,
  prepararTerrenoDeArrastrar,
  quieto,
  type TerrenoDeArrastrar,
} from './soporte/tarjeta-arrastrar'
import { abrirElPanel, elegirLaEscala } from './soporte/plantilla'
import { abrirLaFormula } from './soporte/rutas-de-la-formula'

// El editor de la tarjeta queda quieto tras arrastrar un borde (`docs/LECCIONES.md` › Interfaz): con «Ajustar» la escala depende del ancho del lienzo y el alto de la
// página, de la escala; si la barra de la página o la del marco cambian el ancho medido, la escala, el alto y la barra entran en un ciclo de pocos píxeles. Tras
// arrastrar el borde de una columna, el asa de una fila o cambiar su alto, con «Ajustar», con «100 %» y con otro ancho de ventana: en cada alto de ventana de la banda
// donde la barra aparece o no, el lienzo no cambia de tamaño; durante 2 s, cada 100 ms, tampoco; y un clic elige una casilla.
test.describe.configure({ mode: 'serial' })

// El editor no existe bajo 1.024 px (un aviso y la tarjeta en sólo lectura) y el celular superpone sus barras, que no restan ancho: ahí el ciclo no puede pasar.
// Como `leads-tabla-ancha.spec.ts`, se salta en el celular en vez de marcarse sin celular: mide la disposición y cambia la ventana, y la guarda de
// `e2e/soporte/sin-celular.ts` no deja hacer eso a un spec marcado.
test.skip(
  ({ isMobile }) => isMobile,
  'El editor de la tarjeta es de escritorio y el celular superpone sus barras.',
)

// El Chromium sin interfaz de Playwright esconde las barras (`--hide-scrollbars`): sin ellas el ciclo no existe y la prueba no prueba nada.
test.use({
  launchOptions: {
    ignoreDefaultArgs: ['--hide-scrollbars'],
    args: ['--disable-features=OverlayScrollbar,FluentOverlayScrollbar'],
  },
})

let terreno: TerrenoDeArrastrar | undefined

const t = () => {
  if (!terreno) throw new Error('No hay terreno.')
  return terreno
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  terreno = await prepararTerrenoDeArrastrar(info.project.name)
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  limpiarTerrenoDeArrastrar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const anchoDeColumna = (page: Page, id: string) =>
  page.locator(`[data-cabecera-de-columna="${id}"] [data-ancho-de-columna]`)
const asa = (page: Page, id: string) => page.locator(`[data-asa-de-fila="${id}"] button`)

async function abrirElEditor(page: Page) {
  await entrar(page, t().configuradora, { fresco: true })
  await abrirLaFormula(page, t().origen.id, 'tarjeta')
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
  await expect(lienzo(page)).toBeVisible()
}

async function arrastrarLaColumna(page: Page, id: string, dx: number) {
  const antes = await anchoDeColumna(page, id).textContent()
  const borde = `[data-borde-de-columna="${id}"]`
  await page.locator(borde).scrollIntoViewIfNeeded()
  const desde = await centro(page, borde)
  await arrastrar(page, desde, { x: desde.x + dx, y: desde.y })
  await expect(anchoDeColumna(page, id)).not.toHaveText(antes ?? '')
}

// Lleva la fila `id` (en el lugar 3) al lugar de la fila `hasta`.
async function arrastrarLaFila(page: Page, id: string, hasta: string) {
  await expect(asa(page, id)).toHaveAccessibleName('Mover la fila 3')
  await asa(page, id).scrollIntoViewIfNeeded()
  const desde = await centro(page, `[data-asa-de-fila="${id}"] button`)
  const destino = await centro(page, `[data-asa-de-fila="${hasta}"] button`)
  await arrastrar(page, desde, destino)
  await expect(asa(page, id)).not.toHaveAccessibleName('Mover la fila 3')
}

// Tras soltar: la banda de alto de ventana, 2 s de muestras y un clic que elige.
async function quietoYElige(page: Page, donde: string) {
  await barridoDeAlto(page, donde)
  await quieto(page, donde)
  await elegirCelda(page, 1, 1)
}

test('E2E «Ajustar»: arrastrar el borde de una columna deja el lienzo quieto', async ({
  page,
}, info) => {
  test.setTimeout(120_000)
  await abrirElEditor(page)
  expect(
    await anchoDeLaBarra(page),
    'Sin barras de desplazamiento: esta prueba no prueba nada',
  ).toBeGreaterThanOrEqual(10)
  await elegirLaEscala(page, 'Ajustar')
  await arrastrarLaColumna(page, 'k2', 20)
  await capturar(page, info, 'ajustar-columna')
  await quietoYElige(page, 'Ajustar, tras la columna')
  // «Ajustar» deja lugar al borde de la última columna y el alto no tiene fracciones: el marco no saca barras propias.
  const marco = page.locator('[data-lienzo-marco]')
  expect(
    await marco.evaluate((m) => [m.scrollWidth - m.clientWidth, m.scrollHeight - m.clientHeight]),
  ).toEqual([0, 0])
})

test('E2E «Ajustar»: arrastrar una fila y cambiar su alto deja el lienzo quieto', async ({
  page,
}, info) => {
  test.setTimeout(120_000)
  await abrirElEditor(page)
  await arrastrarLaFila(page, 'f2', 'f5')
  await capturar(page, info, 'ajustar-fila')
  await quietoYElige(page, 'Ajustar, tras la fila')
  await asa(page, 'f2').click()
  const panel = await abrirElPanel(page, 'Fila')
  const alto = panel.getByLabel('Alto de la fila')
  await alto.fill('60')
  await alto.press('Enter')
  await expect(alto).toHaveValue('60')
  await quietoYElige(page, 'Ajustar, tras el alto de la fila')
})

test('E2E «100 %»: arrastrar una columna y una fila deja el lienzo quieto', async ({
  page,
}, info) => {
  test.setTimeout(120_000)
  await abrirElEditor(page)
  await elegirLaEscala(page, '100 %')
  await arrastrarLaColumna(page, 'k1', -30)
  await capturar(page, info, 'real-columna')
  await quietoYElige(page, '100 %, tras la columna')
  await arrastrarLaFila(page, 'f2', 'f5')
  await capturar(page, info, 'real-fila')
  await quietoYElige(page, '100 %, tras la fila')
})

test('E2E cambiar el ancho de la ventana deja el lienzo quieto', async ({ page }) => {
  test.setTimeout(120_000)
  await abrirElEditor(page)
  for (const ancho of [1180, 1320]) {
    const alto = page.viewportSize()?.height ?? 720
    await page.setViewportSize({ width: ancho, height: alto })
    await quietoYElige(page, `Ajustar, ventana de ${String(ancho)} px`)
  }
})
