import { expect, test, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import {
  restaurarEmpresa,
  tomarInstantaneaDeEmpresa,
  type InstantaneaDeEmpresa,
} from './soporte/empresa'
import { ingresar } from './soporte/pasos'
import { capturar } from './soporte/recorrido'

// Compartir los tipos de cambio con un cliente desde el popover de la barra: la imagen (PNG, armada en el servidor con la sesión) y el texto para
// WhatsApp, de los tipos que se elijan (por defecto los de la barra), con la leyenda que la empresa escribe en Configuración › Empresa › Monedas.
// La empresa es una fila única: se guarda cómo estaba y se deja así al terminar. Corre en los dos proyectos; el menú de compartir del sistema se
// prueba con uno simulado (Chromium de escritorio no lo trae).
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const LEYENDA = 'Valores referenciales de hoy'
const PNG = [0x89, 0x50, 0x4e, 0x47]

let duena = ''
let asesora = ''
let antes: InstantaneaDeEmpresa
let idOficial = ''
let idParalelo = ''

async function idDelTipo(clave: string): Promise<string> {
  const { data, error } = await admin()
    .from('tipos_cambio')
    .select('id')
    .eq('clave', clave)
    .single<{ id: string }>()
  if (error) {
    throw new Error(`No se pudo leer el tipo de cambio ${clave}: ${error.message}`)
  }
  return data.id
}

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  antes = await tomarInstantaneaDeEmpresa()
  await restaurarEmpresa()
  // La leyenda que la empresa escribió (su pantalla la prueba `compartir-tipos-de-cambio-leyenda.spec.ts`).
  const { error } = await admin()
    .from('ajustes_empresa')
    .update({ leyenda_tipos_cambio: LEYENDA })
    .eq('id', 1)
  if (error) {
    throw new Error(`No se pudo escribir la leyenda: ${error.message}`)
  }
  const proyecto = info.project.name
  duena = correoDePrueba(`duena-compartir-${proyecto}`)
  asesora = correoDePrueba(`asesora-compartir-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Compartir' })
  // Quien sólo mira los tipos de cambio: comparte, pero no escribe la leyenda.
  await crearPersona({ email: asesora, contrasena: CLAVE, nombre: 'Ana Asesora', invitada: true })
  await darRolDePrueba({
    email: asesora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Asesora ${proyecto}`, clave: `e2e_asesora_comp_${proyecto}` },
    permisos: ['leads.ver'],
  })
  idOficial = await idDelTipo('oficial')
  idParalelo = await idDelTipo('paralelo')
})

