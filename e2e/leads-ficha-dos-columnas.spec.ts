import { expect, test, type Locator, type Page } from './soporte/prueba'
import { formatearNumero } from '../src/shared/lib/formato'
import { entrar } from './soporte/alta'
import { esMovil } from './soporte/inventario'
import { esperarFichaHidratada, irAFicha, tituloDeLaFicha } from './soporte/leads-ficha'
import { leadCompleto, limpiarLeadsCompletos } from './soporte/leads-ficha-completa'
import { prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { drawerDeTodos, verTodosLosSeguimientos } from './soporte/leads-seguimientos'
import { PRESUPUESTO_DE_LA_FICHA_EN_KB } from './soporte/presupuestos'
import { capturar } from './soporte/recorrido'

// La ficha del lead en dos columnas (T33): todo a la vista sin un clic (sin pestañas ni acordeones), el índice que salta a cada bloque y
// marca el actual, los enlaces de siempre (`?seccion=`, `?panel=`) que llevan a su bloque o abren lo suyo, la forma en escritorio (dos
// columnas) y en el celular (una, en el orden del índice), «Ver todos» y el documento de la ficha entera: igual con 10 que con 1.000.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
const MARCA = 'E2E 2col'

test.beforeAll(async ({}, info) => {
  test.setTimeout(180_000)
  t = await prepararListado(`${info.project.name}-2col`)
})

test.afterAll(async () => {
  await limpiarLeadsCompletos(t, MARCA)
})

let completo: Awaited<ReturnType<typeof leadCompleto>>

const indice = (page: Page): Locator => page.getByRole('navigation', { name: 'Índice de la ficha' })
const titulo = (page: Page, nombre: string): Locator =>
  page.getByRole('heading', { name: nombre, exact: true, level: 2 })
const BLOQUES = [
  ['Seguimiento', 'Seguimiento'],
  ['Cotizaciones', 'Cotizaciones'],
  ['Vehículos', 'Vehículos'],
  ['Oportunidades', 'Oportunidades'],
] as const

test('todo a la vista sin un clic: la izquierda, el índice y los cuatro bloques; sin pestañas ni acordeones', async ({
  page,
}, info) => {
  test.setTimeout(90_000)
  completo = await leadCompleto(t, MARCA, `Completo ${info.project.name}`, 10)
  await entrar(page, t.personas.duena)
  await irAFicha(page, completo.id)
  await expect(tituloDeLaFicha(page, completo.nombre)).toBeVisible()
  for (const nombre of ['Datos', 'Quién lo tiene', 'Acceso al portal']) {
    await expect(titulo(page, nombre)).toBeAttached()
  }
  await expect(indice(page).getByRole('link')).toHaveText(BLOQUES.map(([etiqueta]) => etiqueta))
  for (const [, nombre] of BLOQUES) {
    await titulo(page, nombre).scrollIntoViewIfNeeded()
    await expect(titulo(page, nombre)).toBeVisible()
  }
  // Lo que hay en cada uno, sin abrir nada: los 3 últimos seguimientos, los vínculos y el portal.
  await expect(
    page.getByRole('region', { name: 'Seguimientos', exact: true }).getByRole('article'),
  ).toHaveCount(3)
  await expect(verTodosLosSeguimientos(page)).toBeVisible()
  await expect(page.getByRole('region', { name: 'Vinculado', exact: true })).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Acceso al portal' }).getByText(/^Tiene acceso desde /),
  ).toBeVisible()
  await expect(page.locator('main details')).toHaveCount(0)
  await expect(page.getByRole('tablist')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Secciones del lead' })).toHaveCount(0)
  await page.evaluate(() => {
    window.scrollTo(0, 0)
  })
  await capturar(page, info, 'ficha-dos-columnas')
})

test('el índice salta a cada bloque: su título queda enfocado y a la vista, y su enlace marcado', async ({
  page,
}) => {
  await entrar(page, t.personas.duena)
  await irAFicha(page, completo.id)
  await esperarFichaHidratada(page)
  for (const [etiqueta, nombre] of BLOQUES) {
    const enlace = indice(page).getByRole('link', { name: etiqueta })
    await enlace.click()
    await expect(titulo(page, nombre)).toBeFocused()
    await expect(titulo(page, nombre)).toBeInViewport()
    await expect(enlace).toHaveAttribute('aria-current', 'location')
    // El índice sigue a la vista (pegajoso) y la página no se ensancha.
    await expect(indice(page)).toBeInViewport()
  }
})

test('los enlaces de siempre: `?seccion=` lleva a su bloque y `?panel=` abre lo suyo', async ({
  page,
}) => {
  await entrar(page, t.personas.duena)
  const casos = [
    ['seguimientos', 'Seguimiento'],
    ['vehiculos', 'Vehículos'],
    ['oportunidades', 'Oportunidades'],
    ['portal', 'Acceso al portal'],
  ] as const
  for (const [seccion, nombre] of casos) {
    await irAFicha(page, completo.id, `?seccion=${seccion}`)
    await expect(titulo(page, nombre)).toBeFocused()
    await expect(titulo(page, nombre)).toBeInViewport()
  }
  await irAFicha(page, completo.id, '?seccion=seguimientos&panel=anotar-seguimiento')
  await expect(page.getByRole('dialog', { name: 'Anotar seguimiento' })).toBeVisible()
})

test('la forma: en escritorio, «Datos» a la izquierda de los bloques; en el celular, una columna en el orden del índice', async ({
  page,
}, info) => {
  await entrar(page, t.personas.duena)
  await irAFicha(page, completo.id)
  await esperarFichaHidratada(page)
  const caja = async (localizador: Locator) => {
    const medida = await localizador.boundingBox()
    if (!medida) {
      throw new Error('sin caja')
    }
    return medida
  }
  const datos = await caja(titulo(page, 'Datos'))
  const seguimientos = await caja(titulo(page, 'Seguimiento'))
  if (esMovil(page)) {
    const orden = [
      page.getByRole('heading', { level: 1 }),
      titulo(page, 'Datos'),
      titulo(page, 'Acceso al portal'),
      indice(page),
      ...BLOQUES.map(([, nombre]) => titulo(page, nombre)),
    ]
    const alturas: number[] = []
    for (const localizador of orden) {
      const medida = await localizador.evaluate(
        (e) => e.getBoundingClientRect().top + window.scrollY,
      )
      alturas.push(medida)
    }
    expect(alturas).toEqual([...alturas].sort((a, b) => a - b))
    await capturar(page, info, 'ficha-celular')
  } else {
    expect(datos.x + datos.width).toBeLessThanOrEqual(seguimientos.x)
    expect(Math.abs(datos.y - seguimientos.y)).toBeLessThan(400)
  }
  // Ninguna de las dos formas ensancha la página.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('«Ver todos» abre la línea completa en su drawer (`?todos=`) y Esc lo cierra', async ({
  page,
}) => {
  await entrar(page, t.personas.duena)
  await irAFicha(page, completo.id)
  await esperarFichaHidratada(page)
  await verTodosLosSeguimientos(page).click()
  await expect(page).toHaveURL(/todos=seguimientos/)
  const drawer = drawerDeTodos(page)
  await expect(drawer.getByRole('article')).toHaveCount(10)
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(page).not.toHaveURL(/todos=/)
  await expect(verTodosLosSeguimientos(page)).toBeFocused()
})

test('el documento de la ficha entera pesa lo mismo con 10 que con 1.000 seguimientos, recordatorios y oportunidades', async ({
  page,
}, info) => {
  test.setTimeout(120_000)
  const conMil = await leadCompleto(t, MARCA, `Mil ${info.project.name}`, 1000)
  await entrar(page, t.personas.duena)
  const documento = async (ruta: string) =>
    ((await (await page.goto(ruta))?.body())?.length ?? 0) as number
  const base = await documento('/perfil')
  const deDiez = (await documento(`/leads/${completo.id}`)) - base
  const deMil = (await documento(`/leads/${conMil.id}`)) - base
  const kb = (bytes: number) => formatearNumero(bytes / 1024, { decimales: 1 })
  const resumen = `la ficha entera aporta ${kb(deDiez)} KB con 10 y ${kb(deMil)} KB con 1.000 (presupuesto ${String(PRESUPUESTO_DE_LA_FICHA_EN_KB)})`
  console.warn(`[ficha entera] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'KB de la ficha entera', description: resumen })
  expect(deDiez).toBeLessThan(PRESUPUESTO_DE_LA_FICHA_EN_KB * 1024)
  expect(deMil).toBeLessThanOrEqual(deDiez + 2 * 1024)
})
