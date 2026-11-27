import { cabeceraDeLaGuardada } from './soporte/menu-de-la-guardada'
import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { ocultoDeUnaFormulaSembrada } from './soporte/cotizar-formula'
import { guardarLaHojaAbierta } from './soporte/cotizar-pdf'
import { abrirLaHoja, cotizarEnLaSubasta, urlDeLaSubasta } from './soporte/cotizar-vista-previa'
import { borrarFotosDe } from './soporte/fotos'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { capturar, crearAsesoraDeLaSemilla } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'
import { sembrarFotos } from './soporte/vehiculos-lista'
import { formatearDiaLargo, formatearHora } from '../src/shared/lib/fechas'

// «Compartir la cotización» (`docs/GLOSARIO.md` › «Compartir la cotización»): desde el detalle y desde el «⋯» de la lista se abre el panel; «Imagen › Cotización»
// muestra la imagen de la tarjeta, «Fotos» marca dos; «Texto» en «WhatsApp» con la hora del patio dice el título, el lote, el cierre de la subasta en esa zona y los montos;
// «Copiar texto» copia y «Descargar PDF» baja el PDF; con el Modo Live se ve sin moneda y se copia completo; lo que un nivel esconde no viaja. La subasta de la semilla, con su plantilla.
test.describe.configure({ mode: 'serial' })

const LOTE = '44551234'
const ENLACE = 'https://www.copart.com/lot/44551234'
const OTRA = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'

let asesora = { email: '', nombre: '' }
let duena = ''
let lead = ''
let subasta = ''
let vehiculo = ''
let titulo = ''
let guardada = ''
let cierre = ''

const numeroDe = (id: string) =>
  sql(`select numero from public.cotizaciones where id = ${literal(id)}::uuid`)
const panel = (page: Page) => page.getByRole('dialog', { name: 'Compartir cotización' })
const texto = (page: Page) => panel(page).locator('#compartir-cotizacion-texto')

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  const proyecto = info.project.name
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  // La dueña primero: una persona invitada pide que la empresa ya tenga dueña.
  duena = correoDePrueba(`duena-compartir-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Clara Compartir' })
  asesora = await crearAsesoraDeLaSemilla(`compartir-${proyecto}`)
  lead = await crearLead({
    nombre: `compartir ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: asesora.email,
  })
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
  titulo = `Compartir Hilux ${proyecto}`
  await cargarVehiculos(subasta, [
    { titulo, anio: 2020, atributos: { tipo_vehiculo: 'autos', ubicacion_estado: 'TX' } },
  ])
  vehiculo = (await vehiculoPorTitulo(titulo))?.id ?? ''
  expect(vehiculo, 'el vehículo de la subasta').not.toBe('')
  // La subasta cierra en tres días: el texto la dice.
  cierre = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().replace(/\.\d+Z$/, '.000Z')
  sql(`update public.vehiculos set lote = ${literal(LOTE)}, url_origen = ${literal(ENLACE)}, kilometraje = 45000,
    subasta_en = ${literal(cierre)}::timestamptz - interval '1 hour', subasta_fin_en = ${literal(cierre)}::timestamptz
    where id = ${literal(vehiculo)}::uuid`)
  await sembrarFotos(vehiculo, 2)
})