test.afterAll(async () => {
  await restaurarEmpresa(antes)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function entrar(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

// Donde el navegador trae el menú de compartir del sistema, «Compartir» lo usa y «Copiar imagen» no se ofrece: estas pruebas miran el camino del
// escritorio, que copia y descarga.
async function sinMenuDelSistema(page: Page) {
  await page.addInitScript(() => {
    delete (Navigator.prototype as { share?: unknown }).share
  })
}

// Abre el popover de la barra y espera la lista; «Compartir» abre el panel con lo que ya viene marcado.
async function abrirCompartir(page: Page) {
  await page
    .locator('header [data-hueco="tipo-cambio"]')
    .getByRole('button', { name: 'Tipos de cambio' })
    .click()
  const popover = page.getByRole('dialog', { name: 'Tipos de cambio' })
  await expect(popover.getByRole('listitem').filter({ hasText: 'Oficial' })).toBeVisible()
  await popover.getByRole('button', { name: 'Compartir', exact: true }).click()
  await expect(popover.getByRole('heading', { name: 'Compartir tipos de cambio' })).toBeVisible()
  return popover
}

test('el panel trae lo de la barra y quitar o sumar una casilla cambia el texto', async ({
  page,
  context,
}, info) => {
  await sinMenuDelSistema(page)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await entrar(page, duena)
  const popover = await abrirCompartir(page)
  const texto = popover.getByLabel('Texto', { exact: true })

  // Por defecto, los de la barra (la semilla deja el oficial): el texto trae la empresa, el momento, el tipo y la leyenda.
  await expect(popover.getByRole('checkbox', { name: /Oficial/ })).toBeChecked()
  await expect(popover.getByRole('checkbox', { name: /Paralelo/ })).not.toBeChecked()
  await expect(texto).toHaveValue(
    /^\*Mi importadora\*\nTipos de cambio · \d{1,2} \w+ \d{4}, \d{2}:\d{2} /,
  )
  await expect(texto).toHaveValue(/Oficial: 1 USD = Bs\s11,68/)
  await expect(texto).toHaveValue(new RegExp(`${LEYENDA}$`))
  await expect(texto).not.toHaveValue(/Paralelo/)

  // Sumar una casilla la trae al texto; quitar otra la saca. Sólo para este envío: la barra no cambia.
  await popover.getByRole('checkbox', { name: /Paralelo/ }).click()
  await expect(texto).toHaveValue(/Paralelo: 1 USD = Bs\s12,20/)
  await popover.getByRole('checkbox', { name: /Oficial/ }).click()
  await expect(texto).not.toHaveValue(/Oficial/)
  await expect(texto).toHaveValue(/Paralelo/)
  await expect(
    popover.getByRole('img', { name: 'Vista previa de la imagen que se comparte' }),
  ).toBeVisible()
  await capturar(page, info, 'panel')

  // «Copiar texto» deja en el portapapeles lo mismo que se ve.
  await popover.getByRole('button', { name: 'Copiar texto' }).click()
  await expect(page.getByText('Texto copiado')).toBeVisible()
  const copiado = await page.evaluate(() => navigator.clipboard.readText())
  expect(copiado).toContain('Paralelo: 1 USD = Bs')
  expect(copiado).toContain(LEYENDA)
  expect(copiado).not.toContain('Oficial')

  // «Copiar imagen» deja un PNG.
  await popover.getByRole('button', { name: 'Copiar imagen' }).click()
  await expect(page.getByText('Imagen copiada')).toBeVisible()
  const tipos = await page.evaluate(async () => {
    const items = await navigator.clipboard.read()
    return items.flatMap((item) => item.types)
  })
  expect(tipos).toContain('image/png')

  // Ninguna casilla: todo apagado con su motivo.
  await popover.getByRole('checkbox', { name: /Paralelo/ }).click()
  await expect(popover.getByRole('button', { name: 'Copiar texto' })).toBeDisabled()
  await expect(popover.getByRole('button', { name: 'Descargar' })).toBeDisabled()
  await expect(popover.getByText('Elige al menos un tipo de cambio.').first()).toBeVisible()

  // Volver deja la lista; las casillas del próximo «Compartir» vuelven a los de la barra.
  await popover.getByRole('button', { name: 'Volver a los tipos de cambio' }).click()
  await expect(popover.getByRole('listitem').filter({ hasText: 'Oficial' })).toBeVisible()
})

test('«Descargar» baja el PNG', async ({ page }) => {
  await entrar(page, duena)
  const popover = await abrirCompartir(page)
  const boton = popover.getByRole('button', { name: 'Descargar' })
  await expect(boton).toBeEnabled()
  const [descarga] = await Promise.all([page.waitForEvent('download'), boton.click()])
  expect(descarga.suggestedFilename()).toBe('tipos-de-cambio.png')
})

test('la ruta de la imagen da image/png con sesión y rechaza sin ella', async ({
  page,
  playwright,
  baseURL,
}) => {
  await entrar(page, asesora)
  const ids = `${idOficial},${idParalelo}`
  const con = await page.request.get(`/tipos-de-cambio/imagen?ids=${ids}`)
  expect(con.status()).toBe(200)
  expect(con.headers()['content-type']).toBe('image/png')
  expect(con.headers()['cache-control']).toContain('no-store')
  const cuerpo = await con.body()
  expect([...cuerpo.subarray(0, 4)]).toEqual(PNG)
  // Una imagen de verdad: los píxeles de la franja y del texto pesan más que un archivo vacío.
  expect(cuerpo.byteLength).toBeGreaterThan(5_000)

  const texto = await page.request.get(`/tipos-de-cambio/texto?ids=${ids}`)
  expect(texto.status()).toBe(200)
  expect(texto.headers()['content-type']).toContain('text/plain')
  expect(await texto.text()).toContain(`${LEYENDA}`)

  // Lo que no es una lista de guid, o ninguno activo: 400 y 404, sin tocar la base.
  expect((await page.request.get('/tipos-de-cambio/imagen?ids=nada')).status()).toBe(400)
  expect((await page.request.get('/tipos-de-cambio/imagen')).status()).toBe(400)
  expect(
    (
      await page.request.get('/tipos-de-cambio/texto?ids=00000000-0000-4000-8000-000000000000')
    ).status(),
  ).toBe(404)

  // Sin sesión: el proxy manda al ingreso, nunca una imagen.
  const anonimo = await playwright.request.newContext({ baseURL })
  for (const ruta of ['imagen', 'texto']) {
    const sin = await anonimo.get(`/tipos-de-cambio/${ruta}?ids=${ids}`, { maxRedirects: 0 })
    expect(sin.status()).toBe(307)
    expect(sin.headers()['location']).toContain('/ingreso')
    expect(sin.headers()['content-type'] ?? '').not.toContain('image/png')
  }
  await anonimo.dispose()
})

test('si la imagen falla se dice con «Reintentar» y el texto sigue disponible', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.route('**/tipos-de-cambio/imagen**', (ruta) =>
    ruta.fulfill({ status: 500, contentType: 'text/plain', body: 'falló' }),
  )
  const popover = await abrirCompartir(page)
  await expect(popover.getByText('No se pudo armar la imagen.')).toBeVisible()
  // El texto no depende de la imagen.
  await expect(popover.getByLabel('Texto', { exact: true })).toHaveValue(/Oficial/)
  await expect(popover.getByRole('button', { name: 'Copiar texto' })).toBeEnabled()
  await expect(popover.getByRole('button', { name: 'Descargar' })).toBeDisabled()

  await page.unroute('**/tipos-de-cambio/imagen**')
  await popover.getByRole('button', { name: 'Reintentar' }).click()
  await expect(
    popover.getByRole('img', { name: 'Vista previa de la imagen que se comparte' }),
  ).toBeVisible()
  await expect(popover.getByRole('button', { name: 'Descargar' })).toBeEnabled()
})

test('sin conexión se dice y se puede reintentar', async ({ page }) => {
  await entrar(page, duena)
  await page.route('**/tipos-de-cambio/texto**', (ruta) => ruta.abort('internetdisconnected'))
  const popover = await abrirCompartir(page)
  await expect(popover.getByText('No se pudo armar el texto.')).toBeVisible()
  await expect(popover.getByText('No hay conexión. Vuelve a intentar cuando vuelva.')).toBeVisible()
  await page.unroute('**/tipos-de-cambio/texto**')
  await popover.getByRole('button', { name: 'Reintentar' }).click()
  await expect(popover.getByLabel('Texto', { exact: true })).toHaveValue(/Oficial/)
})

test('con el Modo Live no se ofrece compartir', async ({ page }) => {
  await entrar(page, duena)
  const live = page.getByRole('button', { name: 'Modo Live: ocultar los símbolos de moneda' })
  await live.click()
  await expect(live).toHaveAttribute('aria-pressed', 'true')
  await page
    .locator('header [data-hueco="tipo-cambio"]')
    .getByRole('button', { name: 'Tipos de cambio' })
    .click()
  const popover = page.getByRole('dialog', { name: 'Tipos de cambio' })
  await expect(popover.getByRole('listitem').filter({ hasText: 'Oficial' })).toBeVisible()
  await expect(popover.getByRole('button', { name: 'Compartir', exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await live.click()
  await expect(live).toHaveAttribute('aria-pressed', 'false')
})

test('en el celular «Compartir» abre el menú del sistema con la imagen y el texto', async ({
  page,
  isMobile,
}, info) => {
  test.skip(!isMobile, 'El menú de compartir del sistema es del celular.')
  await page.addInitScript(() => {
    const llamadas: { texto?: string; archivos: number }[] = []
    Object.assign(window, { __compartidos: llamadas })
    navigator.canShare = (datos) => (datos?.files?.length ?? 0) > 0
    navigator.share = (datos) => {
      llamadas.push({ texto: datos?.text, archivos: datos?.files?.length ?? 0 })
      return Promise.resolve()
    }
  })
  await entrar(page, asesora)
  const popover = await abrirCompartir(page)
  const compartir = popover.getByRole('button', { name: 'Compartir', exact: true })
  await expect(compartir).toBeEnabled()
  // En el celular se comparte y se copia el texto o se descarga; «Copiar imagen» queda para el escritorio.
  await expect(popover.getByRole('button', { name: 'Copiar imagen' })).toHaveCount(0)
  await capturar(page, info, 'panel-celular')
  await compartir.click()
  const llamadas = await page.evaluate(
    () =>
      (window as unknown as { __compartidos: { texto?: string; archivos: number }[] })
        .__compartidos,
  )
  expect(llamadas).toHaveLength(1)
  expect(llamadas[0]?.archivos).toBe(1)
  expect(llamadas[0]?.texto).toContain('Oficial: 1 USD = Bs')
  expect(llamadas[0]?.texto).toContain(LEYENDA)
})

test('si el navegador no copia imágenes, el botón se apaga y dice por qué', async ({ page }) => {
  await sinMenuDelSistema(page)
  await page.addInitScript(() => {
    Object.defineProperty(window, 'ClipboardItem', { value: undefined, configurable: true })
  })
  await entrar(page, duena)
  const popover = await abrirCompartir(page)
  await expect(popover.getByRole('button', { name: 'Copiar imagen' })).toBeDisabled()
  await expect(popover.getByText('Este navegador no permite copiar imágenes.')).toBeVisible()
  await expect(popover.getByRole('button', { name: 'Descargar' })).toBeEnabled()
})
