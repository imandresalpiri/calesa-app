import type { Page } from '@playwright/test'
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
  borrarBandeja,
  DEMORADAS,
  sembrarBandeja,
  type TerrenoDeLaBandeja,
} from './soporte/bandeja-del-dia'

// La bandeja del día de `/logistica/bandeja` (escritorio y celular): los grupos con su número (con tope), la acción a un toque de cada fila, «Ver todos» → la página del grupo → «Siguiente», «No la ganamos»
// con su «Deshacer», y quien sólo ve la logística con nada pendiente. Cada regla de la base (alcance, cursor, tope) ya tiene su prueba SQL: aquí se prueba que la pantalla las dice.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeLaBandeja

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarBandeja(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-bandeja-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Bandeja',
  })
  terreno = await sembrarBandeja(proyecto)
})

test.afterAll(async () => {
  await borrarBandeja(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const grupo = (page: Page, clave: string) => page.locator(`section[data-grupo="${clave}"]`)

test('E2E los grupos con su número y la acción de cada fila', async ({ page }, info) => {
  await entrar(page, terreno.quien.correo, { fresco: true })
  await page.goto(`/logistica/bandeja?origen=${terreno.origen.id}`)
  const demorados = grupo(page, 'demorados')
  await expect(demorados.getByRole('heading', { name: 'Demorados 21' })).toBeVisible()
  // La portada lee las primeras 5 de cada grupo.
  await expect(demorados.getByRole('listitem')).toHaveCount(5)
  await expect(grupo(page, 'trabados').getByRole('heading')).toContainText('21')
  await expect(
    grupo(page, 'por_aprobar').getByRole('heading', { name: 'Documentos por aprobar 1' }),
  ).toBeVisible()
  await expect(
    grupo(page, 'llegadas').getByRole('heading', { name: 'Llegadas esperadas 1' }),
  ).toBeVisible()
  await expect(
    grupo(page, 'sin_resolver').getByRole('heading', { name: 'Subastas sin resolver 1' }),
  ).toBeVisible()
  await capturar(page, info, 'portada')
  // Un grupo sin nada no se dibuja, y quien no sube documentos no ve «por vencer».
  await expect(grupo(page, 'salidas')).toHaveCount(0)
  await expect(grupo(page, 'por_vencer')).toHaveCount(0)

  // «Mover» lleva a la página de la unidad, donde «Qué falta» está abierto.
  await demorados.getByRole('link', { name: `Mover: ${terreno.conBl.titulo}` }).click()
  await expect(page).toHaveURL(new RegExp(`/logistica/vehiculo/${terreno.conBl.id}$`))
  await expect(page.getByRole('heading', { name: terreno.conBl.titulo })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Elegir el destino «Embarcado/ })).toBeVisible()

  // «Revisar» abre el bloque de documentos de entrada.
  await page.goto(`/logistica/bandeja?origen=${terreno.origen.id}`)
  await grupo(page, 'por_aprobar')
    .getByRole('link', { name: `Revisar: ${terreno.conBl.titulo}` })
    .click()
  await expect(page).toHaveURL(
    new RegExp(`/logistica/vehiculo/${terreno.conBl.id}\\?hueco=documentos$`),
  )
  // «Documentos» abre de entrada: en escritorio es la primera pestaña, en el celular el bloque abierto por `?hueco=`. Su hueco se ve sin tocar nada, con «Subir documentos» adentro (botón o encabezado).
  await expect(page.locator('[data-hueco="documentos"]')).toBeVisible()
  await expect(
    page.locator('[data-hueco="documentos"]').getByText('Subir documentos').first(),
  ).toBeVisible()
})

test('E2E «Ver todos» abre la página del grupo, de a 20 por cursor', async ({ page }, info) => {
  await entrar(page, terreno.quien.correo, { fresco: true })
  await page.goto(`/logistica/bandeja?origen=${terreno.origen.id}`)
  await grupo(page, 'demorados').getByRole('link', { name: 'Ver todos: Demorados' }).click()
  await expect(page).toHaveURL(
    new RegExp(`/logistica/bandeja/demorados\\?origen=${terreno.origen.id}$`),
  )
  await expect(
    page.getByRole('heading', { name: `Demorados · ${terreno.origen.nombre}`, level: 1 }),
  ).toBeVisible()
  // Sólo lo visible: al navegar de la portada, la pantalla anterior queda oculta en el DOM (una pantalla conserva su estado al volver).
  const filas = page.locator('main li:has(a[aria-label^="Mover:"])').filter({ visible: true })
  await expect(filas).toHaveCount(20)
  await capturar(page, info, 'grupo-demorados')
  await page.getByRole('link', { name: 'Siguiente' }).click()
  await expect(page).toHaveURL(new RegExp(`origen=${terreno.origen.id}&cursor=`))
  await expect(filas).toHaveCount(DEMORADAS - 20)
  // Un grupo que no existe y uno que no se ve lo dicen.
  await page.goto(`/logistica/bandeja/inventado?origen=${terreno.origen.id}`)
  await expect(page.getByText('Esa bandeja no existe.')).toBeVisible()
  await page.goto(`/logistica/bandeja/por-vencer?origen=${terreno.origen.id}`)
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
})

test('E2E «No la ganamos» se hace en la fila, con «Deshacer», y la fila sale', async ({ page }) => {
  await entrar(page, terreno.quien.correo, { fresco: true })
  await page.goto(`/logistica/bandeja?origen=${terreno.origen.id}`)
  const sinResolver = grupo(page, 'sin_resolver')
  await expect(
    sinResolver.getByRole('link', { name: terreno.sinResolver.titulo, exact: true }),
  ).toBeVisible()
  await expect(
    sinResolver.getByRole('link', { name: `La ganamos: ${terreno.sinResolver.titulo}` }),
  ).toHaveAttribute('href', `/logistica/vehiculo/${terreno.sinResolver.id}?ganada=si`)
  await sinResolver
    .getByRole('button', { name: `No la ganamos: ${terreno.sinResolver.titulo}` })
    .click()
  await expect(page.getByText('La marcaste como no ganada')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeVisible()
  await expect(grupo(page, 'sin_resolver')).toHaveCount(0)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await page.reload()
  await expect(
    grupo(page, 'sin_resolver').getByRole('link', {
      name: terreno.sinResolver.titulo,
      exact: true,
    }),
  ).toBeVisible()
})

test('E2E quien sólo ve la logística y no tiene nada pendiente ve «Nada pendiente hoy» con el camino a la cadena', async ({
  page,
}, info) => {
  await entrar(page, terreno.soloVer.correo, { fresco: true })
  await page.goto(`/logistica/bandeja?origen=${terreno.vacio.id}`)
  await expect(page.getByText('Nada pendiente hoy')).toBeVisible()
  await expect(page.getByText('No hay vehículos demorados ni documentos esperando.')).toBeVisible()
  await capturar(page, info, 'bandeja-vacia')
  // Sin los permisos de documentos, esos grupos ni se piden.
  await expect(grupo(page, 'por_aprobar')).toHaveCount(0)
  // «Ver la cadena» lleva a la Cadena del mismo origen.
  await page.getByRole('link', { name: 'Ver la cadena' }).click()
  await expect(page).toHaveURL(new RegExp(`/logistica\\?origen=${terreno.vacio.id}$`))
  await expect(page.locator('a[data-fase]').first()).toBeVisible()
})
