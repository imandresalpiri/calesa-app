import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { embarqueDeLaBase } from './soporte/embarques'
import {
  borrarEmbarquesClaros,
  OTRO_CONTENEDOR,
  sembrarEmbarquesClaros,
  type TerrenoDeEmbarquesClaros,
} from './soporte/embarques-claros'
import { quieto } from './soporte/esperas'
import { literal, sql } from './soporte/sql'

// Embarques, contenedores y aduana se explican solos: la lista de embarques, el drawer de un contenedor y la aduana dicen en una línea qué es cada cosa. La dueña crea un embarque
// («Nuevo embarque» lleva a su página), le agrega un contenedor nuevo y tres vehículos de una vez (uno viajaba en otro contenedor: la pregunta lo nombra antes de mudarlo) y pasa
// dos al contenedor: la página queda en un solo nivel, el contenedor con sus dos vehículos y «Sueltos» con el tercero, cada uno con su declaración enlazada o «Sin declaración».
// El estado va en una insignia y su filtro en la URL (vacío por filtro con «Limpiar filtros»); `?contenedor=<id>` abre el drawer, cuyo «Mover el contenedor» lleva al lote de la
// Cadena, y un número en lugar del id dice que no existe. Agregar vehículos y abrir o cerrar el drawer no mueven la cabecera de la página ni su «⋯».
test.describe.configure({ mode: 'serial' })

const QUE_ES_EL_EMBARQUE = 'Un embarque es el viaje de la naviera con su booking.'
const QUE_ES_EL_CONTENEDOR = 'La caja que viaja en un embarque, con sus vehículos.'
const QUE_ES_LA_DECLARACION = 'Una declaración es el trámite de aduana de uno o varios vehículos.'
const NUEVO_CONTENEDOR = 'CLRU1000001'

let proyecto = ''
let duena = ''
let terreno: TerrenoDeEmbarquesClaros
let booking = ''
let embarqueId = ''

const listaDeEmbarques = (extra = '') =>
  `/logistica/embarques?origen=${terreno.origen.id}${extra === '' ? '' : `&${extra}`}`

function idDelContenedor(numero: string): string {
  return sql(
    `select id from public.contenedores where origen_id = ${literal(terreno.origen.id)} and numero = ${literal(numero)}`,
  )
}

// Dónde queda una caja en la página (no en la ventana: si la página se desplaza para devolver el foco, la caja no se movió).
async function cajaEnLaPagina(lugar: Locator) {
  await quieto(lugar)
  return lugar.evaluate((e) => {
    const caja = e.getBoundingClientRect()
    return {
      x: Math.round(caja.x + window.scrollX),
      y: Math.round(caja.y + window.scrollY),
      ancho: Math.round(caja.width),
      alto: Math.round(caja.height),
    }
  })
}

// El «⋯» de la cabecera y el título del embarque: lo que no debe saltar. Por CSS y no por rol: con el drawer abierto, la página de abajo queda fuera del árbol de accesibilidad.
async function medirLaCabecera(page: Page) {
  return {
    mas: await cajaEnLaPagina(
      page.locator(`button[aria-label="Más acciones de Embarque ${booking}"]`),
    ),
    titulo: await cajaEnLaPagina(page.locator('h1', { hasText: `Embarque ${booking}` })),
  }
}

// Busca cada vehículo en «Agregar vehículos» y lo suma a los elegidos.
async function elegir(drawer: Locator, vehiculos: readonly { titulo: string }[]) {
  for (const v of vehiculos) {
    await drawer.getByLabel('Buscar un vehículo para agregar').fill(v.titulo)
    await drawer.getByRole('button', { name: 'Buscar', exact: true }).click()
    await drawer.getByRole('button', { name: `Agregar ${v.titulo}` }).click()
    await expect(
      drawer.getByRole('button', { name: `Sacar ${v.titulo} de los elegidos` }),
    ).toBeVisible()
  }
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  booking = `BK-CLAROS-${proyecto.toUpperCase()}`
  duena = correoDePrueba(`duena-claros-${proyecto}`)
  await borrarEmbarquesClaros(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Claros' })
  terreno = await sembrarEmbarquesClaros(proyecto)
})

