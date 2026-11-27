import { expect, test, type Locator, type Page } from './soporte/prueba'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  restaurarEmpresa,
  tomarInstantaneaDeEmpresa,
  type InstantaneaDeEmpresa,
} from './soporte/empresa'
import { encenderElLive } from './soporte/live'
import { capturar } from './soporte/recorrido'
import { PNG_CON_TRANSPARENCIA, PNG_PESADO } from './soporte/png'
import { sql } from './soporte/sql'

// Las variantes del logo de la empresa (docs/GLOSARIO.md › «Variante del logo») contra la app compilada y el Supabase local: la tarjeta «Logos» de
// Configuración › Empresa (subir un PNG con transparencia y un SVG, los motivos junto al archivo, el nombre repetido, renombrar, ordenar por el «⋯», por
// el teclado y arrastrando, quitar) y la ventana de cámara del Live eligiendo una variante, con el aviso al quitar la que usa. La empresa es una fila
// única: se guarda cómo estaba y al terminar se deja así.
test.describe.configure({ mode: 'serial' })
// La cámara falsa de Chromium para la ventana del Live (el flag de lanzamiento no puede ir dentro de un `describe`).
test.use({
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
})

let duena = ''
let antes: InstantaneaDeEmpresa

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect width="120" height="60" rx="8" fill="#0b7285"/></svg>'
const SVG_CON_CODIGO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script></svg>'

// --- Lo que se mira en la base y en la pantalla ----------------------------------------------------------------------------------------------

const nombresEnLaBase = () =>
  sql(`select coalesce(string_agg(nombre, '|' order by orden, id), '') from public.logos_empresa`)
const cuantasEnLaBase = () => Number(sql(`select count(*) from public.logos_empresa`))
const rutaDe = (nombre: string) =>
  sql(`select ruta from public.logos_empresa where nombre = '${nombre}'`)
const guardada = () =>
  sql(`select valor::text from public.preferencias_usuario where clave = 'live.ventana'`)

const tarjeta = (page: Page) => page.getByRole('region', { name: 'Logos', exact: true })
const lista = (page: Page) => page.getByRole('dialog', { name: 'Logos', exact: true })
const filas = (page: Page) => lista(page).locator('li[data-logo]')
const nombresEnPantalla = async (page: Page) =>
  (await filas(page).locator('[data-nombre-de-logo]').allTextContents()).join('|')

async function abrirLaLista(page: Page) {
  await page.goto('/configuracion/empresa')
  await tarjeta(page).getByRole('button', { name: 'Gestionar logos', exact: true }).click()
  await expect(lista(page)).toBeVisible()
  await expect(page).toHaveURL(/panel=logos/)
}

