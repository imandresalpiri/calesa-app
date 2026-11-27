// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { esperarDosCuadros } from './soporte/barra-de-filtros'
import { entrar, limpiarInventario, prepararInventario } from './soporte/inventario'
import { literal, sql } from './soporte/sql'

// El editor de bloques de una guía (T581): la página es un lienzo con una barra fija y un panel que se oculta (cajón en el celular). Aquí, lo que
// sólo se ve recorriéndola: «/» inserta, el botón y el video se corrigen en «Bloque» y no guardan mal escritos, una imagen sube y se cuenta, el
// panel se acuerda de cómo quedó, la vista previa abre en un modal, salir con cambios pregunta y sin red no se publica. El HTML que sale de cada
// bloque y su lista blanca los prueban `supabase/tests/areas/web/doc-bloques.sql` y `doc.test.ts`. Las guías llevan el prefijo `e2e-guia-bloques-`.
test.describe.configure({ mode: 'serial' })

const UN_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
const DOC_INICIAL =
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Texto inicial"}]}]}'

let duena = ''

const borrarGuiasDePrueba = () => {
  sql("delete from public.web_guias where slug like 'e2e-guia-bloques-%'")
}

// Una guía sembrada con un párrafo; devuelve su id.
function sembrarGuia(slug: string, doc = DOC_INICIAL): string {
  sql(
    `insert into public.web_guias (titulo, slug, cuerpo_doc) values (${literal(`E2E ${slug}`)}, ${literal(slug)}, ${literal(doc)}::jsonb)`,
  )
  return sql(`select id from public.web_guias where slug = ${literal(slug)}`)
}

const cuerpoGuardado = (slug: string) =>
  sql(`select cuerpo_doc::text from public.web_guias where slug = ${literal(slug)}`)

test.beforeAll(async ({}, info) => {
  borrarGuiasDePrueba()
  const terreno = await prepararInventario(info.project.name, [
    'web.contenido.gestionar',
    'web.guias.publicar',
  ])
  duena = terreno.duena
})

test.afterAll(async () => {
  borrarGuiasDePrueba()
  await limpiarInventario()
})

const texto = (page: Page) => page.getByRole('textbox', { name: 'Texto de la guía', exact: true })
const titulo = (page: Page) => page.getByRole('textbox', { name: 'Título', exact: true })
const guardar = (page: Page) => page.getByRole('button', { name: 'Guardar borrador', exact: true })

async function abrirLaGuia(page: Page, id: string) {
  await entrar(page, duena)
  await page.goto(`/configuracion/web/guias/${id}`)
  await expect(texto(page)).toBeVisible()
}

// El cursor al final del texto. «Control+End» lo mueve el navegador y ProseMirror se entera con un `selectionchange` que llega después: su
// `keydown` sólo lo adelanta si ya estaba en cola, así que una tecla que sigue de inmediato (en un runner cargado) se aplicaría al inicio del
// documento. Dos cuadros dejan que ese aviso llegue antes de la tecla siguiente.
async function alFinalDelTexto(page: Page) {
  await texto(page).click()
  await page.keyboard.press('Control+End')
  await esperarDosCuadros(page)
}

// Al final del texto, en un párrafo nuevo y vacío: ahí se escribe «/».
async function alFinalEnUnParrafoNuevo(page: Page) {
  await alFinalDelTexto(page)
  await page.keyboard.press('Enter')
}

// Inserta un bloque con «/», lo busca por su nombre y lo elige con Enter.
async function insertarConBarra(page: Page, busqueda: string) {
  await page.keyboard.type(`/${busqueda}`)
  await expect(page.getByRole('listbox', { name: 'Bloques' })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('listbox', { name: 'Bloques' })).toHaveCount(0)
}

// Las opciones del bloque elegido, en la pestaña «Bloque» del panel.
async function abrirOpcionesDelBloque(page: Page) {
  await page
    .getByRole('toolbar', { name: 'Bloque' })
    .getByRole('button', { name: 'Opciones del bloque' })
    .click()
}