test.afterAll(async () => {
  if (vehiculo !== '') {
    await borrarFotosDe([vehiculo])
    sql(`delete from public.cotizaciones where vehiculo_id = ${literal(vehiculo)}::uuid`)
    sql(`delete from public.vehiculos where id = ${literal(vehiculo)}::uuid`)
  }
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E desde el detalle: la imagen de la tarjeta, dos fotos marcadas y el texto de WhatsApp con la hora del patio; copiar el texto y bajar el PDF', async ({
  page,
  context,
  isMobile,
}, info) => {
  info.setTimeout(120_000)
  // En el celular, el menú del sistema: se espía lo que recibe.
  await page.addInitScript(() => {
    const llamadas: { texto?: string; archivos: number }[] = []
    Object.assign(window, { __compartidos: llamadas })
    navigator.canShare = (datos) => (datos?.files?.length ?? 0) > 0
    navigator.share = (datos) => {
      llamadas.push({ texto: datos?.text, archivos: datos?.files?.length ?? 0 })
      return Promise.resolve()
    }
  })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await cotizarEnLaSubasta(page, asesora.email, urlDeLaSubasta(subasta, lead, vehiculo))
  guardada = await guardarLaHojaAbierta(page)
  const numero = numeroDe(guardada)
  await page.goto(`/cotizaciones/${guardada}`)
  await cabeceraDeLaGuardada(page).getByRole('button', { name: 'Compartir', exact: true }).click()
  await expect(page).toHaveURL(/[?&]panel=compartir/)
  await expect(panel(page).getByText(`Creado por ${asesora.nombre}`)).toBeVisible()

  // «Imagen › Cotización»: la imagen de la tarjeta, armada en el navegador desde su ruta.
  await expect(panel(page).locator('img[data-compartir-tarjeta]')).toHaveAttribute(
    'src',
    /^blob:/,
    { timeout: 30_000 },
  )
  await capturar(page, info, 'imagen-cotizacion')

  // «Fotos»: marcar dos; cada una se baja entera al marcarla.
  await panel(page).getByRole('button', { name: 'Fotos', exact: true }).click()
  for (const foto of ['Foto 1', 'Foto 2']) {
    await panel(page).getByRole('checkbox', { name: foto }).click()
    await expect(panel(page).getByRole('checkbox', { name: foto })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  }
  await expect(panel(page).getByText('Preparando las fotos…')).toHaveCount(0)
  await capturar(page, info, 'imagen-fotos')

  // «Texto» en «WhatsApp» con la hora del patio (Texas: America/Chicago).
  await panel(page).getByRole('tab', { name: 'Texto' }).click()
  await expect(page).toHaveURL(/[?&]compartir=texto/)
  await panel(page).getByRole('button', { name: 'WhatsApp' }).click()
  await panel(page).getByRole('button', { name: 'Hora del patio' }).click()
  const zona = { zona: 'America/Chicago' }
  const valor = texto(page)
  await expect(valor).toHaveValue(new RegExp(`^\\*${titulo}\\*\\n\\n`))
  // El título de la cotización es el del vehículo: no se repite.
  await expect(valor).toHaveValue(new RegExp(`^\\*${titulo}\\*\\n\\nLote: `))
  await expect(valor).toHaveValue(new RegExp(`Lote: ${LOTE}\\n`))
  await expect(valor).toHaveValue(new RegExp(`URL: ${ENLACE.replaceAll('.', '\\.')}`))
  await expect(valor).toHaveValue(
    new RegExp(
      `Se subasta el ${formatearDiaLargo(cierre, zona)} a las ${formatearHora(cierre, zona)} \\(hora del patio\\)`,
    ),
  )
  // Los conceptos con su monto y el total en negrita, de la tarjeta de lo guardado.
  await expect(valor).toHaveValue(/\n[^\n*]+: [^\n]*\d[^\n]*\n/)
  await expect(valor).toHaveValue(/\n\*[^\n]+: [^\n]*\d[^\n]*\*/)
  await capturar(page, info, 'texto-whatsapp')
  const elTexto = await valor.inputValue()

  if (isMobile) {
    // Con las dos fotos marcadas, «Compartir» manda los dos archivos y el texto.
    await panel(page).getByRole('tab', { name: 'Imagen' }).click()
    await panel(page).getByRole('button', { name: 'Compartir', exact: true }).click()
    const llamadas = await page.evaluate(
      () =>
        (window as unknown as { __compartidos: { texto?: string; archivos: number }[] })
          .__compartidos,
    )
    expect(llamadas).toEqual([{ texto: elTexto, archivos: 2 }])
  } else {
    await panel(page).getByRole('button', { name: 'Copiar texto' }).click()
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(elTexto)
  }

  const descarga = page.waitForEvent('download')
  await panel(page).getByRole('button', { name: 'Descargar PDF' }).click()
  expect((await descarga).suggestedFilename()).toBe(`cotizacion-${numero}.pdf`)
})

