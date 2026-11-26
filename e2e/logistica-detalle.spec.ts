import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { borrarDocumentos, sembrarDocumentos, type TerrenoDeDocumentos } from './soporte/documentos'
import { esMovil } from './soporte/inventario'
import { capturar } from './soporte/recorrido'
import { abrirSeccionDeLaUnidad, sinDesplazarLaPagina } from './soporte/unidad'

// El detalle del vehículo en logística (T20): en escritorio (1440×900 y 1280×800) todo lo importante entra sin desplazar la página, en zonas; mover y anotar se hacen sin salir de ella. En el celular, los
// bloques plegables con la barra «Mover». El mismo archivo corre en los dos proyectos: cada prueba se salta en el que no es el suyo.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeDocumentos
let correoDeLaDuena = ''
let correoDeQuienSoloVe = ''
let correoDeQuienMueveYSube = ''

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarDocumentos(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  correoDeLaDuena = correoDePrueba(`duena-detalle-${proyecto}`)
  await crearDuenaDePrueba({
    email: correoDeLaDuena,
    contrasena: CONTRASENA,
    nombre: 'Dalia Detalle',
  })
  terreno = await sembrarDocumentos(proyecto)
  correoDeQuienMueveYSube = correoDePrueba(`mueve-y-sube-detalle-${proyecto}`)
  await crearPersona({
    email: correoDeQuienMueveYSube,
    contrasena: CONTRASENA,
    nombre: 'Mara Mueve',
    invitada: true,
  })
  await darRolDePrueba({
    email: correoDeQuienMueveYSube,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}mueve y sube detalle ${proyecto}`,
      clave: `e2e_mueve_y_sube_detalle_${proyecto}`,
    },
    permisos: ['logistica.ver', 'vehiculos.ver', 'flujos.mover', 'logistica.documentos.subir'].map(
      (clave) => ({ clave, origenId: terreno.origen.id }),
    ),
  })
  correoDeQuienSoloVe = correoDePrueba(`solo-ve-detalle-${proyecto}`)
  await crearPersona({
    email: correoDeQuienSoloVe,
    contrasena: CONTRASENA,
    nombre: 'Sol Solo',
    invitada: true,
  })
  await darRolDePrueba({
    email: correoDeQuienSoloVe,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}solo ve detalle ${proyecto}`,
      clave: `e2e_solo_ve_detalle_${proyecto}`,
    },
    permisos: ['logistica.ver', 'vehiculos.ver'].map((clave) => ({
      clave,
      origenId: terreno.origen.id,
    })),
  })
})

