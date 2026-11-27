import type { APIResponse, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { tipearEnLaHoja } from './soporte/cotizar-guardar'
import { guardarLaHojaAbierta, leerElPdf, mandarALaPapelera } from './soporte/cotizar-pdf'
import {
  abrirLaHoja,
  abrirLaVistaPrevia,
  alDia,
  anotar,
  cerrarLaVistaPrevia,
  hoja,
  variable,
} from './soporte/cotizar-vista-previa'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import {
  anchoCargado,
  crearSinCotizaciones,
  esperarLaListaAsentada,
  exigirElMismo404,
  exigirLaImagenConSu304,
  plantillaConElAsesor,
  ponerElPerfilDelAsesor,
  quitarLaFoto,
  tarjetasALaVista,
  vigilarLasMiniaturas,
} from './soporte/imagen-de-la-tarjeta'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { cabeceraDeLaGuardada } from './soporte/menu-de-la-guardada'
import { crearOrigenDePrueba, PREFIJO_CLAVE_E2E } from './soporte/origenes'
import { capturar, crearAsesoraDeLaSemilla } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import {
  copiarLaFormulaDeLaSubasta,
  crearVehiculo,
  publicarComoLaDuena,
} from './soporte/tarjeta-cuadricula'

// La imagen de la tarjeta (`docs/COTIZADOR.md` › «La imagen de la tarjeta»): se arma al pedirla y para quien la pide, que es el asesor de la tarjeta. Ana (asesora)
// crea; Luis (el dueño) la mira y la comparte: la vista previa, el texto de «Compartir», la imagen y el PDF dicen a Luis, con su WhatsApp, su cargo y su foto, y
// Ana sigue como «Creado por». La lista pide sólo las miniaturas a la vista y de a cuatro; con la ETag de quien mira, 304; otro cargo u otra plantilla, otra ETag.
// Con el Modo Live, la variante sin moneda con su visor y su ETag; la clave vieja del visor lo abre; lo que no se ve, el 404 del PDF. Un origen
// propio con la fórmula de la subasta y la réplica de V1 con las celdas del asesor: nunca la plantilla de la semilla.
test.describe.configure({ mode: 'serial' })

const RAIZ = 'imgtj_'
const LUIS = { nombre: 'Luis Comparte', telefono: '+59175550199', cargo: 'Jefe de ventas' }
const SEMBRADAS = 20
const INEXISTENTE = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'

let asesora = { email: '', nombre: '' }
let luis = ''
let lead = ''
let origen = ''
let vehiculo = ''
let sinClave = ''
let foto = ''
let guardada = ''

const rutaDeLaImagen = (id: string, consulta = '') => `/cotizaciones/${id}/imagen${consulta}`
const numeroDe = (id: string) =>
  sql(`select numero from public.cotizaciones where id = ${literal(id)}::uuid`)
const textoDeLaImagen = (id: string) => `Imagen de la tarjeta de la cotización n.º ${numeroDe(id)}`
const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const panelDeCompartir = (page: Page) => page.getByRole('dialog', { name: 'Compartir cotización' })
const listaDelOrigen = (resto = '') => `/cotizaciones?origen=${origen}&agrupar=no${resto}`
const etiquetaDe = (r: APIResponse) => r.headers()['etag'] ?? ''

function borrarLoDeEsteSpec(): void {
  const mios = `select id from public.origenes where clave like '${PREFIJO_CLAVE_E2E}${RAIZ}%'`
  sql(`
    delete from public.cotizaciones where origen_id in (${mios});
    delete from public.vehiculos where origen_id in (${mios});
    delete from public.origenes where id in (${mios})`)
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  const proyecto = info.project.name
  borrarLoDeEsteSpec()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  // El dueño primero: una persona invitada pide que la empresa ya tenga dueño.
  luis = correoDePrueba(`dueno-imagen-${proyecto}`)
  await crearDuenaDePrueba({ email: luis, contrasena: CONTRASENA, nombre: LUIS.nombre })
  foto = await ponerElPerfilDelAsesor(idDePersona(luis), LUIS)
  asesora = await crearAsesoraDeLaSemilla(`imagen-${proyecto}`)
  lead = await crearLead({
    nombre: `imagen ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: asesora.email,
  })
  origen = (
    await crearOrigenDePrueba(`E2E imagen ${proyecto}`, `${RAIZ}${proyecto}`, { tipo: 'subasta' })
  ).id
  copiarLaFormulaDeLaSubasta(origen)
  vehiculo = await crearVehiculo(origen, `Imagen Hilux ${proyecto}`)
  await publicarComoLaDuena(luis, origen, plantillaConElAsesor())
  // Las de la lista, sin vehículo (cada una su tarjeta) y más viejas que la que Ana guarda.
  sembrarCotizaciones({
    origenId: origen,
    leadId: lead,
    creadoPor: idDePersona(asesora.email),
    cuantas: SEMBRADAS,
    desde: 5,
  })
  sinClave = await crearSinCotizaciones(proyecto)
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  await quitarLaFoto(foto)
  borrarLoDeEsteSpec()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E Ana crea y Luis comparte: la vista previa, el texto y la imagen dicen a Luis con su WhatsApp, su cargo y su foto; Ana sigue como «Creado por»', async ({
  page,
}, info) => {
  info.setTimeout(120_000)
  await abrirLaHoja(
    page,
    asesora.email,
    `/cotizaciones/nuevo?origen=${origen}&lead=${lead}&vehiculo=${vehiculo}`,
  )
  await tipearEnLaHoja(page, 'remate', '9500')
  await alDia(page)
  guardada = await guardarLaHojaAbierta(page)
  const deAna = await page.request.get(rutaDeLaImagen(guardada))
  expect(deAna.status()).toBe(200)

  await page.context().clearCookies()
  await entrar(page, luis, { fresco: true })
  await page.goto(`/cotizaciones/${guardada}`)
  await expect(hoja(page)).toBeVisible()
  const tarjeta = await abrirLaVistaPrevia(page)
  await expect(variable(tarjeta, 'asesor_nombre')).toHaveText(LUIS.nombre)
  await expect(variable(tarjeta, 'asesor_telefono')).toHaveText(LUIS.telefono)
  await expect(variable(tarjeta, 'asesor_cargo')).toHaveText(LUIS.cargo)
  await expect
    .poll(() => anchoCargado(tarjeta.locator('img[data-foto-del-asesor]')))
    .toBeGreaterThan(0)
  await capturar(page, info, 'vista-previa-de-quien-mira')
  await cerrarLaVistaPrevia(page)

  await cabeceraDeLaGuardada(page).getByRole('button', { name: 'Compartir', exact: true }).click()
  const panel = panelDeCompartir(page)
  await expect(panel.getByText(`Creado por ${asesora.nombre}`)).toBeVisible()
  await expect(panel.locator('img[data-compartir-tarjeta]')).toHaveAttribute('src', /^blob:/, {
    timeout: 30_000,
  })
  await panel.getByRole('tab', { name: 'Texto' }).click()
  const texto = panel.locator('#compartir-cotizacion-texto')
  await expect(texto).toHaveValue(
    new RegExp(`\\nAsesor: ${LUIS.nombre}, ${LUIS.cargo}\\nWhatsApp: ${escapar(LUIS.telefono)}$`),
  )
  await expect(texto).not.toHaveValue(new RegExp(asesora.nombre))
  await capturar(page, info, 'compartir-de-quien-mira')

  // Cada uno recibe la suya: otra ETag y otro dibujo.
  const deLuis = await page.request.get(rutaDeLaImagen(guardada))
  expect(deLuis.status()).toBe(200)
  expect(etiquetaDe(deLuis)).not.toBe(etiquetaDe(deAna))
  expect(Buffer.compare(await deLuis.body(), await deAna.body())).not.toBe(0)
})

// @sin-celular: el PDF lo arma el servidor igual para cualquier pantalla; la vista previa de quien mira ya corre en el celular
test('E2E el PDF que baja Luis lo dice a él: su nombre, su WhatsApp y su cargo, y no el de Ana', async ({
  page,
}) => {
  await entrar(page, luis, { fresco: true })
  const texto = (await leerElPdf(page, guardada)).lineas.join('\n')
  expect(texto).toContain(LUIS.nombre)
  expect(texto).toContain(LUIS.telefono)
  expect(texto).toContain(LUIS.cargo)
  expect(texto).not.toContain(asesora.nombre)
})

test('E2E la lista pide sólo las miniaturas a la vista y nunca más de cuatro a la vez; con la ETag, 304 sin cuerpo', async ({
  page,
}, info) => {
  info.setTimeout(120_000)
  await entrar(page, luis, { fresco: true })
  const vigia = vigilarLasMiniaturas(page)
  const tarjetas = page.locator('[data-imagen-de-la-tarjeta]')
  const enFrio = Date.now()
  await page.goto(listaDelOrigen())
  await expect(tarjetas.first()).toBeVisible()
  await esperarLaListaAsentada(page, vigia)
  anotar(info, 'ms de las miniaturas a la vista, en frío', Date.now() - enFrio)
  anotar(info, 'bytes de las miniaturas a la vista, en frío', vigia.fase().bytes)
  const vista = await tarjetasALaVista(page)
  expect(vista.total).toBeGreaterThan(SEMBRADAS)
  expect(vigia.pedidas.size).toBeGreaterThanOrEqual(vista.dentro)
  expect(vigia.pedidas.size, 'las de abajo esperan a estar a la vista').toBeLessThan(vista.total)
  await capturar(page, info, 'lista-con-las-miniaturas')

  // Al volver, el navegador pregunta con su ETag (el 304 puede verse como un 200 de la caché).
  const alVolver = Date.now()
  await page.reload()
  await expect(tarjetas.first()).toBeVisible()
  await esperarLaListaAsentada(page, vigia)
  anotar(info, 'ms de las miniaturas a la vista, al volver', Date.now() - alVolver)
  const vuelta = vigia.fase()
  anotar(info, 'bytes de las miniaturas a la vista, al volver', vuelta.bytes)
  console.warn(`[medido] estados de las miniaturas al volver: ${vuelta.estados.join(', ')}`)

  await tarjetas.last().scrollIntoViewIfNeeded()
  await expect
    .poll(() => anchoCargado(tarjetas.last().locator('img[data-imagen]')))
    .toBeGreaterThan(0)
  expect(vigia.maximo()).toBeGreaterThan(0)
  expect(vigia.maximo(), 'miniaturas en vuelo a la vez').toBeLessThanOrEqual(4)
  anotar(info, 'miniaturas en vuelo a la vez', vigia.maximo())

  // Lo determinista: con la ETag, 304 sin cuerpo; la miniatura y la grande con su peso y su `Server-Timing`.
  const [id] = vigia.pedidas
  if (id === undefined) throw new Error('La lista no pidió ninguna miniatura.')
  await exigirLaImagenConSu304(page, info, id)
})

// @sin-celular: la variante la elige `useLive()` igual en cualquier ancho; la lista del celular ya corre en la prueba de las miniaturas
test('E2E con el Modo Live la imagen del resumen es la sin moneda, se ve entera y abre su visor; apagarlo vuelve a la de siempre', async ({
  page,
}, info) => {
  await entrar(page, luis, { fresco: true })
  await page.addInitScript(() => {
    window.localStorage.setItem('modo-live', '1')
  })
  await page.goto(`/cotizaciones?cotizacion=${guardada}`)
  await expect(page.locator('html')).toHaveClass(/\blive\b/)
  const resumen = page.getByRole('dialog')
  const imagen = resumen.getByAltText(textoDeLaImagen(guardada))
  await expect.poll(() => anchoCargado(imagen)).toBeGreaterThan(0)
  await expect(imagen).toHaveAttribute('src', /[?&]sin-moneda=1(&|$)/)
  await expect(imagen).toHaveAttribute('data-imagen-moneda', 'sin')
  expect(await imagen.evaluate((img) => getComputedStyle(img).visibility)).toBe('visible')
  expect(await imagen.evaluate((img) => getComputedStyle(img).filter)).toBe('none')
  await expect(resumen.getByText('Oculto en Modo Live')).toHaveCount(0)
  await capturar(page, info, 'imagen-en-modo-live')

  // La ruta: la sin moneda es otra imagen con otra ETag (`.s`), y la de una variante nunca da un 304 de la otra. Con la cookie del Live, el
  // cliente sale «Cliente» (Clientes apagado, lo por defecto): otra imagen más (`.c`).
  await expect
    .poll(async () => (await page.context().cookies()).find((c) => c.name === 'modo-live')?.value)
    .toBe('1')
  const con = await page.request.get(rutaDeLaImagen(guardada))
  const sin = await page.request.get(rutaDeLaImagen(guardada, '?sin-moneda=1'))
  expect(sin.status()).toBe(200)
  expect(etiquetaDe(sin)).toMatch(/\.s\.c"$/)
  expect(etiquetaDe(sin)).not.toBe(etiquetaDe(con))
  expect(Buffer.compare(await sin.body(), await con.body())).not.toBe(0)
  const cruzada = await page.request.get(rutaDeLaImagen(guardada, '?sin-moneda=1'), {
    headers: { 'if-none-match': etiquetaDe(con) },
  })
  expect(cruzada.status()).toBe(200)

  // El visor, con la misma variante.
  await page
    .getByRole('button', {
      name: `Ver la ${textoDeLaImagen(guardada).toLocaleLowerCase('es')} en grande`,
    })
    .click()
  const visor = page.getByRole('dialog', { name: textoDeLaImagen(guardada) })
  await expect(visor).toBeVisible()
  await expect(visor.locator('img').first()).toHaveAttribute('src', /[?&]sin-moneda=1(&|$)/)
  await page.keyboard.press('Escape')
  await expect(visor).toHaveCount(0)

  // Apagarlo (desde otra pestaña: el resumen tapa la barra) la vuelve a pedir con su moneda.
  await page.evaluate(() => {
    window.localStorage.setItem('modo-live', '0')
    window.dispatchEvent(new StorageEvent('storage', { key: 'modo-live', newValue: '0' }))
  })
  await expect(page.locator('html')).not.toHaveClass(/\blive\b/)
  await expect(imagen).toHaveAttribute('data-imagen-moneda', 'con')
  await expect(imagen).not.toHaveAttribute('src', /sin-moneda/)
  await expect.poll(() => anchoCargado(imagen)).toBeGreaterThan(0)
})

// @sin-celular: la ETag la decide el servidor con la huella de quien pide, igual para cualquier pantalla que la pida
test('E2E otro cargo de quien mira u otra plantilla publicada dan otra ETag y otra imagen', async ({
  page,
}) => {
  await entrar(page, luis, { fresco: true })
  const antes = await page.request.get(rutaDeLaImagen(guardada))
  sql(
    `update public.perfiles set cargo_web = 'Gerente comercial' where id = ${literal(idDePersona(luis))}::uuid`,
  )
  const conOtroCargo = await page.request.get(rutaDeLaImagen(guardada), {
    headers: { 'if-none-match': etiquetaDe(antes) },
  })
  expect(conOtroCargo.status()).toBe(200)
  expect(etiquetaDe(conOtroCargo)).not.toBe(etiquetaDe(antes))
  expect(Buffer.compare(await conOtroCargo.body(), await antes.body())).not.toBe(0)

  await publicarComoLaDuena(luis, origen, plantillaConElAsesor('Nota: otra plantilla.'))
  const conOtraPlantilla = await page.request.get(rutaDeLaImagen(guardada), {
    headers: { 'if-none-match': etiquetaDe(conOtroCargo) },
  })
  expect(conOtraPlantilla.status()).toBe(200)
  expect(etiquetaDe(conOtraPlantilla)).not.toBe(etiquetaDe(conOtroCargo))
  expect(Buffer.compare(await conOtraPlantilla.body(), await conOtroCargo.body())).not.toBe(0)
})

// @sin-celular: la clave del visor vive en la URL y abre el mismo diálogo en cualquier ancho
test('E2E la clave vieja del visor lo abre', async ({ page }) => {
  await entrar(page, luis, { fresco: true })
  await page.goto(listaDelOrigen(`&visor=portada-de-la-lista-${guardada}`))
  await expect(page.getByRole('dialog', { name: textoDeLaImagen(guardada) })).toBeVisible({
    timeout: 15_000,
  })
})

// @sin-celular: el 404 lo da el servidor en texto, igual para cualquier pantalla que pida la imagen
test('E2E inexistente, con un id que no es un guid, sin permiso o en la papelera, la ruta da el mismo 404 en texto que el PDF', async ({
  page,
}) => {
  await entrar(page, luis, { fresco: true })
  await exigirElMismo404(page, rutaDeLaImagen(INEXISTENTE))
  await exigirElMismo404(page, '/cotizaciones/no-es-un-id/imagen')

  await page.context().clearCookies()
  await entrar(page, sinClave, { fresco: true })
  await exigirElMismo404(page, rutaDeLaImagen(guardada))

  await page.context().clearCookies()
  await entrar(page, luis, { fresco: true })
  mandarALaPapelera(guardada)
  await exigirElMismo404(page, rutaDeLaImagen(guardada))
})
