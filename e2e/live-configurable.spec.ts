// @sin-celular-archivo: Configuración y el recorrido del Modo Live se prueban en escritorio; el celular de la barra lo cubre barra-superior-celular
import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { CONTRASENA, entrar } from './soporte/alta'
import { encenderElLive, interruptorDelLive, personaConRol, rolDePrueba } from './soporte/live'
import { literal, sql } from './soporte/sql'

// Configuración › Modo Live (`docs/GLOSARIO.md` › «Ajustes del Live»): la dueña le da a un rol «Sólo la cadena» en Logística y a una persona de ese
// rol Clientes «Completo» (su «Ajuste propio»). Con el Live encendido, Leads se oculta para quien sigue al rol y se ve para quien lo pisa, y
// Logística muestra la cadena; quien tiene un rol sin «Puede encender» no ve el interruptor. Al final, cada uno vuelve a lo de antes.
test.describe.configure({ mode: 'serial' })

const ROL = 'E2E Live Ventas'
const ROL_SIN_LIVE = 'E2E Live Sin interruptor'
const PERMISOS = ['vehiculos.ver', 'cotizaciones.ver', 'leads.ver', 'logistica.ver']

let duena = ''
let rolId = ''
let ana = { id: '', email: '', nombre: '' }
let beto = { id: '', email: '', nombre: '' }
let ciro = { id: '', email: '', nombre: '' }

const OCULTO = 'Oculto en Modo Live'
const modalDelRol = (page: Page) => page.getByRole('dialog', { name: `Modo Live de «${ROL}»` })
const tarjetaDelRol = (page: Page) => page.getByRole('region', { name: ROL })
const filaDe = (page: Page, id: string) => page.locator(`[data-persona-del-live="${id}"]`)

test.beforeAll(async ({}, info) => {
  info.setTimeout(120_000)
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-live-config-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dana Live' })
  rolId = rolDePrueba(ROL, `e2e_live_ventas_${proyecto}`, PERMISOS)
  ana = await personaConRol(`ana-live-${proyecto}`, 'Ana Siguealrol', rolId)
  beto = await personaConRol(`beto-live-${proyecto}`, 'Beto Pisalorol', rolId)
  const sinLive = rolDePrueba(ROL_SIN_LIVE, `e2e_live_sin_${proyecto}`, PERMISOS)
  sql(
    `insert into public.live_ajustes_roles (rol_id, ajustes) values (${literal(sinLive)}::uuid, '{"puede_encender": false}')`,
  )
  ciro = await personaConRol(`ciro-live-${proyecto}`, 'Ciro Sinlive', sinLive)
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E escritorio: la dueña le da a un rol «Sólo la cadena» en Logística', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/modo-live')
  await expect(page.getByRole('heading', { level: 1, name: 'Modo Live' })).toBeVisible()
  await expect(tarjetaDelRol(page).getByText('Por defecto', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: `Editar ${ROL}`, exact: true }).click()
  await expect(modalDelRol(page)).toBeVisible()
  await modalDelRol(page)
    .getByLabel('Logística', { exact: true })
    .selectOption({ label: 'Sólo la cadena' })
  await modalDelRol(page).getByRole('button', { name: 'Guardar' }).click()
  await expect(modalDelRol(page)).toBeHidden()
  await expect(tarjetaDelRol(page).getByText('Sólo la cadena')).toBeVisible()
  await expect(tarjetaDelRol(page).getByText('Por defecto', { exact: true })).toHaveCount(0)
  expect(
    sql(
      `select ajustes ->> 'logistica' from public.live_ajustes_roles where rol_id = ${literal(rolId)}::uuid`,
    ),
  ).toBe('cadena')
})

