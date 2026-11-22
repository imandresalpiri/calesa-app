import { expect, test, type Page } from './soporte/prueba'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import {
  restaurarEmpresa,
  tomarInstantaneaDeEmpresa,
  type InstantaneaDeEmpresa,
} from './soporte/empresa'
import { ingresar } from './soporte/pasos'

// @sin-celular-archivo: Configuración no se prueba en celular: es la misma pantalla en pasos y elementos, y su ancho lo mide la hoja de capturas del recorrido.

// Configuración › Empresa › Monedas por par de monedas: la moneda base arriba, un grupo por par (USD → BOB) con sus tipos de cambio como tarjetas
// («En la barra» con su tope de 3, «Tipo de cambio» del par) y abajo las monedas activas y la leyenda. La empresa es una fila única: se deja como estaba.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'

let duena = ''
let antes: InstantaneaDeEmpresa

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  antes = await tomarInstantaneaDeEmpresa()
  await restaurarEmpresa()
  duena = correoDePrueba(`duena-por-par-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Pares' })
})

test.afterAll(async () => {
  await restaurarEmpresa(antes)
  await borrarPersonasDePrueba()
})

const tarjeta = (page: Page, nombre: string) =>
  page.getByRole('region', { name: nombre, exact: true })

const enLaBarra = (page: Page, nombre: string) =>
  tarjeta(page, nombre).getByRole('switch', { name: 'En la barra' })

test('E2E la base arriba, los tipos de cambio por par y el tope de «En la barra»', async ({
  page,
}) => {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
  await page.goto('/configuracion/empresa/monedas')

  // La moneda base arriba: «Cambiar» abre su modal.
  const base = tarjeta(page, 'Moneda base')
  await expect(base).toContainText('USD')
  await base.getByRole('button', { name: 'Cambiar la moneda base', exact: true }).click()
  const modalDeBase = page.getByRole('dialog', { name: 'Moneda base' })
  await expect(modalDeBase).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(modalDeBase).toBeHidden()

  // Un grupo por par, con una tarjeta por tipo de cambio: nombre, ★ y el valor.
  await expect(page.getByRole('heading', { name: 'USD a BOB', exact: true })).toBeVisible()
  const oficial = tarjeta(page, 'Oficial')
  await expect(oficial).toContainText('★ Por defecto')
  await expect(oficial).toContainText('11,68')
  await expect(enLaBarra(page, 'Oficial')).toBeChecked()

  // El tope de 3: con tres marcados el cuarto queda apagado.
  for (const nombre of ['Paralelo', 'Unificado']) {
    await enLaBarra(page, nombre).click()
    await expect(page.getByText(`Tipo de cambio «${nombre}» guardado`)).toBeVisible()
    await expect(enLaBarra(page, nombre)).toBeChecked()
  }
  await expect(enLaBarra(page, 'Aduana')).toBeDisabled()

  // «Tipo de cambio» del par lo abre con las dos monedas ya elegidas.
  await page.getByRole('button', { name: 'Nuevo tipo de cambio de USD a BOB' }).click()
  const nuevo = page.getByRole('dialog', { name: 'Nuevo tipo de cambio' })
  await expect(nuevo.getByLabel('Una unidad de')).toHaveValue('USD')
  await expect(nuevo.getByLabel('Vale, en')).toHaveValue('BOB')
  await page.keyboard.press('Escape')
  await expect(nuevo).toBeHidden()

  // Abajo: las monedas activas con «Gestionar» (la lista de hoy) y «Al compartir».
  const monedas = tarjeta(page, 'Monedas activas')
  await expect(monedas).toContainText('BOB')
  await monedas.getByRole('button', { name: 'Gestionar las monedas', exact: true }).click()
  const lista = page.getByRole('dialog', { name: 'Monedas' })
  await lista.getByRole('button', { name: /BOB/ }).first().click()
  await expect(page).toHaveURL(/moneda=BOB/)
  await expect(lista).toBeHidden()
})
