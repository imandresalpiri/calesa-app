import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import {
  cajaInteriorDe,
  esAzul,
  esBlanco,
  logosDePrueba,
  plantillaConElLogo,
  puntosDeLaCaja,
} from './soporte/cotizacion-tarjeta-logo'
import { ponerElLogo } from './soporte/cotizar-pdf-logo'
import { leerElPdf } from './soporte/cotizar-pdf'
import {
  abrirLaHoja,
  abrirLaVistaPrevia,
  alDia,
  dialogo,
  hoja,
} from './soporte/cotizar-vista-previa'
import { restaurarEmpresa, tomarInstantaneaDeEmpresa } from './soporte/empresa'
import { quieto } from './soporte/esperas'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { crearOrigenDePrueba, PREFIJO_CLAVE_E2E } from './soporte/origenes'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import {
  copiarLaFormulaDeLaSubasta,
  crearVehiculo,
  publicarComoLaDuena,
  urlDeLaHoja,
} from './soporte/tarjeta-cuadricula'
import { abrirLaFormula } from './soporte/rutas-de-la-formula'

// El logo de la empresa en la tarjeta de la cotización (`docs/COTIZADOR.md` › «Plantilla de tarjeta (PDF)»): la celda `{tipo: 'logo'}` dibuja sólo el logo,
// `contain` en la celda menos su relleno y alineado como la celda, en la vista previa (hoja nueva y guardada), el PDF y la imagen de la tarjeta, con un logo WebP
// (como se suben) y uno PNG; sin logo, la celda vacía; el dato «Nombre de la empresa» va en otra celda; el editor avisa si el logo no se pudo dibujar.
// Un origen propio con la fórmula de la subasta y la réplica de V1 con su celda logo abajo a la derecha: nunca la plantilla de la semilla.

const RAIZ = 'tjlogo_'

let duena = ''
let lead = ''
let origen = ''
let vehiculo = ''
let guardada = ''
let logos: Awaited<ReturnType<typeof logosDePrueba>>

