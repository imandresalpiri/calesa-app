import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { celdaDeLaHoja } from './soporte/cotizar-guardar'
import { guardarLaHojaAbierta } from './soporte/cotizar-pdf'
import { abrirLaHoja, cotizarEnLaSubasta, urlDeLaSubasta } from './soporte/cotizar-vista-previa'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { capturar, crearAsesoraDeLaSemilla, sinScrollHorizontal, tactil } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'

// El Modo Live (`docs/GLOSARIO.md` › «Modo Live») oculta sólo los símbolos y los códigos de moneda: los números se ven con los mismos decimales. Se recorre la hoja
// (la celda se edita como texto), la guardada, la lista y el resumen (la imagen de la tarjeta sin moneda), «Compartir» (se ve sin moneda, se copia completo) y
// apagarlo (vuelven las monedas). Con el texto al 200 % el interruptor sigue a mano. La subasta de la semilla, con su plantilla.
test.describe.configure({ mode: 'serial' })

let asesora = { email: '', nombre: '' }
let lead = ''
let subasta = ''
let vehiculo = ''
let guardada = ''

// Un número sin moneda: dígitos, separadores y, si los hay, espacios del locale.
const SIN_MONEDA = /^-?[\d.,\s]+$/
const interruptor = (page: Page) =>
  page.getByRole('button', { name: 'Modo Live: ocultar los símbolos de moneda' }).first()
const sinMoneda = (lugar: Locator) => lugar.locator('[data-monto-sin-moneda]').first()
const panel = (page: Page) => page.getByRole('dialog', { name: 'Compartir cotización' })

async function encender(page: Page) {
  await interruptor(page).click()
  await expect(interruptor(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(interruptor(page)).toHaveAttribute(
    'title',
    'Modo Live encendido: se ven los números sin moneda',
  )
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(120_000)
  const proyecto = info.project.name
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  // La dueña primero: una persona invitada pide que la empresa ya tenga dueña.
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-live-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Lía Live',
  })
  asesora = await crearAsesoraDeLaSemilla(`live-${proyecto}`)
  lead = await crearLead({
    nombre: `live ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: asesora.email,
  })
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
  const titulo = `Live Corolla ${proyecto}`
  await cargarVehiculos(subasta, [
    { titulo, anio: 2021, atributos: { tipo_vehiculo: 'autos', ubicacion_estado: 'TX' } },
  ])
  vehiculo = (await vehiculoPorTitulo(titulo))?.id ?? ''
  expect(vehiculo, 'el vehículo de la subasta').not.toBe('')
})

test.afterAll(async () => {
  if (vehiculo !== '') {
    sql(`delete from public.cotizaciones where vehiculo_id = ${literal(vehiculo)}::uuid`)
    sql(`delete from public.vehiculos where id = ${literal(vehiculo)}::uuid`)
  }
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E la hoja y la guardada: los números sin moneda y la celda se edita como texto', async ({
  page,
}, info) => {
  await cotizarEnLaSubasta(page, asesora.email, urlDeLaSubasta(subasta, lead, vehiculo))
  guardada = await guardarLaHojaAbierta(page)
  await page.goto(`/cotizaciones/${guardada}`)
  await encender(page)
  const total = page.locator('[data-total]').first()
  await expect(total.locator('[data-monto-valor]').first()).toBeHidden()
  await expect(sinMoneda(total)).toHaveText(SIN_MONEDA)
  await expect(page.getByText('Oculto en Modo Live')).toHaveCount(0)
  await expect(page.getByText('•••')).toHaveCount(0)
  // La celda abre como texto, con su número a la vista.
  await celdaDeLaHoja(page, 'remate').locator('[data-parada="0"]').click()
  const entrada = celdaDeLaHoja(page, 'remate').locator('input')
  await expect(entrada).toHaveAttribute('type', 'text')
  await expect(entrada).toHaveValue(/9\.?500/)
  await page.keyboard.press('Escape')
  await tactil(page, interruptor(page))
  await capturar(page, info, 'guardada')
})

test('E2E la lista y el resumen: la imagen de la tarjeta sin moneda; apagarlo vuelve a la de siempre', async ({
  page,
}, info) => {
  const numero = sql(`select numero from public.cotizaciones where id = ${literal(guardada)}::uuid`)
  await entrar(page, asesora.email, { fresco: true })
  await page.addInitScript(() => {
    window.localStorage.setItem('modo-live', '1')
  })
  await page.goto(`/cotizaciones?q=${numero}&cotizacion=${guardada}`)
  await expect(page.locator('html')).toHaveClass(/\blive\b/)
  const resumen = page
    .getByRole('dialog')
    .filter({ has: page.locator('[data-imagen-de-la-tarjeta]') })
  const imagen = resumen.locator('img[data-imagen]').first()
  await expect(imagen).toHaveAttribute('data-imagen-moneda', 'sin', { timeout: 30_000 })
  await expect(imagen).toHaveAttribute('src', /sin-moneda=1/)
  await expect(imagen).toBeVisible()
  await capturar(page, info, 'resumen')
  // «Compartir» se ofrece y su vista va sin moneda.
  await resumen.getByRole('button', { name: 'Compartir cotización' }).click()
  await expect(panel(page).locator('img[data-compartir-tarjeta]')).toHaveAttribute(
    'data-imagen-moneda',
    'sin',
    { timeout: 30_000 },
  )
  await capturar(page, info, 'compartir')
  await page.keyboard.press('Escape')
  await expect(panel(page)).toBeHidden()

  // Apagarlo (desde otra pestaña: el evento `storage`) vuelve a pedir la imagen con moneda.
  await page.evaluate(() => {
    window.localStorage.removeItem('modo-live')
    window.dispatchEvent(new StorageEvent('storage', { key: 'modo-live', newValue: null }))
  })
  await expect(page.locator('html')).not.toHaveClass(/\blive\b/)
  await expect(resumen.locator('img[data-imagen]').first()).toHaveAttribute(
    'data-imagen-moneda',
    'con',
    { timeout: 30_000 },
  )
})

test('E2E con el texto al 200 % el interruptor sigue a mano y nada ensancha la página', async ({
  page,
}, info) => {
  await abrirLaHoja(page, asesora.email, `/cotizaciones/${guardada}`)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await encender(page)
  await expect(sinMoneda(page.locator('[data-total]').first())).toHaveText(SIN_MONEDA)
  await tactil(page, interruptor(page))
  await sinScrollHorizontal(page)
  await capturar(page, info, 'texto-al-200')
})
