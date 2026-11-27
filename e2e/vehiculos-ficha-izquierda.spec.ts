import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { personaSinLogistica } from './soporte/ficha-del-vehiculo'
import { capturar } from './soporte/recorrido'
import {
  borrarTerrenoDeLaIzquierda,
  sembrarLaIzquierda,
  type TerrenoDeLaIzquierda,
  type VehiculoDelTerreno,
} from './soporte/ficha-izquierda'
import { literal, sql } from './soporte/sql'

// La columna izquierda de la ficha del vehículo (`docs/UX.md` › Vehículo): el «⋯» y la vitrina sobre la foto, la tira de miniaturas, los enlaces
// cortos, la subasta y el costo como la tarjeta de la lista (la cuenta regresiva, la puja, la compra directa y el «Costo estimado» que comparte), «Editar fechas de subasta» en el «⋯» y «Datos principales» con «Ver más» (la ficha completa, `?ver=ficha`).
// Terreno propio por SQL de servicio: un origen de subasta con «Subasta» → «Comprado», un campo y sus datos clave, y cuatro vehículos. Se borra al
// empezar y al terminar.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let sinPermisos = ''
let t: TerrenoDeLaIzquierda

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarTerrenoDeLaIzquierda(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-ficha-izquierda-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Iris Izquierda' })
  t = await sembrarLaIzquierda(proyecto, duena)
  sinPermisos = await personaSinLogistica(`izq_${proyecto}`, t.origen)
  const situaciones = sql(
    `select string_agg(titulo || '=' || situacion::text, ',' order by titulo) from public.vehiculos where origen_id = ${literal(t.origen)}::uuid`,
  )
  for (const [vehiculo, situacion] of [
    [t.principal, 'en_subasta'],
    [t.sinResolver, 'sin_resolver'],
    [t.ganada, 'fase'],
    [t.noGanada, 'no_ganada'],
  ] as const) {
    if (!situaciones.includes(`${vehiculo.titulo}=${situacion}`)) {
      throw new Error(`El terreno no quedó como se esperaba: ${situaciones}`)
    }
  }
})