test('E2E desde la tarjeta de la lista se abre con su id; un id ajeno dice que no hay acceso', async ({
  page,
}) => {
  const numero = numeroDe(guardada)
  await entrar(page, asesora.email, { fresco: true })
  // La lista nace en tarjetas: «Compartir» es su acción principal (el «⋯» de la tabla lo trae primero: `cotizaciones-tarjetas-y-grupos.spec.ts`).
  await page.goto(`/cotizaciones?q=${numero}`)
  await page
    .getByRole('button', { name: 'Compartir', exact: true })
    .filter({ visible: true })
    .first()
    .click()
  await expect(page).toHaveURL(
    new RegExp(`[?&]panel=compartir&para=${guardada}|[?&]para=${guardada}.*panel=compartir`),
  )
  await expect(panel(page).getByText(`Creado por ${asesora.nombre}`)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel(page)).toBeHidden()

  await page.goto(`/cotizaciones?panel=compartir&para=${OTRA}`)
  await expect(panel(page).getByText('No tienes acceso a esta cotización.')).toBeVisible()
})

test('E2E con el Modo Live se comparte: se ve sin moneda y lo copiado va completo', async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await abrirLaHoja(page, asesora.email, `/cotizaciones/${guardada}`)
  // El de la barra (la hoja también tiene el suyo).
  const live = page
    .getByRole('button', { name: 'Modo Live: ocultar los símbolos de moneda' })
    .first()
  await live.click()
  await expect(live).toHaveAttribute('aria-pressed', 'true')
  await cabeceraDeLaGuardada(page).getByRole('button', { name: 'Compartir', exact: true }).click()
  await expect(panel(page).getByText(`Creado por ${asesora.nombre}`)).toBeVisible()
  await expect(panel(page).getByText('Con el Modo Live no se comparte.')).toHaveCount(0)

  // La imagen a la vista es la variante sin moneda.
  const imagen = panel(page).locator('img[data-compartir-tarjeta]')
  await expect(imagen).toHaveAttribute('data-imagen-moneda', 'sin', { timeout: 30_000 })
  await expect(imagen).toHaveAttribute('src', /^blob:/, { timeout: 30_000 })
  await expect(imagen).toBeVisible()
  await capturar(page, info, 'imagen-en-modo-live')

  // El texto a la vista, con los números y sin moneda; el que se copia, con su moneda.
  await panel(page).getByRole('tab', { name: 'Texto' }).click()
  const valor = texto(page)
  await expect(valor).toHaveValue(/\n\*?[^\n]+: [\d.,]+\*?\n/)
  await expect(valor).not.toHaveValue(/\$|US\$|USD|Bs/)
  await panel(page).getByRole('button', { name: 'Copiar texto' }).click()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toMatch(/TOTAL DÓLARES: USD\s[\d.,]+/)
})

test('E2E lo que un nivel esconde no viaja: ni Ana ni la dueña (que ve «costos») reciben una etiqueta de un nivel', async ({
  page,
}) => {
  const oculto = ocultoDeUnaFormulaSembrada('subasta_usa', 'costos')
  expect(oculto.etiquetas.length, 'la subasta tiene celdas de costos').toBeGreaterThan(0)
  for (const quien of [asesora.email, duena]) {
    await page.context().clearCookies()
    await entrar(page, quien, { fresco: true })
    const respuesta = await page.request.get(`/cotizaciones/${guardada}/compartir`)
    expect(respuesta.status()).toBe(200)
    const cuerpo = await respuesta.text()
    for (const etiqueta of oculto.etiquetas) {
      expect(cuerpo.includes(etiqueta), `${quien}: ${etiqueta}`).toBe(false)
    }
  }
})