async function subir(
  page: Page,
  archivo: { name: string; mimeType: string; buffer: Buffer },
  nombre: string,
) {
  await lista(page).getByRole('button', { name: 'Subir un logo', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Subir un logo', exact: true })
  await expect(modal).toBeVisible()
  await modal.getByLabel('Elegir el archivo del logo', { exact: true }).setInputFiles(archivo)
  await modal.getByLabel('Nombre', { exact: true }).fill(nombre)
  return modal
}

async function masAcciones(page: Page, nombre: string, accion: string) {
  await filas(page)
    .filter({ hasText: nombre })
    .getByRole('button', { name: `Más acciones de ${nombre}` })
    .click()
  await page.getByRole('menuitem', { name: accion, exact: true }).click()
}

async function altoDe(lugar: Locator) {
  const caja = await lugar.boundingBox()
  if (!caja) throw new Error('sin caja')
  return Math.round(caja.height)
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(120_000)
  await borrarPersonasDePrueba()
  antes = await tomarInstantaneaDeEmpresa()
  await restaurarEmpresa()
  duena = correoDePrueba(`duena-logos-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Lola Logos' })
})

test.afterAll(async () => {
  await restaurarEmpresa(antes)
  await borrarPersonasDePrueba()
})

test('E2E: sube un PNG con transparencia y un SVG, con sus motivos y sin saltos', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/empresa')
  await expect(tarjeta(page)).toBeVisible()
  await expect(tarjeta(page).getByText('Todavía no hay logos.')).toBeVisible()
  const altoSinLogos = await altoDe(tarjeta(page))
  await capturar(page, info, 'tarjeta-vacia')

  await abrirLaLista(page)
  await expect(filas(page)).toHaveCount(2) // «Principal» y «Para fondo oscuro»: fijas, sin archivo
  await expect(lista(page).getByText('0 de 12 logos propios.')).toBeVisible()

  // Un archivo que no sirve: el motivo queda junto a la zona del archivo y no se sube nada.
  let modal = await subir(
    page,
    { name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('hola') },
    'Ícono',
  )
  await expect(modal.getByRole('alert')).toContainText('SVG, PNG, WebP o JPEG')
  await modal.getByLabel('Elegir el archivo del logo', { exact: true }).setInputFiles({
    name: 'malo.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(SVG_CON_CODIGO),
  })
  await expect(modal.getByRole('alert')).toContainText('código o contenido incrustado')
  await modal
    .getByLabel('Elegir el archivo del logo', { exact: true })
    .setInputFiles({ name: 'pesado.png', mimeType: 'image/png', buffer: PNG_PESADO })
  await expect(modal.getByRole('alert')).toContainText('1 MB')
  await modal.getByRole('button', { name: 'Guardar logo', exact: true }).click()
  await expect(modal.getByRole('alert')).toContainText('Elige el archivo del logo.')
  expect(cuantasEnLaBase()).toBe(0)
  await capturar(page, info, 'motivo-del-archivo')

  // El PNG con transparencia: se guarda como PNG y conserva su canal alfa.
  await modal
    .getByLabel('Elegir el archivo del logo', { exact: true })
    .setInputFiles({ name: 'icono.png', mimeType: 'image/png', buffer: PNG_CON_TRANSPARENCIA })
  await expect(modal.getByRole('img', { name: 'Vista previa del logo elegido' })).toBeVisible()
  await modal.getByRole('button', { name: 'Guardar logo', exact: true }).click()
  await expect(page.getByText('Logo guardado.')).toBeVisible()
  await expect(modal).toBeHidden()
  await expect(lista(page)).toBeVisible()
  await expect(filas(page)).toHaveCount(3)
  expect(nombresEnLaBase()).toBe('Ícono')
  expect(sql(`select tipo || ' ' || ancho || 'x' || alto from public.logos_empresa`)).toBe(
    'png 64x64',
  )
  const png1 = await page.request.get(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''}/storage/v1/object/public/marca/${rutaDe('Ícono')}`,
  )
  expect(png1.ok()).toBe(true)
  // El color 6 (RGBA) del encabezado: la transparencia sigue ahí.
  expect((await png1.body())[25]).toBe(6)

  // Un SVG, tal cual.
  modal = await subir(
    page,
    { name: 'marca.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SVG) },
    'Monocromo',
  )
  await modal.getByRole('button', { name: 'Guardar logo', exact: true }).click()
  await expect(page.getByText('Logo guardado.')).toBeVisible()
  await expect(filas(page)).toHaveCount(4)
  expect(sql(`select tipo from public.logos_empresa where nombre = 'Monocromo'`)).toBe('svg')
  expect(nombresEnLaBase()).toBe('Ícono|Monocromo')

  // Un nombre que ya existe (sin mayúsculas ni tildes ni espacios) lo dice junto al campo.
  modal = await subir(
    page,
    { name: 'otra.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SVG) },
    ' icono ',
  )
  await modal.getByRole('button', { name: 'Guardar logo', exact: true }).click()
  await expect(modal.getByText('Ya existe «icono».')).toBeVisible()
  expect(cuantasEnLaBase()).toBe(2)
  await modal
    .getByRole('button', { name: 'Cancelar', exact: true })
    .click()
    .catch(() => undefined)
  await page.keyboard.press('Escape')

  // La tarjeta mide lo mismo con logos que sin ellos (nada salta).
  await page.goto('/configuracion/empresa')
  await expect(tarjeta(page).locator('img')).toHaveCount(2)
  expect(Math.abs((await altoDe(tarjeta(page))) - altoSinLogos)).toBeLessThanOrEqual(2)
  await capturar(page, info, 'tarjeta-con-logos')
})

test('E2E: renombra, ordena (menú, teclado y arrastre) y quita una que nadie usa', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirLaLista(page)
  await expect(filas(page)).toHaveCount(4)
  await capturar(page, info, 'lista')

  // Renombrar.
  await masAcciones(page, 'Monocromo', 'Renombrar…')
  const renombrar = page.getByRole('dialog', { name: /^Renombrar «Monocromo»/ })
  await renombrar.getByLabel('Nombre', { exact: true }).fill('Mono')
  await renombrar.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Logo renombrado.')).toBeVisible()
  await expect(lista(page)).toBeVisible()
  expect(nombresEnLaBase()).toBe('Ícono|Mono')
  expect(await nombresEnPantalla(page)).toBe('Principal|Para fondo oscuro|Ícono|Mono')

  // Ordenar desde el «⋯»: «Mover antes» y el foco vuelve al «⋯» de la fila movida.
  await masAcciones(page, 'Mono', 'Mover antes')
  await expect.poll(nombresEnLaBase).toBe('Mono|Ícono')
  await expect(page.getByRole('button', { name: 'Más acciones de Mono' })).toBeFocused()
  expect(await nombresEnPantalla(page)).toBe('Principal|Para fondo oscuro|Mono|Ícono')

  // Ordenar con el teclado: con el asa enfocada, ↓ baja la fila y el foco se queda en el asa.
  await page.getByRole('button', { name: 'Mover «Mono»' }).focus()
  await page.keyboard.press('ArrowDown')
  await expect.poll(nombresEnLaBase).toBe('Ícono|Mono')
  await expect(page.getByRole('button', { name: 'Mover «Mono»' })).toBeFocused()
  expect(await nombresEnPantalla(page)).toBe('Principal|Para fondo oscuro|Ícono|Mono')

  // Ordenar arrastrando el asa.
  const asa = page.getByRole('button', { name: 'Mover «Mono»' })
  const cajaAsa = await asa.boundingBox()
  const cajaDeArriba = await filas(page).filter({ hasText: 'Ícono' }).boundingBox()
  if (!cajaAsa || !cajaDeArriba) throw new Error('sin cajas')
  await page.mouse.move(cajaAsa.x + cajaAsa.width / 2, cajaAsa.y + cajaAsa.height / 2)
  await page.mouse.down()
  await page.mouse.move(cajaAsa.x + cajaAsa.width / 2, cajaAsa.y + 10, { steps: 4 })
  await page.mouse.move(cajaAsa.x + cajaAsa.width / 2, cajaDeArriba.y + 4, { steps: 8 })
  await page.mouse.up()
  await expect.poll(nombresEnLaBase).toBe('Mono|Ícono')

  // Las dos fijas no se ordenan ni se quitan: su «⋯» manda a Identidad.
  await expect(page.getByRole('button', { name: 'Mover «Principal»' })).toHaveCount(0)

  // Quitar una que nadie usa: confirma nombrándola y el archivo se va de Storage.
  const rutaMono = rutaDe('Mono')
  await masAcciones(page, 'Mono', 'Quitar…')
  const quitar = page
    .getByRole('alertdialog')
    .or(page.getByRole('dialog', { name: /^Quitar el logo «Mono»/ }))
  await expect(quitar.getByText('Ninguna ventana de cámara la usa.')).toBeVisible()
  await quitar.getByRole('button', { name: 'Quitar logo', exact: true }).click()
  await expect(page.getByText('«Mono» quitado.')).toBeVisible()
  expect(nombresEnLaBase()).toBe('Ícono')
  await expect
    .poll(async () => {
      const respuesta = await page.request.get(
        `${process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''}/storage/v1/object/public/marca/${rutaMono}`,
      )
      return respuesta.status()
    })
    .toBeGreaterThanOrEqual(400)
})

test.describe('en la ventana de cámara del Live', () => {
  // La ventana de cámara es de escritorio (desde 1024 px): sólo esta prueba fija un navegador de escritorio.
  test.use({ viewport: { width: 1280, height: 720 }, isMobile: false, hasTouch: false })
  const ventana = (page: Page) => page.locator('[data-ventana-de-camara]:not([data-minimizada])')

  test('E2E escritorio: elige la variante, la ventana la dibuja y quitarla avisa y la devuelve al principal', async ({
    page,
  }, info) => {
    sql(
      `delete from public.preferencias_usuario where clave = 'live.ventana' and usuario_id = (select id from public.perfiles where email = '${duena}')`,
    )
    // Con la empresa sin logo principal, la variante propia basta para que la opción exista.
    await entrar(page, duena, { fresco: true })
    await abrirLaLista(page)
    const modal = await subir(
      page,
      { name: 'mono.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SVG) },
      'Monocromo',
    )
    await modal.getByRole('button', { name: 'Guardar logo', exact: true }).click()
    await expect(page.getByText('Logo guardado.')).toBeVisible()
    await expect(filas(page)).toHaveCount(4)
    const idMono = sql(`select id from public.logos_empresa where nombre = 'Monocromo'`)
    const rutaMono = rutaDe('Monocromo')

    await page.goto('/')
    await encenderElLive(page)
    await expect(ventana(page)).toBeVisible()
    await ventana(page).getByRole('button', { name: 'Ajustes de la ventana de cámara' }).click()
    const ajustes = page.locator('[data-slot="popover-content"]')
    await expect(ajustes.getByRole('radio', { name: /Monocromo/ })).toBeVisible()
    await expect(ajustes.getByRole('radio', { name: /Ícono/ })).toBeVisible()
    await capturar(page, info, 'selector-de-logo')
    await ajustes.getByText('Monocromo', { exact: true }).click()
    await expect
      .poll(() => (JSON.parse(guardada() || '{}') as { logo?: string | null }).logo)
      .toBe(idMono)
    await page.keyboard.press('Escape')
    await expect(ventana(page).locator(`img[src*="${rutaMono}"]`)).toBeVisible()
    await capturar(page, info, 'ventana-con-la-variante')

    // Configuración se oculta con el Live encendido: se sale de él y se quita la que usa la ventana. El aviso dice cuántas personas y, al
    // confirmar, la ventana vuelve al principal.
    await page.goto('/configuracion/empresa')
    await page.getByRole('button', { name: 'Salir del Modo Live' }).click()
    await expect(page.locator('html')).not.toHaveClass(/\blive\b/)
    await abrirLaLista(page)
    await masAcciones(page, 'Monocromo', 'Quitar…')
    const quitar = page.getByRole('dialog', { name: /^Quitar el logo «Monocromo»/ })
    await expect(quitar.getByText('La usa la ventana de cámara de 1 persona.')).toBeVisible()
    await capturar(page, info, 'quitar-en-uso')
    await quitar.getByRole('button', { name: 'Quitar logo', exact: true }).click()
    await expect(page.getByText('«Monocromo» quitado.')).toBeVisible()
    await expect
      .poll(() => (JSON.parse(guardada() || '{}') as { logo?: string | null }).logo ?? null)
      .toBeNull()
    expect(nombresEnLaBase()).toBe('Ícono')
  })
})