const nombreDeLaEmpresa = () => sql('select nombre from public.ajustes_empresa where id = 1')
const celdaDelLogo = (t: Locator) => t.locator('[data-celda="logo"]')

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
  logos = await logosDePrueba()
  duena = correoDePrueba(`duena-tjlogo-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Lola Logo' })
  lead = await crearLead({ nombre: `logo ${proyecto}`, telefono: telefonoAlAzar(), deQuien: duena })
  origen = (
    await crearOrigenDePrueba(`E2E logo ${proyecto}`, `${RAIZ}${proyecto}`, { tipo: 'subasta' })
  ).id
  copiarLaFormulaDeLaSubasta(origen)
  vehiculo = await crearVehiculo(origen, `Logo Hilux ${proyecto}`)
  await publicarComoLaDuena(duena, origen, plantillaConElLogo())
  sembrarCotizaciones({
    origenId: origen,
    vehiculoId: vehiculo,
    leadId: lead,
    creadoPor: idDePersona(duena),
    cuantas: 1,
  })
  guardada = sql(`select id from public.cotizaciones where origen_id = ${literal(origen)}::uuid`)
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  borrarLoDeEsteSpec()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
})

// La imagen del logo llena la caja interior de su celda (la celda menos 4 px de relleno por lado, escalada como la tarjeta), alineada abajo a la derecha, cargada
// y sin el nombre de la empresa al lado.
async function exigirElLogoEnSuCelda(t: Locator) {
  const celda = celdaDelLogo(t)
  const imagen = celda.locator('img[data-logo-de-la-celda]')
  await expect(imagen).toBeVisible()
  await expect
    .poll(() => imagen.evaluate((el: HTMLImageElement) => (el.complete ? el.naturalWidth : 0)))
    .toBeGreaterThan(0)
  await expect(celda).not.toContainText(nombreDeLaEmpresa())
  expect(await imagen.evaluate((el) => getComputedStyle(el).objectPosition)).toBe('100% 100%')
  await quieto(t)
  const anchoSinEscala = await celda.evaluate((el: HTMLElement) => parseFloat(el.style.width))
  const c = await celda.boundingBox()
  const i = await imagen.boundingBox()
  if (c === null || i === null) throw new Error('La celda o el logo no tienen caja.')
  const relleno = 4 * (c.width / anchoSinEscala)
  expect(Math.abs(i.width - (c.width - 2 * relleno))).toBeLessThanOrEqual(1)
  expect(Math.abs(i.height - (c.height - 2 * relleno))).toBeLessThanOrEqual(1)
  expect(Math.abs(i.x - (c.x + relleno))).toBeLessThanOrEqual(1)
  expect(Math.abs(i.y - (c.y + relleno))).toBeLessThanOrEqual(1)
}

async function abrirLaGuardada(page: Page) {
  await page.goto(`/cotizaciones/${guardada}`)
  await expect(hoja(page)).toBeVisible()
  return abrirLaVistaPrevia(page)
}

test('E2E la vista previa dibuja el logo WebP y el PNG llenando su celda, alineado como ella y sin el nombre, en la hoja nueva y en la guardada', async ({
  page,
}, info) => {
  const antes = await tomarInstantaneaDeEmpresa()
  try {
    for (const logo of [logos.webp, logos.png]) {
      await ponerElLogo(logo.datos, logo.extension, logo.tipo)
      await abrirLaHoja(page, duena, urlDeLaHoja(origen, lead, vehiculo))
      await alDia(page)
      await exigirElLogoEnSuCelda(await abrirLaVistaPrevia(page))
      await capturar(page, info, `hoja-nueva-${logo.extension}`)
      await exigirElLogoEnSuCelda(await abrirLaGuardada(page))
      await capturar(page, info, `guardada-${logo.extension}`)
    }
  } finally {
    await restaurarEmpresa(antes)
  }
})

// @sin-celular: el PDF lo arma el servidor igual para cualquier pantalla; la vista previa ya corre en el celular
test('E2E el PDF lleva el logo WebP y el PNG, y sus líneas son las de sin logo', async ({
  page,
}) => {
  const antes = await tomarInstantaneaDeEmpresa()
  try {
    await entrar(page, duena, { fresco: true })
    sql('update public.ajustes_empresa set logo_ruta = null where id = 1')
    const sinLogo = await leerElPdf(page, guardada)
    expect(sinLogo.leido.imagenes).toBe(0)
    for (const logo of [logos.webp, logos.png]) {
      await ponerElLogo(logo.datos, logo.extension, logo.tipo)
      const pdf = await leerElPdf(page, guardada)
      expect(pdf.leido.imagenes, logo.extension).toBe(1)
      expect(pdf.lineas).toEqual(sinLogo.lineas)
    }
  } finally {
    await restaurarEmpresa(antes)
  }
})

// @sin-celular: la imagen de la tarjeta la arma el servidor al ancho de la tarjeta, no al de la pantalla que la pide
test('E2E la imagen de la tarjeta pinta el logo WebP y el PNG abajo a la derecha de la caja de su celda', async ({
  page,
}) => {
  const antes = await tomarInstantaneaDeEmpresa()
  try {
    await entrar(page, duena, { fresco: true })
    const caja = await cajaInteriorDe(celdaDelLogo(await abrirLaGuardada(page)))
    for (const logo of [logos.webp, logos.png]) {
      await ponerElLogo(logo.datos, logo.extension, logo.tipo)
      const respuesta = await page.request.get(`/cotizaciones/${guardada}/imagen`)
      expect(respuesta.status()).toBe(200)
      const puntos = await puntosDeLaCaja(await respuesta.body(), caja)
      expect(esAzul(puntos.abajoDerecha), `${logo.extension}: abajo a la derecha`).toBe(true)
      expect(esBlanco(puntos.arribaIzquierda), `${logo.extension}: arriba a la izquierda`).toBe(
        true,
      )
    }
  } finally {
    await restaurarEmpresa(antes)
  }
})

test('E2E sin logo en Empresa la celda queda vacía, sin aviso, y el PDF sin imagen', async ({
  page,
}) => {
  const antes = await tomarInstantaneaDeEmpresa()
  try {
    sql('update public.ajustes_empresa set logo_ruta = null where id = 1')
    await entrar(page, duena, { fresco: true })
    const t = await abrirLaGuardada(page)
    await expect(celdaDelLogo(t)).toBeVisible()
    await expect(celdaDelLogo(t).locator('img')).toHaveCount(0)
    await expect(celdaDelLogo(t)).toHaveText('')
    await expect(dialogo(page).getByRole('alert')).toHaveCount(0)
    expect((await leerElPdf(page, guardada)).leido.imagenes).toBe(0)
  } finally {
    await restaurarEmpresa(antes)
  }
})

test('E2E con el Modo Live encendido el logo se sigue viendo', async ({ page }) => {
  const antes = await tomarInstantaneaDeEmpresa()
  try {
    await ponerElLogo(logos.webp.datos, logos.webp.extension, logos.webp.tipo)
    await entrar(page, duena, { fresco: true })
    const t = await abrirLaGuardada(page)
    const live = dialogo(page).getByRole('button', {
      name: 'Modo Live: ocultar los símbolos de moneda',
    })
    await live.click()
    await expect(page.locator('html')).toHaveClass(/live/)
    await expect(celdaDelLogo(t).locator('img[data-logo-de-la-celda]')).toBeVisible()
    await live.click()
    await expect(page.locator('html')).not.toHaveClass(/live/)
  } finally {
    await restaurarEmpresa(antes)
  }
})

// @sin-celular: el editor de la tarjeta pide una pantalla de al menos 1.024 px; en el celular sólo avisa
test('E2E el editor ofrece el dato «Nombre de la empresa» y avisa, con «Abrir Empresa», si el logo no se pudo dibujar', async ({
  page,
}, info) => {
  const antes = await tomarInstantaneaDeEmpresa()
  try {
    sql(
      "update public.ajustes_empresa set logo_ruta = 'logos/no-existe-e2e-tjlogo.webp' where id = 1",
    )
    await entrar(page, duena, { fresco: true })
    await abrirLaFormula(page, origen, 'tarjeta')
    const lienzo = page.getByRole('grid', { name: 'Lienzo de la tarjeta' })
    await expect(lienzo).toBeVisible()
    await expect(page.locator('[data-referencia-del-lienzo]')).toHaveValue('cotizacion')
    const aviso = page.getByText(
      'El logo de la empresa no se pudo dibujar: súbelo de nuevo en Empresa.',
    )
    await expect(aviso).toBeVisible()
    await expect(page.getByRole('link', { name: 'Abrir Empresa' })).toHaveAttribute(
      'href',
      '/configuracion/empresa',
    )
    await capturar(page, info, 'editor-logo-roto')

    await lienzo.locator('[data-pos="0:0"]').click()
    const panel = page.getByRole('complementary', { name: 'Panel de la tarjeta' })
    await panel.getByRole('radio', { name: 'Dato' }).click()
    await expect(
      panel
        .getByRole('region', { name: 'De la cotización' })
        .getByRole('button', { name: 'Nombre de la empresa' }),
    ).toBeVisible()
  } finally {
    await restaurarEmpresa(antes)
  }
})

test('E2E el dato «Nombre de la empresa» de una celda sale en la vista previa y en el PDF', async ({
  page,
}) => {
  await publicarComoLaDuena(duena, origen, plantillaConElLogo(true))
  await entrar(page, duena, { fresco: true })
  const t = await abrirLaGuardada(page)
  const nombre = nombreDeLaEmpresa()
  await expect(t.locator('[data-variable="empresa_nombre"]')).toHaveText(nombre)
  const pdf = await leerElPdf(page, guardada)
  expect(pdf.lineas.some((l) => l.includes(nombre))).toBe(true)
})
