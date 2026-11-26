import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { admin } from './soporte/base'
import {
  COPART,
  ENLACE_DE_COPART,
  ficha,
  fijarApibara,
  leerApibara,
  restaurarApibara,
  simularApibara,
  type EstadoDeApibara,
} from './soporte/apibara'
import { borrarFotosDe, fotosDe, urlDeObjeto } from './soporte/fotos'
import { aLaVista, entrar, menuDeVehiculo } from './soporte/inventario'
import { PREFIJO_CLAVE_E2E, crearOrigenDePrueba } from './soporte/origenes'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { borrarVehiculosDe } from './soporte/vehiculos'
import {
  TITULO,
  alInventario,
  filaDe,
  limpiarLista,
  prepararLista,
  sembrarFotos,
  type TerrenoDeLaLista,
} from './soporte/vehiculos-lista'

// El «⋯» del vehículo (T336): las mismas acciones, en el mismo orden, en la fila, la tarjeta y la ficha, con «Cotizar vehículo» primero y destacado; y
// publicar en la web, editar las imágenes y actualizar los datos de la subasta sin salir de la lista. Capturas: `E2E_CAPTURAS=e2e-capturas/t336`.
test.describe.configure({ mode: 'serial' })

const CLAVE_DE_SUBASTA = 'subasta_menu'
const DE_SUBASTA = 'Ford Bronco del menú'
const TODAS = [
  'Cotizar vehículo',
  'Editar',
  'Editar imágenes',
  'Publicar en la web…',
  'Ver actividad',
  'Enviar a la papelera',
]

let t: TerrenoDeLaLista
let subasta = { id: '', nombre: '' }
let deSubasta = ''
let apibaraAntes: EstadoDeApibara | null = null

test.beforeAll(async ({}, info) => {
  t = await prepararLista(`${info.project.name}_vmenu`, [
    'vehiculos.vitrina',
    'vehiculos.eliminar',
    'cotizaciones.crear',
    'cotizaciones.ver',
    'actividad.ver',
    'empresa.ajustes.gestionar',
  ])
  sql(
    `update public.vehiculos set publicado_web = false, precio_web = null, precio_web_hasta = null where id = ${literal(t.id)}::uuid`,
  )
  await sembrarFotos(t.id, 2)
  // La versión de las fotos (la escribe la primera subida): sin ella, mover o fijar la portada no se mandan.
  sql(
    `insert into public.vehiculos_imagenes_version (vehiculo_id, actualizado_en) values (${literal(t.id)}::uuid, now()) on conflict (vehiculo_id) do update set actualizado_en = now()`,
  )
  // Lo que haya quedado de una corrida cortada (sólo este origen: los demás de prueba tienen vehículos de otros specs).
  await borrarVehiculosDe([`${PREFIJO_CLAVE_E2E}${CLAVE_DE_SUBASTA}`])
  await admin().from('origenes').delete().eq('clave', `${PREFIJO_CLAVE_E2E}${CLAVE_DE_SUBASTA}`)
  subasta = await crearOrigenDePrueba('Subasta del menú', CLAVE_DE_SUBASTA, {
    tipo: 'subasta',
    plataformas: ['copart', 'iaai'],
  })
  const { data, error } = await admin()
    .from('vehiculos')
    .insert({ origen_id: subasta.id, titulo: DE_SUBASTA, url_origen: ENLACE_DE_COPART })
    .select('id')
    .single<{ id: string }>()
  if (error) {
    throw new Error(`No se pudo cargar el vehículo de subasta: ${error.message}`)
  }
  deSubasta = data.id
  apibaraAntes = await leerApibara()
  await fijarApibara(true)
})

test.afterAll(async () => {
  if (apibaraAntes) {
    await restaurarApibara(apibaraAntes)
  }
  await borrarFotosDe([deSubasta].filter(Boolean))
  await borrarVehiculosDe([`${PREFIJO_CLAVE_E2E}${CLAVE_DE_SUBASTA}`])
  // Sin vehículos, el origen de subasta cae con los demás de prueba (`borrarOrigenes()` dentro de `limpiarInventario()`).
  await limpiarLista(t.id)
})

async function opciones(menu: Locator): Promise<string[]> {
  const textos = await menu.locator('[role=menuitem]').allInnerTexts()
  return textos.map((texto) => texto.trim())
}

// Abre el «⋯» que está a la vista y lo espera (un clic antes de hidratar se pierde).
async function abrir(boton: Locator, page: Page): Promise<Locator> {
  const menu = page.getByRole('menu')
  await expect(async () => {
    if (!(await menu.isVisible())) {
      await boton.click()
    }
    await expect(menu).toBeVisible({ timeout: 1000 })
  }).toPass()
  return menu
}

async function cerrar(page: Page, menu: Locator) {
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
}