test.afterAll(async () => {
  await borrarDocumentos(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// Espera lo que la unidad dibuja en escritorio: los destinos de «Qué falta», los documentos y el campo de la nota.
async function esperarLaUnidad(page: Page, destino: string) {
  await expect(page.getByRole('heading', { name: destino, level: 3 })).toBeVisible()
  await expect(page.locator('[data-hueco="documentos"]')).toBeVisible()
  await expect(page.getByLabel('Escribir una nota')).toBeVisible()
}

test('E2E escritorio · la unidad entra sin desplazar la página y mover y anotar se hacen sin salir de ella', async ({
  page,
}, info) => {
  test.skip(
    esMovil(page),
    'Escritorio: en el celular la unidad va en bloques con la barra «Mover».',
  )
  await entrar(page, correoDeQuienMueveYSube, { fresco: true })
  const ruta = `/logistica/vehiculo/${terreno.enA.id}`
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ruta)
  await esperarLaUnidad(page, terreno.b.nombre)
  expect(await sinDesplazarLaPagina(page)).toBe(true)
  await capturar(page, info, 'escritorio-1440-quien-mueve')

  // Subir un documento: el botón abre un drawer; al terminar sin fallos se cierra solo y la fila queda «Subido».
  const documentos = page.locator('[data-hueco="documentos"]')
  await documentos.getByRole('button', { name: 'Subir documentos' }).click()
  const bandeja = page.getByRole('dialog', { name: 'Subir documentos' })
  await bandeja.getByLabel('Tipo de documento').selectOption({ label: terreno.tipoDeBl.nombre })
  await bandeja.locator('input[type="file"]:not([capture])').setInputFiles({
    name: 'bl.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(`%PDF-1.4 e2e detalle ${proyecto} ${Date.now()}`),
  })
  await capturar(page, info, 'escritorio-1440-drawer-de-subir')
  await bandeja.getByRole('button', { name: 'Subir 1 documento' }).click()
  await expect(bandeja).toBeHidden()
  await expect(documentos.getByText('Subido', { exact: true })).toBeVisible()
  expect(await sinDesplazarLaPagina(page)).toBe(true)

  // Anotar: una nota en un toque, ahí mismo.
  const notas = page.locator('[data-hueco="notas"]')
  await notas.getByLabel('Escribir una nota').fill('Revisar el BL')
  await notas.getByRole('button', { name: 'Guardar nota' }).click()
  await expect(notas.locator('[data-nota]').filter({ hasText: 'Revisar el BL' })).toBeVisible()

  // Mover: elegir el destino, la nota obligatoria y Ctrl+Enter.
  await page.getByRole('button', { name: `Elegir el destino «${terreno.b.nombre}»` }).click()
  await page.getByLabel('Nota interna (obligatoria)').fill('Zarpó el lunes.')
  await page.getByLabel('Nota interna (obligatoria)').press('Control+Enter')
  await expect(page.getByText(`${terreno.enA.titulo} pasó a «${terreno.b.nombre}».`)).toBeVisible()
  // Todo pasó en la misma página.
  expect(new URL(page.url()).pathname).toBe(ruta)

  // A 1280×800 tampoco hay desplazamiento.
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.reload()
  await expect(page.getByLabel('Escribir una nota')).toBeVisible()
  await expect(page.locator('[data-hueco="documentos"]')).toBeVisible()
  expect(await sinDesplazarLaPagina(page)).toBe(true)
  await capturar(page, info, 'escritorio-1280-quien-mueve')
})

test('E2E escritorio · los huecos ocasionales están en pestañas y «Dinero» junta gastos, pagos y margen', async ({
  page,
}, info) => {
  test.skip(esMovil(page), 'Escritorio: las pestañas son de las zonas.')
  await entrar(page, correoDeLaDuena, { fresco: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`/logistica/vehiculo/${terreno.enB.id}`)
  await esperarLaUnidad(page, terreno.c.nombre)
  const pestanas = page.getByRole('tablist', { name: 'Secciones de la unidad' })
  // Las pestañas dependen de las reglas del flujo del origen: Documentos va primero y Dinero (gastos, pagos y margen juntos) al final.
  await expect(pestanas.getByRole('tab').first()).toHaveText('Documentos')
  await expect(pestanas.getByRole('tab').last()).toHaveText('Dinero')
  await abrirSeccionDeLaUnidad(page, 'gastos')
  await expect(page.locator('[data-hueco="gastos"]')).toBeVisible()
  await expect(page.locator('[data-hueco="pagos"]')).toBeVisible()
  await expect(page.locator('[data-hueco="margen"]')).toBeVisible()
  // La pestaña elegida queda en la URL y sobrevive a recargar.
  await expect(page).toHaveURL(/hueco=gastos/)
  expect(await sinDesplazarLaPagina(page)).toBe(true)
  await capturar(page, info, 'escritorio-1440-duena-dinero')
  await page.reload()
  await expect(page.getByRole('tab', { name: 'Dinero' })).toHaveAttribute('aria-selected', 'true')
  // A 1280×800 la dueña tampoco desplaza la página.
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(page.locator('[data-hueco="margen"]')).toBeVisible()
  expect(await sinDesplazarLaPagina(page)).toBe(true)
  await capturar(page, info, 'escritorio-1280-duena-dinero')
})

test('E2E escritorio · quien sólo ve no tiene «Dinero» ni formularios, y la unidad sigue sin desplazarse', async ({
  page,
}, info) => {
  test.skip(esMovil(page), 'Escritorio: las zonas son de escritorio.')
  await entrar(page, correoDeQuienSoloVe, { fresco: true })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`/logistica/vehiculo/${terreno.enB.id}`)
  await expect(page.locator('[data-hueco="notas"]')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Dinero' })).toHaveCount(0)
  expect(await sinDesplazarLaPagina(page)).toBe(true)
  await capturar(page, info, 'escritorio-1280-solo-ve')
})

test('E2E celular · la barra «Mover» siempre a mano lleva a «Qué falta»', async ({
  page,
}, info) => {
  test.skip(!esMovil(page), 'Celular: la barra «Mover» es de la forma plegable.')
  await entrar(page, terreno.primera.correo, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enB.id}`)
  const barra = page.getByRole('button', { name: 'Mover', exact: true })
  await expect(page.getByRole('heading', { name: terreno.c.nombre, level: 3 })).toBeVisible()
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
  await expect(barra).toBeInViewport()
  await capturar(page, info, 'celular-barra-de-mover')
  await barra.click()
  const resumen = page.locator('[data-bloque-del-hueco="que-falta"] h3').first()
  await expect(resumen).toBeInViewport()
  await expect(resumen).toBeFocused()
})

test('E2E celular · sin permiso de mover no hay barra', async ({ page }, info) => {
  test.skip(!esMovil(page), 'Celular: la barra «Mover» es de la forma plegable.')
  await entrar(page, correoDeQuienSoloVe, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enB.id}`)
  await expect(page.locator('[data-bloque-del-hueco="notas"]')).toBeAttached()
  await expect(page.getByRole('button', { name: 'Mover', exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: terreno.c.nombre, level: 3 })).toBeVisible()
  await capturar(page, info, 'celular-solo-ve')
})
