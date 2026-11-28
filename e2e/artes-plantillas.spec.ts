import { expect, test, type Locator, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { CONTRASENA, entrar } from './soporte/alta'
import { PNG_CON_TRANSPARENCIA } from './soporte/png'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// Artes (docs/UX.md › «Artes») contra la app compilada y el Supabase local: la dueña crea una plantilla de arte privada en un origen, otra persona
// no la ve hasta que la dueña la hace de la empresa (y entonces la ve sin poder cambiarla), la dueña la usa por defecto para imagen en ese origen,
// otra persona la duplica como suya y la dueña sube una imagen personal a la biblioteca; sin `artes.empresa.gestionar`, subir «De la empresa» está
// apagado. Lo que crea lleva `E2E` en el nombre y se borra al terminar (también las personas y los roles de prueba).
test.describe.configure({ mode: 'serial' })

let duena = ''
let asesora = ''
let otra = ''
let origen = ''
let nombreDelOrigen = ''
let nombre = ''
let imagen = ''

const MOTIVO_SIN_GESTIONAR = 'Sólo quien tiene Artes › gestionar las de la empresa.'

const rejilla = (page: Page) => page.getByRole('list', { name: 'Plantillas de arte', exact: true })
const tarjeta = (page: Page, de: string) =>
  rejilla(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: de, exact: true }) })

async function abrirArtes(page: Page, ruta = '/artes') {
  await page.goto(ruta)
  await expect(page.getByRole('tab', { name: 'Plantillas', exact: true })).toBeVisible()
}

async function menuDe(page: Page, de: string): Promise<Locator> {
  await page.getByRole('button', { name: `Más acciones de ${de}`, exact: true }).click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  return menu
}

async function altoDe(lugar: Locator): Promise<number> {
  const caja = await lugar.boundingBox()
  if (!caja) throw new Error('sin caja')
  return Math.round(caja.height)
}