async function esElMenuUnico(menu: Locator) {
  expect(await opciones(menu)).toEqual(TODAS)
  const cotizar = menu.getByRole('menuitem', { name: 'Cotizar vehículo' })
  await expect(cotizar).toHaveAttribute('data-principal', '')
  await expect(menu.locator('[data-principal]')).toHaveCount(1)
  // Cotizar; editar, imágenes y la web; actividad; la papelera.
  await expect(menu.getByRole('separator')).toHaveCount(3)
}

const menuDeLaFicha = (page: Page) =>
  page.getByRole('button', { name: `Más acciones de ${TITULO}` })

test('la fila, la tarjeta y la ficha tienen el mismo «⋯», con «Cotizar vehículo» primero', async ({
  page,
}, info) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const deLaFila = await abrir(menuDeVehiculo(page, TITULO), page)
  await esElMenuUnico(deLaFila)
  await capturar(page, info, 'menu-del-vehiculo-fila')
  await cerrar(page, deLaFila)

  await alInventario(page, t.terreno.corea.id, '&vista=tarjetas')
  const deLaTarjeta = await abrir(menuDeVehiculo(page, TITULO), page)
  await esElMenuUnico(deLaTarjeta)
  await capturar(page, info, 'menu-del-vehiculo-tarjeta')
  await cerrar(page, deLaTarjeta)

  await page.goto(`/vehiculos/${t.id}`)
  await expect(page.getByRole('heading', { name: TITULO, level: 1 })).toBeVisible()
  const deLaFicha = await abrir(menuDeLaFicha(page), page)
  await esElMenuUnico(deLaFicha)
  await capturar(page, info, 'menu-del-vehiculo-ficha')
  await cerrar(page, deLaFicha)
})

test('«Cotizar vehículo» abre la hoja con el vehículo y «Volver» regresa a la lista con su consulta', async ({
  page,
}) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id, '&por=25')
  const menu = await abrir(menuDeVehiculo(page, TITULO), page)
  await menu.getByRole('menuitem', { name: 'Cotizar vehículo' }).click()
  await expect(page).toHaveURL(/\/cotizaciones\/nuevo\?/)
  const url = new URL(page.url())
  expect(url.searchParams.get('vehiculo')).toBe(t.id)
  expect(url.searchParams.get('returnTo')).toBe(`/vehiculos?origen=${t.terreno.corea.id}&por=25`)
  // (Corea no tiene fórmula publicada en este terreno: la hoja lo dice; lo que importa aquí es el vehículo y la vuelta.)
  await page.getByRole('link', { name: 'Volver' }).click()
  await expect(page).toHaveURL(new RegExp(`/vehiculos\\?origen=${t.terreno.corea.id}&por=25$`))
})

test('«Publicar en la web…» abre el panel completo sin salir de la lista y publica', async ({
  page,
}, info) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const menu = await abrir(menuDeVehiculo(page, TITULO), page)
  await menu.getByRole('menuitem', { name: 'Publicar en la web…' }).click()
  await expect(page).toHaveURL(/\/vehiculos\?.*panel=vitrina/)
  await expect(page).toHaveURL(new RegExp(`para=${t.id}`))
  const panel = page.getByRole('dialog', { name: 'Publicar en la web' })
  // El panel de la ficha: el interruptor, el precio y lo que verá el visitante.
  await expect(panel.getByRole('switch', { name: 'Publicado en la web' })).toBeVisible()
  await capturar(page, info, 'vitrina-desde-la-lista')
  await panel.getByRole('switch', { name: 'Publicado en la web' }).click()
  await panel.getByLabel('Precio público').fill('18500')
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await expect(panel).toBeHidden()
  await expect
    .poll(() =>
      sql(
        `select publicado_web::text || ':' || (precio_web = 18500)::text from public.vehiculos where id = ${literal(t.id)}::uuid`,
      ),
    )
    .toBe('true:true')
  // La fila lo dice: ahora ofrece sacarlo de la web.
  await expect(
    filaDe(page, TITULO).getByRole('button', { name: `Sacar «${TITULO}» de la web` }),
  ).toBeVisible()
})

test('el «Publicar» de la fila abre el mismo panel; «Sacar de la web» sigue de un toque con «Deshacer»', async ({
  page,
}) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  // Ya publicado (la prueba anterior, o aquí si corre sola): sacar es un toque.
  sql(`update public.vehiculos set publicado_web = true where id = ${literal(t.id)}::uuid`)
  await page.reload()
  await filaDe(page, TITULO)
    .getByRole('button', { name: `Sacar «${TITULO}» de la web` })
    .click()
  const aviso = page.locator('[data-sonner-toast]').filter({ hasText: 'salió de la web' })
  await expect(aviso).toBeVisible()
  await expect
    .poll(() =>
      sql(`select publicado_web::text from public.vehiculos where id = ${literal(t.id)}::uuid`),
    )
    .toBe('false')
  // Sin publicar, el botón abre el panel completo.
  await filaDe(page, TITULO)
    .getByRole('button', { name: `Publicar «${TITULO}» en la web` })
    .click()
  const panel = page.getByRole('dialog', { name: 'Publicar en la web' })
  await expect(panel.getByRole('switch', { name: 'Publicado en la web' })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`panel=vitrina&para=${t.id}`))
})