test('«/» inserta un separador y un título, y el texto se guarda con ellos', async ({ page }) => {
  const slug = 'e2e-guia-bloques-barra'
  await abrirLaGuia(page, sembrarGuia(slug))

  await alFinalEnUnParrafoNuevo(page)
  await insertarConBarra(page, 'separador')
  await page.keyboard.type('/titulo grande')
  await expect(page.getByRole('listbox', { name: 'Bloques' })).toBeVisible()
  await page.keyboard.press('Enter')
  await page.keyboard.type('Pasos')
  await expect(texto(page).locator('h2')).toHaveText('Pasos')
  await expect(texto(page).locator('hr')).toHaveCount(1)

  await guardar(page).click()
  await expect(page.getByText('Guía guardada')).toBeVisible()
  const guardado = cuerpoGuardado(slug)
  expect(guardado).toContain('"horizontalRule"')
  expect(guardado).toContain('"heading"')
  expect(guardado).toContain('Pasos')
})

test('el botón y el video se corrigen en «Bloque»: mal escritos no guardan', async ({ page }) => {
  const slug = 'e2e-guia-bloques-boton-video'
  await abrirLaGuia(page, sembrarGuia(slug))

  await alFinalEnUnParrafoNuevo(page)
  await insertarConBarra(page, 'boton')
  await abrirOpcionesDelBloque(page)
  await page.getByLabel('Texto del botón').fill('Cotiza ya')
  await page.getByLabel('Enlace', { exact: true }).fill('javascript:alert(1)')
  await guardar(page).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Ese enlace no se admite' }).first(),
  ).toBeVisible()
  expect(cuerpoGuardado(slug)).not.toContain('"button"')
  await page.getByLabel('Enlace', { exact: true }).fill('https://ejemplo.test/cotiza')

  await alFinalEnUnParrafoNuevo(page)
  await insertarConBarra(page, 'video')
  await abrirOpcionesDelBloque(page)
  await page.getByLabel('Enlace del video').fill('https://otro.test/video')
  await expect(
    page.getByText('Ese video no se admite: usa un enlace de YouTube o Vimeo.').first(),
  ).toBeVisible()
  await guardar(page).click()
  expect(cuerpoGuardado(slug)).not.toContain('"video"')

  await abrirOpcionesDelBloque(page)
  await page.getByLabel('Enlace del video').fill('https://youtu.be/dQw4w9WgXcQ')
  await expect(page.getByLabel('Enlace del video')).toHaveValue(
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  )
  await guardar(page).click()
  await expect(page.getByText('Guía guardada')).toBeVisible()

  const guardado = cuerpoGuardado(slug)
  expect(guardado).toContain('"button"')
  expect(guardado).toContain('https://ejemplo.test/cotiza')
  expect(guardado).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  expect(sql(`select cuerpo_html from public.web_guias where slug = ${literal(slug)}`)).toContain(
    'class="guia-video" data-video="youtube"',
  )
})

test('una imagen sube, se guarda con su ruta y la base la cuenta', async ({ page }) => {
  const slug = 'e2e-guia-bloques-imagen'
  await abrirLaGuia(page, sembrarGuia(slug))

  await alFinalEnUnParrafoNuevo(page)
  await page
    .getByLabel('Elegir imágenes')
    .setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: UN_PIXEL })
  await expect(texto(page).locator('img')).toHaveCount(1)
  await expect(guardar(page)).toBeEnabled({ timeout: 15_000 })
  await guardar(page).click()
  await expect(page.getByText('Guía guardada')).toBeVisible()

  const ruta = sql(
    `select (jsonb_path_query_first(cuerpo_doc, '$.content[*] ? (@.type == "image").attrs.ruta') #>> '{}') from public.web_guias where slug = ${literal(slug)}`,
  )
  expect(ruta).toMatch(/\.webp$/)
  expect(sql(`select public.storage_refcount('web', ${literal(ruta)})`)).toBe('1')
})