test.afterAll(async () => {
  await borrarTerrenoDeLaIzquierda(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const lateral = (page: Page) => page.locator('main')
const region = (page: Page, nombre: string) =>
  lateral(page).getByRole('region', { name: nombre, exact: true }).first()

async function alaFicha(page: Page, vehiculo: VehiculoDelTerreno, busqueda = ''): Promise<void> {
  await page.goto(`/vehiculos/${vehiculo.id}${busqueda}`)
  await expect(page.getByRole('heading', { name: vehiculo.titulo, level: 1 })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Índice de la ficha' })).toHaveAttribute(
    'data-hidratado',
    'true',
  )
}

// La caja de la foto de la cabecera (el botón que abre el visor) y la del «⋯»: el «⋯» va adentro.
async function adentroDeLaFoto(page: Page, nombre: string): Promise<void> {
  const foto = await page
    .getByRole('button', { name: /^Ver las fotos de / })
    .first()
    .boundingBox()
  const boton = await page.getByRole('button', { name: nombre }).first().boundingBox()
  expect(foto).not.toBeNull()
  expect(boton).not.toBeNull()
  if (!foto || !boton) return
  expect(boton.x).toBeGreaterThanOrEqual(foto.x)
  expect(boton.y).toBeGreaterThanOrEqual(foto.y)
  expect(boton.x + boton.width).toBeLessThanOrEqual(foto.x + foto.width + 1)
  expect(boton.y + boton.height).toBeLessThanOrEqual(foto.y + foto.height + 1)
}

test('E2E ficha izquierda · el «⋯» y la vitrina sobre la foto, sin «Editar» suelto', async ({
  page,
}, info) => {
  const { principal } = t
  await entrar(page, duena, { fresco: true })
  await alaFicha(page, principal)
  const menu = `Más acciones de ${principal.titulo}`
  await adentroDeLaFoto(page, menu)
  await adentroDeLaFoto(page, `Publicar «${principal.titulo}» en la web`)
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)
  await capturar(page, info, 'ficha-izquierda')
  await page.getByRole('button', { name: menu }).first().click()
  await page.getByRole('menuitem', { name: 'Editar', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`[?&]editar=${principal.id}`))
  await expect(page.getByRole('dialog', { name: `Editar ${principal.titulo}` })).toBeVisible()
  await alaFicha(page, principal)
  await page.getByRole('button', { name: `Publicar «${principal.titulo}» en la web` }).click()
  await expect(page).toHaveURL(/[?&]panel=vitrina/)
})

test('E2E ficha izquierda · la tira elige una foto y abre el visor en ella, también con el teclado', async ({
  page,
}) => {
  await entrar(page, duena)
  await alaFicha(page, t.principal)
  const tira = page.getByRole('list', { name: `Fotos de ${t.principal.titulo}` })
  await expect(tira.getByRole('button')).toHaveCount(3)
  await expect(tira.getByRole('button', { name: 'Ver la foto 1 de 3' })).toHaveAttribute(
    'aria-current',
    'true',
  )
  await tira.getByRole('button', { name: 'Ver la foto 2 de 3' }).click()
  const visor = page.locator('[data-visor-de-imagenes]')
  await expect(visor).toBeVisible()
  await expect(visor.getByText('2 de 3')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(visor).toBeHidden()
  // Con el foco en la tira, → marca la siguiente y Enter la abre.
  await tira.getByRole('button', { name: 'Ver la foto 2 de 3' }).focus()
  await page.keyboard.press('ArrowRight')
  const tercera = tira.getByRole('button', { name: 'Ver la foto 3 de 3' })
  await expect(tercera).toHaveAttribute('aria-current', 'true')
  await expect(tercera).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(visor.getByText('3 de 3')).toBeVisible()
})

test('E2E ficha izquierda · los enlaces cortos a logística y repuestos', async ({ page }) => {
  await entrar(page, duena)
  await alaFicha(page, t.principal)
  const cabecera = page.locator('main header').first()
  await expect(cabecera.getByRole('link', { name: 'Ver en logística' })).toHaveAttribute(
    'href',
    `/logistica/vehiculo/${t.principal.id}`,
  )
  await expect(
    cabecera.getByRole('link', { name: `Repuestos · Proyecto #${t.proyecto.numero}` }),
  ).toHaveAttribute('href', `/repuestos/${t.proyecto.id}`)
})

test('E2E ficha izquierda · la cuenta, la puja, la compra directa y el «Costo estimado» que comparte la aprobada', async ({
  page,
}, info) => {
  await entrar(page, duena)
  await alaFicha(page, t.principal)
  const bloque = region(page, 'Subasta y costo')
  await expect(bloque.locator('[data-cuenta-regresiva]')).toHaveText(/^Cierra en 2 d /)
  await expect(bloque.locator('dt')).toHaveText([
    /^Puja actual/,
    'Compra directa',
    'Costo estimado',
  ])
  await expect(bloque.locator('dd').nth(0)).toContainText('4.100')
  await expect(bloque.locator('dd').nth(1)).toContainText('15.000')
  // Ya no hay un bloque «Cotización aprobada» ni uno «Subasta» aparte.
  await expect(region(page, 'Cotización aprobada')).toHaveCount(0)
  await expect(page.locator('[data-frase-de-subasta]')).toHaveCount(0)
  await bloque.scrollIntoViewIfNeeded()
  await capturar(page, info, 'costo-y-subasta')
  await bloque.getByRole('button', { name: /^Compartir la cotización aprobada/ }).click()
  await expect(page).toHaveURL(new RegExp(`panel=compartir&para=${t.cotizacion}`))
  await capturar(page, info, 'costo-compartir')
})

test('E2E ficha izquierda · sin aprobada, el costo dice «—» y «Cotizar» lleva a la hoja con el vehículo', async ({
  page,
}) => {
  await entrar(page, duena)
  await alaFicha(page, t.sinResolver)
  const bloque = region(page, 'Subasta y costo')
  // Sin cuenta (ya cerró) y con las tres filas fijas: la puja y la compra directa sin dato, «—».
  await expect(bloque.locator('[data-cuenta-regresiva]')).toHaveCount(0)
  await expect(bloque.locator('dt')).toHaveText([
    /^Puja (actual|final)/,
    'Compra directa',
    'Costo estimado',
  ])
  await expect(bloque.locator('dd').nth(0)).toHaveText('—')
  await expect(bloque.locator('dd').nth(2)).toContainText('—')
  const cotizar = bloque.getByRole('link', { name: 'Cotizar' })
  const href = (await cotizar.getAttribute('href')) ?? ''
  expect(href).toContain('/cotizaciones/nuevo')
  expect(href).toContain(t.sinResolver.id)
  expect(new URL(href, 'http://x').searchParams.get('returnTo')).toBe(
    `/vehiculos/${t.sinResolver.id}`,
  )
})

test('E2E ficha izquierda · en Modo Live el costo comparte y su monto va sin moneda', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.addInitScript(() => {
    window.localStorage.setItem('modo-live', '1')
  })
  await alaFicha(page, t.principal)
  await expect(page.locator('html')).toHaveClass(/\blive\b/)
  const bloque = region(page, 'Subasta y costo')
  await expect(bloque.locator('dt')).toHaveText([
    /^Puja actual/,
    'Compra directa',
    'Costo estimado',
  ])
  const costo = bloque.getByRole('button', { name: /^Compartir la cotización aprobada/ })
  await expect(costo).toBeVisible()
  // El nombre accesible y lo visible: el número sin su moneda.
  await expect(costo).toHaveAccessibleName(/\([\d.,]+( · [^)]+)?\)$/)
  await expect(costo.locator('[data-monto-sin-moneda]')).toHaveText(/^[\d.,\s]+$/)
  await expect(costo.locator('[data-monto-valor]')).toBeHidden()
})

test('E2E ficha izquierda · la cuenta regresiva sólo en una subasta viva, y «Editar fechas de subasta» en el «⋯»', async ({
  page,
}, info) => {
  await entrar(page, duena)
  for (const [vehiculo, cuentas] of [
    [t.principal, 1],
    [t.sinResolver, 0],
    [t.ganada, 0],
    [t.noGanada, 0],
  ] as const) {
    await alaFicha(page, vehiculo)
    await expect(region(page, 'Subasta y costo').locator('[data-cuenta-regresiva]')).toHaveCount(
      cuentas,
    )
  }
  await alaFicha(page, t.principal)
  await page.getByRole('button', { name: `Más acciones de ${t.principal.titulo}` }).click()
  await capturar(page, info, 'menu-con-fechas')
  await page.getByRole('menuitem', { name: 'Editar fechas de subasta' }).click()
  await expect(page).toHaveURL(/[?&]panel=fechas-de-subasta/)
  await expect(page.getByRole('dialog', { name: 'Fechas de la subasta' })).toBeVisible()
  // La URL sola también abre el modal.
  await page.goto(`/vehiculos/${t.principal.id}?panel=fechas-de-subasta`)
  await expect(page.getByRole('dialog', { name: 'Fechas de la subasta' })).toBeVisible()
})

test('E2E ficha izquierda · «Datos principales» con los datos clave del origen y «Ver más» con la ficha completa', async ({
  page,
}, info) => {
  await entrar(page, duena)
  await alaFicha(page, t.principal)
  const principales = region(page, 'Datos principales')
  await expect(principales.locator('dt')).toHaveText([
    'Enlace de la subasta',
    'Tono de pintura',
    'Año',
    'Lote',
  ])
  await expect(principales.locator('dd')).toHaveText(['Abrir enlace', 'Rojo', '2021', '58540656'])
  const enlace = principales.getByRole('link', { name: 'Abrir enlace' })
  await expect(enlace).toHaveAttribute('target', '_blank')
  await expect(enlace).toHaveAttribute('rel', 'noopener noreferrer')

  const verMas = principales.getByRole('button', { name: 'Ver más' })
  await verMas.scrollIntoViewIfNeeded()
  await capturar(page, info, 'datos-principales')
  await verMas.click()
  await expect(page).toHaveURL(/[?&]ver=ficha/)
  const ficha = page.getByRole('dialog', { name: t.principal.titulo })
  await expect(ficha.getByRole('list', { name: `Fotos de ${t.principal.titulo}` })).toBeVisible()
  await expect(ficha.getByRole('region', { name: 'Datos principales', exact: true })).toBeVisible()
  await expect(ficha.getByRole('region', { name: 'Precio', exact: true })).toBeVisible()
  await expect(ficha.getByRole('region', { name: 'Aspecto E2E' })).toBeVisible()
  await expect(ficha.getByText('Rojo')).toBeVisible()
  // Sólo lectura: ni «⋯», ni editar, ni vitrina.
  await expect(ficha.getByRole('button', { name: /Más acciones|Editar|Publicar/ })).toHaveCount(0)
  await capturar(page, info, 'ficha-completa')
  await page.keyboard.press('Escape')
  await expect(ficha).toBeHidden()
  await expect(verMas).toBeFocused()

  // Llegar con la URL abre la ficha completa.
  await page.goto(`/vehiculos/${t.principal.id}?ver=ficha`)
  await expect(page.getByRole('dialog', { name: t.principal.titulo })).toBeVisible()
})

test('E2E ficha izquierda · `?visor=` abre el visor en su foto', async ({ page }) => {
  await entrar(page, duena)
  await page.goto(`/vehiculos/${t.principal.id}?visor=${t.principal.id}&foto=2`)
  await expect(page.locator('[data-visor-de-imagenes]').getByText('2 de 3')).toBeVisible()
})

test('E2E ficha izquierda · sin permisos: vitrina apagada con su motivo, sin enlaces cortos ni costo estimado', async ({
  page,
}, info) => {
  await page.context().clearCookies()
  await entrar(page, sinPermisos, { fresco: true })
  await alaFicha(page, t.principal)
  const vitrina = page.getByRole('button', { name: `Publicar «${t.principal.titulo}» en la web` })
  await expect(vitrina).toHaveAttribute('aria-disabled', 'true')
  await expect(vitrina).toHaveAccessibleDescription(/No tienes permiso para publicar en la web/)
  // Apagado con `aria-disabled` (sigue enfocable): Playwright no lo toca sin `force`; la persona sí, y ve el motivo.
  await vitrina.click({ force: true })
  await expect(page).not.toHaveURL(/panel=vitrina/)
  await expect(page.getByText(/No tienes permiso para publicar en la web/).first()).toBeVisible()
  const cabecera = page.locator('main header').first()
  await expect(cabecera.getByRole('link', { name: 'Ver en logística' })).toHaveCount(0)
  await expect(cabecera.getByRole('link', { name: /^Repuestos · Proyecto/ })).toHaveCount(0)
  // Sin `cotizaciones.ver` no hay fila «Costo estimado» (ni consulta): sólo la subasta.
  const bloque = region(page, 'Subasta')
  await expect(bloque.locator('dt')).toHaveText([/^Puja actual/, 'Compra directa'])
  await expect(page.getByText('Costo estimado')).toHaveCount(0)
  await capturar(page, info, 'sin-permisos')
})