test.afterAll(async () => {
  await borrarEmbarquesClaros(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E la lista de embarques, el drawer de un contenedor y la aduana dicen qué es cada uno', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(listaDeEmbarques())
  await expect(page.getByText(QUE_ES_EL_EMBARQUE)).toBeVisible()

  await page.goto(listaDeEmbarques(`grupo=contenedores&contenedor=${terreno.otroContenedorId}`))
  const drawer = page.getByRole('dialog', { name: 'Contenedor' })
  await expect(drawer.getByRole('heading', { name: `Contenedor ${OTRO_CONTENEDOR}` })).toBeVisible()
  await expect(drawer.getByText(QUE_ES_EL_CONTENEDOR)).toBeVisible()

  // Un número en lugar del id no abre otro contenedor: dice que no existe.
  await page.goto(listaDeEmbarques(`grupo=contenedores&contenedor=${OTRO_CONTENEDOR}`))
  await expect(
    page
      .getByRole('dialog', { name: 'Contenedor' })
      .getByText('Este contenedor no existe o ya no lo ves.'),
  ).toBeVisible()

  await page.goto(`/logistica/aduana?origen=${terreno.origen.id}`)
  await expect(page.getByText(QUE_ES_LA_DECLARACION).first()).toBeVisible()
})

test('E2E «Nuevo embarque» crea el embarque y lleva a su página', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(listaDeEmbarques('panel=nuevo-embarque'))
  const modal = page.getByRole('dialog', { name: 'Nuevo embarque' })
  await modal.getByLabel('Booking').fill(booking.toLowerCase())
  await modal.getByRole('button', { name: 'Crear embarque' }).click()
  await expect(page.getByText('Embarque creado.')).toBeVisible()

  embarqueId = (await embarqueDeLaBase(terreno.origen.id, booking))?.id ?? ''
  expect(embarqueId).not.toBe('')
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === `/logistica/embarques/${embarqueId}` &&
      url.searchParams.get('origen') === terreno.origen.id,
  )
  await expect(page.getByRole('heading', { level: 1, name: `Embarque ${booking}` })).toBeVisible()
  const cabecera = page
    .locator('header')
    .filter({ has: page.getByRole('heading', { level: 1, name: `Embarque ${booking}` }) })
  await expect(cabecera.getByText(QUE_ES_EL_EMBARQUE)).toBeVisible()
  await expect(cabecera.locator('[data-estado="armandose"]')).toHaveText('Armándose')
})