test('E2E escritorio: la dueña busca a una persona y le pone Clientes «Completo»', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/modo-live')
  await expect(page.getByText('Nadie tiene ajustes propios.')).toBeVisible()
  await page.getByLabel('Buscar a una persona por nombre o correo').fill('Pisalorol')
  await expect(filaDe(page, beto.id)).toContainText(`Como su rol (${ROL})`)
  await filaDe(page, beto.id)
    .getByRole('button', { name: `Editar los ajustes de «${beto.nombre}»` })
    .click()
  const modal = page.getByRole('dialog', { name: `Modo Live de «${beto.nombre}»` })
  await expect(modal).toBeVisible()
  // Lo heredado dice qué vale: Clientes, «Apagado» por el rol (lo por defecto).
  const clientes = modal.getByLabel('Clientes', { exact: true })
  await expect(clientes.locator('option').first()).toHaveText('Como su rol (Apagado)')
  await clientes.selectOption({ label: 'Completo' })
  // Las insignias de los demás campos están reservadas (invisibles): sólo la de Clientes se ve.
  const aLaVista = modal.locator('[data-slot="badge"]:not([aria-hidden="true"])')
  await expect(aLaVista).toHaveCount(1)
  await expect(aLaVista).toHaveText('Ajuste propio')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal).toBeHidden()
  await expect(filaDe(page, beto.id)).toContainText('Ajuste propio en 1 campo')
  // Sin búsqueda, la lista es la de quienes tienen lo propio.
  await page.goto('/configuracion/modo-live')
  await expect(filaDe(page, beto.id)).toBeVisible()
  await expect(filaDe(page, ana.id)).toHaveCount(0)
})

test('E2E escritorio: con el Live, Leads se oculta para quien sigue a su rol y Logística muestra la cadena', async ({
  page,
}) => {
  await entrar(page, ana.email, { fresco: true })
  await page.goto('/vehiculos')
  await encenderElLive(page)
  await page.goto('/leads')
  await expect(page.getByText(OCULTO)).toBeVisible()
  await page.goto('/logistica')
  await expect(page.locator('main[data-live="encendido"]')).toBeVisible()
  await expect(page.getByText(OCULTO)).toHaveCount(0)
})

test('E2E escritorio: con el Live, quien tiene Clientes «Completo» propio ve Leads', async ({
  page,
}) => {
  await entrar(page, beto.email, { fresco: true })
  await page.goto('/vehiculos')
  await encenderElLive(page)
  await page.goto('/leads')
  await expect(page.locator('main[data-live="encendido"]')).toBeVisible()
  await expect(page.getByText(OCULTO)).toHaveCount(0)
})

test('E2E escritorio: un rol sin «Puede encender» no ve el interruptor', async ({ page }) => {
  await entrar(page, ciro.email, { fresco: true })
  await page.goto('/vehiculos')
  await expect(page.locator('main[data-live="apagado"]')).toBeVisible()
  await expect(interruptorDelLive(page)).toHaveCount(0)
})

test('E2E escritorio: la persona vuelve a lo de su rol y el rol a lo por defecto', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/modo-live')
  await page.getByRole('button', { name: `Más acciones de «${beto.nombre}»` }).click()
  await page.getByRole('menuitem', { name: 'Volver a lo de su rol…' }).click()
  const confirmar = page.getByRole('dialog', {
    name: `Volver a lo de su rol para «${beto.nombre}»`,
  })
  await confirmar.getByRole('button', { name: 'Volver a lo de su rol' }).click()
  await expect(confirmar).toBeHidden()
  await expect(page.getByText('Nadie tiene ajustes propios.')).toBeVisible()

  await page.getByRole('button', { name: `Más acciones de ${ROL}` }).click()
  await page.getByRole('menuitem', { name: 'Volver a lo por defecto…' }).click()
  const porDefecto = page.getByRole('dialog', {
    name: `Volver a lo por defecto en «${ROL}»`,
  })
  await porDefecto.getByRole('button', { name: 'Volver a lo por defecto' }).click()
  await expect(porDefecto).toBeHidden()
  await expect(tarjetaDelRol(page).getByText('Por defecto', { exact: true })).toBeVisible()
  expect(
    sql(`select count(*) from public.live_ajustes_roles where rol_id = ${literal(rolId)}::uuid`),
  ).toBe('0')
})