test('el panel se oculta y se acuerda al recargar', async ({ page }) => {
  await abrirLaGuia(page, sembrarGuia('e2e-guia-bloques-panel'))
  // Oculto = sin ancho y `inert` (no recibe foco ni clics); sigue en el DOM para que abrirlo no vuelva a pedir nada.
  const panel = page.getByRole('complementary', { name: 'Panel de la guía' })
  const ancho = () => panel.evaluate((nodo) => nodo.getBoundingClientRect().width)

  await expect(panel).not.toHaveAttribute('inert')
  await expect.poll(ancho).toBeGreaterThan(300)
  await page.getByRole('button', { name: 'Ocultar el panel' }).click()
  await expect(panel).toHaveAttribute('inert')
  await expect.poll(ancho).toBe(0)
  expect(await page.evaluate(() => localStorage.getItem('guia:panel'))).toBe('0')
  await page.reload()
  await expect(texto(page)).toBeVisible()
  await expect(panel).toHaveAttribute('inert')
  await expect.poll(ancho).toBe(0)
  await page.getByRole('button', { name: 'Mostrar el panel' }).click()
  await expect(panel).not.toHaveAttribute('inert')
  await expect.poll(ancho).toBeGreaterThan(300)
  expect(await page.evaluate(() => localStorage.getItem('guia:panel'))).toBe('1')
})

test('la vista previa abre en un modal por su dirección y se cierra', async ({ page }) => {
  await abrirLaGuia(page, sembrarGuia('e2e-guia-bloques-vista'))
  await alFinalDelTexto(page)
  await page.keyboard.type(' y más')

  await page.getByRole('button', { name: 'Vista previa' }).click()
  await expect(page).toHaveURL(/panel=vista-previa/)
  const modal = page.getByRole('dialog')
  await expect(modal).toBeVisible()
  await expect(modal.getByText('Texto inicial y más')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=vista-previa/)
  await expect(texto(page)).toContainText('Texto inicial y más')
})

test('salir con cambios pregunta: seguir conserva el texto y descartar vuelve a Guías', async ({
  page,
}) => {
  await abrirLaGuia(page, sembrarGuia('e2e-guia-bloques-salir'))
  await alFinalDelTexto(page)
  await page.keyboard.type(' sin guardar')

  const volver = page.getByRole('link', { name: '← Guías' })
  await volver.click()
  await expect(page.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await page.getByRole('button', { name: 'Seguir editando' }).click()
  await expect(page.getByText('Tienes cambios sin guardar.')).toHaveCount(0)
  await expect(texto(page)).toContainText('sin guardar')

  await volver.click()
  await page.getByRole('button', { name: 'Descartar', exact: true }).click()
  await expect(page).toHaveURL(/\/configuracion\/web\/guias$/)
})

test('deshacer y rehacer, y Enter en el título pasa al texto', async ({ page }) => {
  await abrirLaGuia(page, sembrarGuia('e2e-guia-bloques-historia'))
  const deshacer = page.getByRole('button', { name: 'Deshacer' })
  await expect(deshacer).toBeDisabled()

  await alFinalDelTexto(page)
  await page.keyboard.type(' extra')
  await expect(deshacer).toBeEnabled()
  await deshacer.click()
  await expect(texto(page)).not.toContainText('extra')
  await page.getByRole('button', { name: 'Rehacer' }).click()
  await expect(texto(page)).toContainText('extra')

  await titulo(page).click()
  await page.keyboard.press('Enter')
  await expect(texto(page)).toBeFocused()
  await expect(titulo(page)).toHaveValue('E2E e2e-guia-bloques-historia')
})

test('sin conexión se avisa y no se publica; al volver, sí', async ({ page, context }) => {
  await abrirLaGuia(page, sembrarGuia('e2e-guia-bloques-red'))
  await context.setOffline(true)
  await expect(
    page.getByText('Sin conexión: tu borrador queda aquí y se guarda cuando vuelva.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publicar', exact: true })).toBeDisabled()
  await context.setOffline(false)
  await expect(
    page.getByText('Sin conexión: tu borrador queda aquí y se guarda cuando vuelva.'),
  ).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Publicar', exact: true })).toBeEnabled()
})