test('E2E agregar un contenedor y tres vehículos, uno mudado de otro contenedor, sin mover la cabecera', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/logistica/embarques/${embarqueId}?origen=${terreno.origen.id}`)
  const antes = await medirLaCabecera(page)
  const mas = page.getByRole('button', { name: `Más acciones de Embarque ${booking}` })

  // Un contenedor nuevo, desde el «⋯» de la cabecera.
  await mas.click()
  await page.getByRole('menuitem', { name: 'Agregar contenedor' }).click()
  const modal = page.getByRole('dialog', { name: 'Agregar contenedor' })
  await modal.getByLabel('Número').fill(NUEVO_CONTENEDOR.toLowerCase())
  await modal.getByRole('button', { name: 'Agregar contenedor' }).click()
  await expect(page.getByText(`Contenedor ${NUEVO_CONTENEDOR} agregado.`)).toBeVisible()
  const seccion = page.getByRole('region', { name: `Contenedor ${NUEVO_CONTENEDOR}` })
  await expect(seccion.getByText('Este contenedor todavía no lleva vehículos')).toBeVisible()

  // Tres vehículos de una vez al embarque: el tercero viaja en otro contenedor y la pregunta lo nombra antes de mudarlo.
  await mas.click()
  await page.getByRole('menuitem', { name: 'Agregar vehículos' }).click()
  const agregar = page.getByRole('dialog', { name: 'Agregar vehículos' })
  await elegir(agregar, [terreno.uno, terreno.dos, terreno.tres])
  await agregar.getByRole('button', { name: 'Agregar 3 vehículos' }).click()
  await expect(
    agregar.getByText(`1 vehículo ya va en otro contenedor (${OTRO_CONTENEDOR}). ¿Moverlo a éste?`),
  ).toBeVisible()
  await agregar.getByRole('button', { name: 'Mover', exact: true }).click()
  await expect(page.getByText(`Se agregaron 3 vehículos a embarque ${booking}.`)).toBeVisible()
  await expect(agregar).toBeHidden()
  const sueltos = page.getByRole('list', { name: 'Vehículos: Sueltos' })
  await expect(sueltos.getByRole('listitem')).toHaveCount(3)
  expect(await medirLaCabecera(page)).toEqual(antes)

  // Dos de ellos al contenedor, desde su «⋯»: ya van en el embarque, así que no pregunta. Al terminar queda abierto el drawer del contenedor.
  await seccion
    .getByRole('button', { name: `Más acciones de Contenedor ${NUEVO_CONTENEDOR}` })
    .click()
  await page.getByRole('menuitem', { name: 'Agregar vehículos' }).click()
  await elegir(agregar, [terreno.uno, terreno.dos])
  await agregar.getByRole('button', { name: 'Agregar 2 vehículos' }).click()
  await expect(
    page.getByText(`Se agregaron 2 vehículos a contenedor ${NUEVO_CONTENEDOR}.`),
  ).toBeVisible()
  await expect(agregar).toBeHidden()
  const drawer = page.getByRole('dialog', { name: 'Contenedor' })
  await expect(
    drawer.getByRole('heading', { name: `Contenedor ${NUEVO_CONTENEDOR}` }),
  ).toBeVisible()
  await expect(drawer.getByText('2 vehículos', { exact: true })).toBeVisible()
  await quieto(drawer)
  expect(await medirLaCabecera(page)).toEqual(antes)
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  expect(await medirLaCabecera(page)).toEqual(antes)
})

test('E2E la página del embarque: el contenedor con dos vehículos, «Sueltos» con uno y sus declaraciones', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/logistica/embarques/${embarqueId}?origen=${terreno.origen.id}`)
  const enElContenedor = page.getByRole('list', {
    name: `Vehículos de Contenedor ${NUEVO_CONTENEDOR}`,
  })
  await expect(enElContenedor.getByRole('listitem')).toHaveCount(2)
  await expect(enElContenedor).toContainText(terreno.uno.titulo)
  await expect(enElContenedor).toContainText(terreno.dos.titulo)

  const sueltos = page.getByRole('region', { name: 'Sueltos' })
  await expect(
    sueltos.getByText('Vehículos del embarque que no van en un contenedor.'),
  ).toBeVisible()
  const losSueltos = sueltos.getByRole('listitem')
  await expect(losSueltos).toHaveCount(1)
  await expect(losSueltos).toContainText(terreno.tres.titulo)
  await expect(losSueltos.getByText('Sin declaración')).toBeVisible()

  // El primero tiene su declaración, enlazada a la aduana; el segundo, ninguna.
  const declaracion = enElContenedor
    .locator(`[data-vehiculo="${terreno.uno.id}"]`)
    .getByRole('link', { name: `Declaración ${terreno.declaracion.numero}` })
  await expect(declaracion).toHaveAttribute(
    'href',
    new RegExp(`^/logistica/aduana\\?.*declaracion=${terreno.declaracion.id}`),
  )
  await expect(
    enElContenedor.locator(`[data-vehiculo="${terreno.dos.id}"]`).getByText('Sin declaración'),
  ).toBeVisible()
})

test('E2E el estado en su insignia, su filtro en la URL y el vacío por filtro con «Limpiar filtros»', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(listaDeEmbarques())
  await expect(page.getByText(booking).first()).toBeVisible()
  await expect(page.locator('[data-estado="armandose"]')).toHaveText('Armándose')

  await page.goto(listaDeEmbarques('estado=en_transito'))
  await expect(page.getByText('Nada coincide con los filtros')).toBeVisible()
  await expect(page.getByText('Ningún embarque con estos filtros.')).toBeVisible()
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(page).not.toHaveURL(/estado=/)
  await expect(page.locator('[data-estado="armandose"]')).toHaveText('Armándose')
})

test('E2E «Mover el contenedor» desde su drawer lleva al lote de la Cadena', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  const id = idDelContenedor(NUEVO_CONTENEDOR)
  await page.goto(listaDeEmbarques(`grupo=contenedores&contenedor=${id}`))
  const drawer = page.getByRole('dialog', { name: 'Contenedor' })
  await expect(
    drawer.getByRole('heading', { name: `Contenedor ${NUEVO_CONTENEDOR}` }),
  ).toBeVisible()
  await drawer.getByRole('link', { name: 'Mover el contenedor' }).click()
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === '/logistica' &&
      url.searchParams.get('panel') === 'lote' &&
      url.searchParams.get('contenedor') === id,
  )
})
