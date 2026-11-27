import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarLogistica, sembrarLogistica, type TerrenoDeLogistica } from './soporte/logistica'

// El panel de la unidad de logística (6.01-2), en su propia página: con `logistica.ver` y `vehiculos.ver` del origen se ve el título, el origen, la fase y los días en ella; con sólo
// `vehiculos.ver` (la RLS de `vehiculos` lee con ésa) el panel dice que no hay permiso; una unidad que no existe, el estado «ya no está disponible». Los huecos de las áreas
// los prueba el spec de cada una; la cadena y las tarjetas, `logistica-unidad-cadena-y-tarjetas.spec.ts`.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeLogistica

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarLogistica(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-logistica-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Logística',
  })
  terreno = await sembrarLogistica(proyecto)
})

test.afterAll(async () => {
  await borrarLogistica(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('con logistica.ver ve la unidad: título, origen, fase y días en la fase', async ({ page }) => {
  await entrar(page, terreno.conLogistica, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enFase.id}`)
  await expect(page.getByRole('heading', { name: terreno.enFase.titulo })).toBeVisible()
  // El origen lo dice la cabecera de la unidad y lo marca la barra de Logística.
  await expect(
    page.locator('[data-slot="cabecera-de-la-unidad"]:visible').getByText(terreno.origen.nombre),
  ).toBeVisible()
  await expect(
    page
      .getByRole('navigation', { name: 'Orígenes' })
      .getByRole('link', { name: terreno.origen.nombre }),
  ).toHaveAttribute('aria-current', 'page')
  const cabecera = page.locator('[data-slot="cabecera-de-la-unidad"]')
  await expect(cabecera.getByText(terreno.fase.nombre)).toBeVisible()
  await expect(cabecera.getByText('Desde hace 3 días en esta fase')).toBeVisible()
  // La ficha completa se abre tocando la cabecera (`?ver=ficha`), no con un enlace aparte.
  await expect(page.getByRole('link', { name: 'Abrir ficha' })).toHaveCount(0)
  await expect(
    cabecera.getByRole('button', { name: `Ver la ficha de ${terreno.enFase.titulo}` }),
  ).toBeVisible()
  // El flujo del origen se leyó (`leerFlujoDeOrigen`, primera vez contra la base): sin aviso de que no se pudo.
  await expect(page.getByText(/No pudimos leer el flujo/)).toHaveCount(0)
})

test('una unidad sin fase dice «Sin fase» y no cuenta días', async ({ page }) => {
  await entrar(page, terreno.conLogistica)
  await page.goto(`/logistica/vehiculo/${terreno.sinFase.id}`)
  await expect(page.getByRole('heading', { name: terreno.sinFase.titulo })).toBeVisible()
  // Lo dice la cabecera; la cadena también lo muestra como su nodo actual.
  const cabecera = page.locator('[data-slot="cabecera-de-la-unidad"]')
  await expect(cabecera.getByText('Sin fase', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sin fase, actual' })).toBeVisible()
  await expect(page.getByText(/en esta fase/)).toHaveCount(0)
})

test('con sólo vehiculos.ver el panel dice que no tiene permiso', async ({ page }) => {
  await entrar(page, terreno.sinLogistica, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enFase.id}`)
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByText(terreno.enFase.titulo)).toHaveCount(0)
})

test('una unidad que no existe, o un id que no es válido, dice que ya no está disponible', async ({
  page,
}) => {
  await entrar(page, terreno.conLogistica, { fresco: true })
  for (const id of ['00000000-0000-4000-8000-000000000000', 'no-es-un-id']) {
    await page.goto(`/logistica/vehiculo/${id}`)
    await expect(page.getByText('Este vehículo ya no está disponible')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ir a Logística' })).toBeVisible()
  }
})

// `/logistica` dibuja la gráfica de la cadena y ningún panel: abrir un vehículo es ir a su página, nunca un drawer.
test('/logistica dibuja la gráfica de la cadena y ningún panel', async ({ page }) => {
  await entrar(page, terreno.conLogistica, { fresco: true })
  await page.goto('/logistica')
  await expect(page.locator(`a[data-fase="${terreno.fase.id}"]`)).toHaveAttribute(
    'aria-label',
    `${terreno.fase.nombre}: 1 vehículo`,
  )
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('con sólo vehiculos.ver ni /logistica ni la lista de una fase muestran la unidad', async ({
  page,
}) => {
  await entrar(page, terreno.sinLogistica, { fresco: true })
  await page.goto('/logistica')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.locator(`a[data-fase="${terreno.fase.id}"]`)).toHaveCount(0)
  await page.goto(`/logistica/fase/${terreno.fase.id}?origen=${terreno.origen.id}`)
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByText(terreno.enFase.titulo)).toHaveCount(0)
})
