import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { capturar } from './soporte/recorrido'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  borrarPorOrigen,
  sembrarPorOrigen,
  ultimoOrigenDe,
  type TerrenoPorOrigen,
} from './soporte/por-origen'

// Logística por origen (T571): arriba se elige el origen y todo lo de abajo es de ese origen. Elegir uno lo guarda y `/logistica` sin parámetro abre el último; las
// pestañas salen de las reglas del origen (A no usa Aduana); la página de un vehículo marca su origen sin recordarlo; un origen sin permiso lo dice; la barra no
// salta al cambiar de origen ni de pestaña.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoPorOrigen

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarPorOrigen(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-por-origen-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Por origen',
  })
  terreno = await sembrarPorOrigen(proyecto)
})

test.afterAll(async () => {
  await borrarPorOrigen(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const origenes = (page: Page) => page.getByRole('navigation', { name: 'Orígenes' })
const delOrigen = (page: Page, nombre: string) =>
  page.getByRole('navigation', { name: `Logística de ${nombre}` })
const barra = (page: Page) => page.locator('[data-barra-de-logistica]:visible')
// Lo primero que dibuja la página bajo la barra.
const primerBloque = (page: Page) => barra(page).locator('xpath=following-sibling::*[1]')

async function caja(lugar: Locator) {
  const medida = await lugar.boundingBox()
  expect(medida).not.toBeNull()
  return medida
}

test('E2E elegir un origen deja la cadena y la bandeja de ese origen, sin que la barra salte', async ({
  page,
}, info) => {
  const { a, b } = terreno
  await entrar(page, terreno.persona, { fresco: true })
  await page.goto(`/logistica?origen=${a.id}`)
  await expect(page.locator(`a[data-fase="${a.fase}"]:visible`)).toBeVisible()
  const barraEnA = await caja(barra(page))
  const bloqueEnA = await caja(primerBloque(page))

  // Se elige B: la URL lo dice y la cadena es la suya.
  await origenes(page).getByRole('link', { name: b.nombre }).click()
  await expect(page).toHaveURL(new RegExp(`/logistica\\?origen=${b.id}$`))
  await expect(page.locator(`a[data-fase="${b.fase}"]:visible`)).toBeVisible()
  await expect(page.locator(`a[data-fase="${a.fase}"]:visible`)).toHaveCount(0)
  await expect(origenes(page).getByRole('link', { name: b.nombre })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(await caja(barra(page))).toEqual(barraEnA)
  expect((await caja(primerBloque(page)))?.y).toBe(bloqueEnA?.y)
  await capturar(page, info, 'cadena-de-b')

  // La bandeja del día de B: su demorado, no el de A.
  await delOrigen(page, b.nombre).getByRole('link', { name: 'Bandeja del día' }).click()
  await expect(page).toHaveURL(new RegExp(`/logistica/bandeja\\?origen=${b.id}$`))
  const demorados = page.locator('section[data-grupo="demorados"]:visible')
  await expect(demorados.getByRole('link', { name: b.demorado.titulo }).first()).toBeVisible()
  await expect(demorados.getByText(a.demorado.titulo)).toHaveCount(0)
  expect(await caja(barra(page))).toEqual(barraEnA)
  expect((await caja(primerBloque(page)))?.y).toBe(bloqueEnA?.y)
  await capturar(page, info, 'bandeja-de-b')
})

test('E2E sin ?origen= se dibuja el último que eligió, sin redirigir', async ({ page }) => {
  const { b } = terreno
  await expect.poll(() => ultimoOrigenDe(terreno.persona)).toBe(b.id)
  await entrar(page, terreno.persona)
  await page.goto('/logistica')
  await expect(page).toHaveURL(/\/logistica$/)
  await expect(origenes(page).getByRole('link', { name: b.nombre })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page.locator(`a[data-fase="${b.fase}"]:visible`)).toBeVisible()
})

test('E2E un origen sin la regla de aduana no tiene Aduana y su URL lo dice', async ({ page }) => {
  const { a, b } = terreno
  await entrar(page, terreno.persona)
  await page.goto(`/logistica?origen=${b.id}`)
  await expect(delOrigen(page, b.nombre).getByRole('link', { name: 'Aduana' })).toBeVisible()
  await page.goto(`/logistica?origen=${a.id}`)
  await expect(delOrigen(page, a.nombre).getByRole('link', { name: 'Cadena' })).toBeVisible()
  await expect(delOrigen(page, a.nombre).getByRole('link', { name: 'Aduana' })).toHaveCount(0)
  await page.goto(`/logistica/aduana?origen=${a.id}`)
  await expect(page.getByText(`${a.nombre} no usa Aduana.`)).toBeVisible()
  await page.getByRole('link', { name: 'Ver la cadena' }).click()
  await expect(page).toHaveURL(new RegExp(`/logistica\\?origen=${a.id}$`))
  await expect(page.locator(`a[data-fase="${a.fase}"]:visible`)).toBeVisible()
})

test('E2E la página de un vehículo marca su origen, con sus pestañas y su ⚙, sin recordarlo', async ({
  page,
}, info) => {
  const { a, b } = terreno
  await expect.poll(() => ultimoOrigenDe(terreno.persona)).toBe(a.id)
  await entrar(page, terreno.persona)
  await page.goto(`/logistica/vehiculo/${b.demorado.id}`)
  await expect(page.getByRole('heading', { name: b.demorado.titulo })).toBeVisible()
  await expect(origenes(page).getByRole('link', { name: b.nombre })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(delOrigen(page, b.nombre).getByRole('link', { name: 'Aduana' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Configurar la logística' })).toHaveAttribute(
    'href',
    `/configuracion/origenes/${b.id}/fases`,
  )
  await capturar(page, info, 'vehiculo-de-b')
  // Entrar a un vehículo no es elegir un origen: `/logistica` sigue abriendo A.
  await page.goto('/logistica')
  await expect(origenes(page).getByRole('link', { name: a.nombre })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(await ultimoOrigenDe(terreno.persona)).toBe(a.id)
})

test('E2E un origen sin permiso lo dice con su nombre y el camino a uno propio', async ({
  page,
}) => {
  const { c } = terreno
  await entrar(page, terreno.persona)
  await page.goto(`/logistica?origen=${c.id}`)
  await expect(
    page.getByText(`No tienes permiso para ver la logística de ${c.nombre}.`),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /^Ir a E2E Por origen [AB] / })).toBeVisible()
  await expect(origenes(page).getByRole('link', { name: c.nombre })).toHaveCount(0)
})