test('«Editar imágenes» abre su drawer; la portada nueva se ve en la lista al cerrar', async ({
  page,
}, info) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const menu = await abrir(menuDeVehiculo(page, TITULO), page)
  await menu.getByRole('menuitem', { name: 'Editar imágenes' }).click()
  await expect(page).toHaveURL(new RegExp(`panel=imagenes&para=${t.id}`))
  const panel = page.getByRole('dialog', { name: 'Editar imágenes' })
  await expect(panel.getByRole('button', { name: 'Usar la foto 2 como portada' })).toBeVisible()
  await capturar(page, info, 'imagenes-desde-la-lista')
  await panel.getByRole('button', { name: 'Usar la foto 2 como portada' }).click()
  await expect
    .poll(async () => (await fotosDe(t.id)).map((foto) => foto.es_portada))
    .toEqual([false, true])
  const nueva = (await fotosDe(t.id))[1]?.ruta_miniatura ?? ''
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(
    aLaVista(filaDe(page, TITULO).locator(`img[src="${urlDeObjeto(nueva)}"]`)),
  ).toHaveCount(1)
})

test('«Ver actividad» lleva a la actividad del vehículo', async ({ page }) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const menu = await abrir(menuDeVehiculo(page, TITULO), page)
  await menu.getByRole('menuitem', { name: 'Ver actividad' }).click()
  await expect(page).toHaveURL(new RegExp(`/actividad\\?entidad=vehiculos&registro=${t.id}$`))
})

test('«Actualizar los datos» pide confirmar y dice el resultado; en un origen manual no está', async ({
  page,
}, info) => {
  test.setTimeout(120_000)
  await entrar(page, t.terreno.duena)
  const pedidos = await simularApibara(page, () =>
    ficha({ ...COPART, title: DE_SUBASTA }, ENLACE_DE_COPART),
  )
  await alInventario(page, subasta.id)
  const menu = await abrir(menuDeVehiculo(page, DE_SUBASTA), page)
  // Las fechas de la subasta se editan en la ficha (ahí está su modal): la lista no las ofrece.
  expect(await opciones(menu)).not.toContain('Editar fechas de subasta')
  await menu.getByRole('menuitem', { name: 'Actualizar los datos' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Actualizar los datos' })
  await expect(
    dialogo.getByText('Consultar a apibara gasta cuota. ¿Actualizar ahora?'),
  ).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`panel=actualizar-datos&para=${deSubasta}`))
  await capturar(page, info, 'actualizar-los-datos')
  expect(pedidos).toEqual([])
  await dialogo.getByRole('button', { name: 'Sí, actualizar' }).click()
  await expect(dialogo).toBeHidden()
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: /^Subasta actualizada/ }),
  ).toBeVisible()
  expect(pedidos.filter((pedido) => pedido.accion === 'ficha')).toEqual([
    { accion: 'ficha', origen: subasta.id, entrada: ENLACE_DE_COPART },
  ])
  await expect
    .poll(() =>
      sql(
        `select (apibara_sync_en is not null)::text from public.vehiculos where id = ${literal(deSubasta)}::uuid`,
      ),
    )
    .toBe('true')
  // Y trae las fotos de la respuesta que el vehículo no tenía, con esa misma respuesta (sin otra consulta de ficha).
  await expect.poll(async () => (await fotosDe(deSubasta)).length, { timeout: 60_000 }).toBe(14)
  expect(pedidos.filter((pedido) => pedido.accion === 'ficha')).toHaveLength(1)

  // En un origen manual no se ofrece.
  await alInventario(page, t.terreno.corea.id)
  const manual = await abrir(menuDeVehiculo(page, TITULO), page)
  expect(await opciones(manual)).not.toContain('Actualizar los datos')
})

test('«Editar fechas de subasta» está en el «⋯» de la ficha de una subasta y no en la de un origen manual', async ({
  page,
}) => {
  await entrar(page, t.terreno.duena)
  await page.goto(`/vehiculos/${deSubasta}`)
  await expect(page.getByRole('heading', { name: DE_SUBASTA, level: 1 })).toBeVisible()
  const deLaSubasta = await abrir(
    page.getByRole('button', { name: `Más acciones de ${DE_SUBASTA}` }),
    page,
  )
  expect(await opciones(deLaSubasta)).toContain('Editar fechas de subasta')
  await cerrar(page, deLaSubasta)
  await page.goto(`/vehiculos/${t.id}`)
  await expect(page.getByRole('heading', { name: TITULO, level: 1 })).toBeVisible()
  const manual = await abrir(page.getByRole('button', { name: `Más acciones de ${TITULO}` }), page)
  expect(await opciones(manual)).not.toContain('Editar fechas de subasta')
})