function borrarLoCreado() {
  sql(`delete from public.artes_plantillas where nombre like 'E2E Arte %'`)
  sql(`delete from public.artes_imagenes where nombre like 'E2E Imagen %'`)
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(120_000)
  borrarLoCreado()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  const proyecto = info.project.name
  origen = sql("select id from public.origenes where clave = 'subasta_usa'")
  nombreDelOrigen = sql(`select nombre from public.origenes where id = ${literal(origen)}::uuid`)
  nombre = `E2E Arte ${proyecto}`
  imagen = `E2E Imagen ${proyecto}`
  duena = correoDePrueba(`duena-artes-${proyecto}`)
  asesora = correoDePrueba(`asesora-artes-${proyecto}`)
  otra = correoDePrueba(`otra-artes-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Artes' })
  // Dos personas que ven cotizaciones sólo en ese origen y no gestionan las artes de la empresa.
  for (const [correo, quien, clave] of [
    [asesora, 'Ana Artes', 'asesora'],
    [otra, 'Olga Artes', 'otra'],
  ] as const) {
    await crearPersona({ email: correo, contrasena: CONTRASENA, nombre: quien, invitada: true })
    await darRolDePrueba({
      email: correo,
      rol: {
        nombre: `${PREFIJO_ROL_E2E}Artes ${clave} ${proyecto}`,
        clave: `e2e_artes_${clave}_${proyecto}`,
      },
      permisos: [{ clave: 'cotizaciones.ver', origenId: origen }],
    })
  }
})

test.afterAll(async () => {
  borrarLoCreado()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E crear con origen y formato: la tarjeta queda primera, privada y tuya, sin saltar', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirArtes(page)
  await page.getByRole('button', { name: 'Nueva plantilla', exact: true }).first().click()
  await expect(page).toHaveURL(/panel=nueva/)
  const modal = page.getByRole('dialog', { name: 'Nueva plantilla', exact: true })
  await expect(modal).toBeVisible()
  await modal.getByLabel('Nombre', { exact: true }).fill(nombre)
  await modal.getByLabel('Origen', { exact: true }).selectOption({ label: nombreDelOrigen })
  await modal
    .getByLabel('Formato', { exact: true })
    .selectOption({ label: 'Vertical · 1080 × 1350 px' })
  // Ancho y alto siempre a la vista: con un formato fijo, apagados con su medida.
  await expect(modal.getByLabel('Ancho (px)', { exact: true })).toBeDisabled()
  await expect(modal.getByLabel('Ancho (px)', { exact: true })).toHaveValue('1080')
  await capturar(page, info, 'nueva-plantilla')
  await modal.getByRole('button', { name: 'Crear plantilla', exact: true }).click()
  await expect(page.getByText('Plantilla de arte creada.')).toBeVisible()
  await expect(modal).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)

  const primera = rejilla(page).getByRole('listitem').first()
  await expect(primera.getByRole('link', { name: nombre, exact: true })).toBeVisible()
  await expect(primera).toContainText(`Vertical · 1080 × 1350 · ${nombreDelOrigen}`)
  await expect(primera).toContainText('Privada')
  await expect(primera).toContainText('Tuya')
  await capturar(page, info, 'plantilla-creada')

  // Lo que dibuja el navegador tras crear mide lo mismo que lo que dibuja el servidor al recargar.
  const altoTrasCrear = await altoDe(primera)
  await page.reload()
  await expect(tarjeta(page, nombre)).toBeVisible()
  expect(await altoDe(tarjeta(page, nombre))).toBe(altoTrasCrear)
})

test('E2E una privada no la ve otra persona', async ({ page }) => {
  await entrar(page, asesora, { fresco: true })
  await abrirArtes(page)
  await expect(page.getByText('Todavía no hay plantillas de arte.')).toBeVisible()
  await expect(page.getByRole('link', { name: nombre, exact: true })).toHaveCount(0)
})

test('E2E hacerla de la empresa: otra persona la ve, sin poder cambiarla', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirArtes(page)
  const menu = await menuDe(page, nombre)
  await menu.getByRole('menuitem', { name: 'Hacerla de la empresa', exact: true }).click()
  await expect(tarjeta(page, nombre)).toContainText('De la empresa')
  await expect
    .poll(() =>
      sql(`select visibilidad from public.artes_plantillas where nombre = ${literal(nombre)}`),
    )
    .toBe('empresa')

  // Con la sesión de la dueña, `/ingreso` lleva adentro: se sale antes de entrar como otra persona.
  await page.context().clearCookies()
  await entrar(page, otra, { fresco: true })
  await abrirArtes(page)
  await expect(tarjeta(page, nombre)).toContainText('De la empresa')
  await expect(tarjeta(page, nombre)).toContainText('De Dora Artes')
  const suyo = await menuDe(page, nombre)
  await expect(suyo.getByRole('menuitem', { name: 'Abrir', exact: true })).toBeEnabled()
  await expect(suyo.getByRole('menuitem', { name: 'Duplicar', exact: true })).toBeEnabled()
  await expect(suyo.getByRole('menuitem', { name: 'Hacerla privada', exact: true })).toBeDisabled()
  await expect(suyo.getByRole('menuitem', { name: 'Eliminar', exact: true })).toBeDisabled()
  await expect(suyo.getByText(MOTIVO_SIN_GESTIONAR, { exact: true })).toBeVisible()
  await capturar(page, info, 'menu-sin-permiso')
})

test('E2E usar por defecto para imagen en un origen', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await abrirArtes(page)
  const menu = await menuDe(page, nombre)
  await menu
    .getByRole('menuitem', {
      name: `Usar por defecto para imagen en ${nombreDelOrigen}`,
      exact: true,
    })
    .click()
  await expect(
    page.getByText(
      `Ahora ${nombre} es tu plantilla por defecto para imagen en ${nombreDelOrigen}.`,
    ),
  ).toBeVisible()
  await expect(tarjeta(page, nombre)).toContainText('Por defecto para imagen')
  await expect
    .poll(() =>
      sql(
        `select d.tipo from public.artes_por_defecto d join public.artes_plantillas p on p.id = d.plantilla_id
          where p.nombre = ${literal(nombre)} and d.origen_id = ${literal(origen)}::uuid`,
      ),
    )
    .toBe('imagen')
})

test('E2E duplicar: la copia es privada y de quien duplica, del mismo alto', async ({
  page,
}, info) => {
  await entrar(page, otra, { fresco: true })
  await abrirArtes(page)
  const menu = await menuDe(page, nombre)
  await menu.getByRole('menuitem', { name: 'Duplicar', exact: true }).click()
  await expect(page.getByText('Plantilla de arte duplicada.')).toBeVisible()
  const copia = tarjeta(page, `${nombre} (copia)`)
  await expect(copia).toBeVisible()
  await expect(copia).toContainText('Privada')
  await expect(copia).toContainText('Tuya')
  // Todas las tarjetas miden lo mismo: la miniatura tiene caja fija.
  expect(await altoDe(copia)).toBe(await altoDe(tarjeta(page, nombre)))
  await capturar(page, info, 'plantilla-duplicada')
})

test('E2E subir una imagen personal a la biblioteca', async ({ page }, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirArtes(page)
  await page.getByRole('tab', { name: 'Imágenes', exact: true }).click()
  await expect(page).toHaveURL(/pestana=imagenes/)
  await page.getByRole('button', { name: 'Subir imagen', exact: true }).first().click()
  await expect(page).toHaveURL(/panel=subir/)
  const modal = page.getByRole('dialog', { name: 'Subir imagen', exact: true })
  await expect(modal).toBeVisible()
  await modal.locator('input[type="file"]').setInputFiles({
    name: 'logo-con-transparencia.png',
    mimeType: 'image/png',
    buffer: PNG_CON_TRANSPARENCIA,
  })
  await expect(modal.getByText(/Elegida: /)).toBeVisible()
  await modal.getByLabel('Nombre', { exact: true }).fill(imagen)
  await expect(modal.getByRole('radio', { name: 'Personal', exact: true })).toBeChecked()
  await capturar(page, info, 'subir-imagen')
  await modal.getByRole('button', { name: 'Subir imagen', exact: true }).click()
  await expect(page.getByText('Imagen guardada en la biblioteca.')).toBeVisible()
  await expect(modal).toBeHidden()
  const fila = page.getByRole('listitem').filter({ hasText: imagen })
  await expect(fila).toContainText('Personal')
  await expect
    .poll(() => sql(`select tipo from public.artes_imagenes where nombre = ${literal(imagen)}`))
    .toBe('png')
  await capturar(page, info, 'imagen-subida')
})

test('E2E sin permiso, subir a la empresa está apagado con su motivo', async ({ page }) => {
  await entrar(page, asesora, { fresco: true })
  await abrirArtes(page, '/artes?pestana=imagenes')
  await page.getByRole('button', { name: 'Subir imagen', exact: true }).first().click()
  const modal = page.getByRole('dialog', { name: 'Subir imagen', exact: true })
  await expect(modal).toBeVisible()
  await expect(modal.getByRole('radio', { name: 'De la empresa', exact: true })).toBeDisabled()
  await expect(modal.getByText(MOTIVO_SIN_GESTIONAR)).toBeVisible()
})
