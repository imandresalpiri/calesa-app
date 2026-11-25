import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { borrarLeadsDePrueba, crearLead, marcarInteres, vincular } from './soporte/leads'
import { PRESUPUESTO_DE_LA_FICHA_DEL_VEHICULO_EN_KB } from './soporte/presupuestos'
import { borrarQueFalta, sembrarQueFalta, type TerrenoDeQueFalta } from './soporte/que-falta'
import { cajaDe, personaSinLogistica } from './soporte/ficha-del-vehiculo'
import { compartirApuntaA } from './soporte/ficha-izquierda'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { sembrarFotos } from './soporte/vehiculos-lista'

// La ficha del vehículo en dos columnas (`docs/UX.md` › Vehículo): a la derecha, sólo lo de ventas —«Cotizaciones de este vehículo», «Relacionados»,
// y «Actividad reciente»—; una `?seccion=` que no es uno de esos bloques no hace nada. Sobre el vehículo `uno` del terreno de
// «Qué falta», con un vinculado, dos interesados, dos cotizaciones (la más vieja, la aprobada) y dos fotos. Qué bloque ve quién: `bloques.test.ts`.
test.describe.configure({ mode: 'serial' })

let terreno: TerrenoDeQueFalta
let duena = ''
let sinLogistica = ''
let id = ''
let titulo = ''

const variante = (proyecto: string) => `f_${proyecto}`
// Las cotizaciones sembradas salen de una fórmula publicada: el origen de «Qué falta» no tiene, la subasta de la semilla sí.
const conFormula = () => sql("select id from public.origenes where clave = 'subasta_usa'")
const idDe = (correo: string) =>
  sql(`select id from public.perfiles where email = ${literal(correo)}`)
const sembrar = (cuantas: number, desde = 0) => {
  sembrarCotizaciones({
    origenId: conFormula(),
    vehiculoId: id,
    creadoPor: idDe(duena),
    cuantas,
    desde,
  })
}
const cotizacionesDelVehiculo = () =>
  sql(
    `select numero from public.cotizaciones where vehiculo_id = ${literal(id)}::uuid order by creado_en, id`,
  )
    .split('\n')
    .filter((n) => n !== '')

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarQueFalta(variante(proyecto))
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-ficha-dos-columnas-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Dos Columnas' })
  terreno = await sembrarQueFalta(variante(proyecto))
  id = terreno.uno.id
  titulo = terreno.uno.titulo
  const telefono = (n: number) => `5917${String(Date.now() + n).slice(-7)}`
  await vincular(
    id,
    await crearLead({ nombre: `Vinculado ${proyecto}`, telefono: telefono(1), deQuien: duena }),
  )
  for (const n of [2, 3]) {
    const lead = await crearLead({
      nombre: `Interesado ${String(n)} ${proyecto}`,
      telefono: telefono(n),
      deQuien: duena,
    })
    await marcarInteres({ vehiculoId: id, leadId: lead, quien: duena })
  }
  // Dos, sembradas sin triggers: la aprobada la pone el relleno de la base (la más vieja).
  sembrar(2)
  sql('select public._cotizaciones_aprobadas_rellenar();')
  await sembrarFotos(id, 2)
  sinLogistica = await personaSinLogistica(proyecto, terreno.origen.id)
})

test.afterAll(async ({}, info) => {
  sql(`delete from public.cotizaciones where vehiculo_id = ${literal(id)}::uuid`)
  await admin().from('vehiculos_imagenes').delete().eq('vehiculo_id', id)
  await borrarQueFalta(variante(info.project.name))
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const indice = (page: Page): Locator => page.getByRole('navigation', { name: 'Índice de la ficha' })
const tituloDe = (page: Page, nombre: string): Locator =>
  page.locator('main').getByRole('heading', { name: nombre, exact: true, level: 2 })
const region = (page: Page, nombre: string): Locator =>
  page.getByRole('region', { name: nombre, exact: true })
// La subasta y el costo de la izquierda (sin título a la vista): «Subasta y costo» o, en un origen manual, «Precio y costo».
const costo = (page: Page): Locator => page.getByRole('region', { name: / y costo$/ })
// Las cotizaciones del vehículo son tarjetas en una fila (`article`).
const filas = (page: Page): Locator =>
  page.getByRole('list', { name: 'Cotizaciones de este vehículo' }).locator('article')

const BLOQUES = ['Cotizaciones de este vehículo', 'Relacionados', 'Actividad reciente']

async function alaFicha(page: Page, busqueda = ''): Promise<void> {
  await page.goto(`/vehiculos/${id}${busqueda}`)
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
  await expect(indice(page)).toHaveAttribute('data-hidratado', 'true')
}

test('E2E ficha en dos columnas · a la derecha sólo lo de ventas, en su orden', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await alaFicha(page)
  // Derecha: el índice y los tres bloques, en su orden.
  await expect(indice(page).getByRole('link')).toHaveText([
    'Cotizaciones',
    'Relacionados',
    'Actividad',
  ])
  const ys: number[] = []
  for (const nombre of BLOQUES) {
    await expect(tituloDe(page, nombre)).toBeAttached()
    ys.push((await cajaDe(tituloDe(page, nombre))).y)
  }
  expect(ys).toEqual([...ys].sort((a, b) => a - b))
  // Lo que se fue: la ficha repetida, lo de logística y lo de repuestos (quedan sus enlaces cortos en la cabecera).
  for (const nombre of ['Ficha', 'Fase y qué falta', 'Documentos', 'Repuestos', 'Fotos']) {
    await expect(region(page, nombre)).toHaveCount(0)
  }
  await expect(page.getByRole('link', { name: 'Ver en logística' })).toHaveCount(1)
  await capturar(page, info, 'ficha-arriba')
  // Las cotizaciones llegan al acercarse: la aprobada primero.
  await region(page, 'Cotizaciones de este vehículo').scrollIntoViewIfNeeded()
  await expect(filas(page)).toHaveCount(2)
  await expect(filas(page).first()).toContainText('Aprobada')
  await region(page, 'Actividad reciente').scrollIntoViewIfNeeded()
  await capturar(page, info, 'ficha-abajo')
})

test('E2E ficha en dos columnas · «Cotizar» en el título y «Aprobar esta» pone al día el costo estimado de la izquierda', async ({
  page,
}) => {
  await entrar(page, duena)
  await alaFicha(page, '?seccion=cotizaciones')
  await expect(tituloDe(page, 'Cotizaciones de este vehículo')).toBeFocused()
  const bloque = region(page, 'Cotizaciones de este vehículo')
  const cotizar = bloque.getByRole('link', { name: 'Cotizar', exact: true })
  await expect(cotizar).toHaveAttribute(
    'href',
    new RegExp(`returnTo=${encodeURIComponent(`/vehiculos/${id}`)}`),
  )
  const [vieja = '', nueva = ''] = cotizacionesDelVehiculo()
  // El «Costo estimado» de la izquierda abre Compartir de la aprobada: primero la más vieja, luego la nueva.
  const compartir = costo(page).getByRole('button', { name: /^Compartir la cotización aprobada/ })
  await compartirApuntaA(page, compartir, vieja)
  const otra = filas(page).filter({ hasText: `N.º ${nueva}` })
  await otra.getByRole('button', { name: 'Aprobar esta' }).click()
  await expect(filas(page).first()).toContainText(`N.º ${nueva}`)
  await compartirApuntaA(page, compartir, nueva)
  await cotizar.click()
  await expect(page).toHaveURL(/\/cotizaciones\/nuevo\?/)
})

test('E2E ficha en dos columnas · «Actividad reciente» lleva a toda la actividad del vehículo', async ({
  page,
}) => {
  await entrar(page, duena)
  await alaFicha(page, '?seccion=actividad')
  await expect(tituloDe(page, 'Actividad reciente')).toBeFocused()
  const actividad = region(page, 'Actividad reciente')
  await expect(actividad.getByRole('link', { name: 'Ver toda la actividad' })).toHaveAttribute(
    'href',
    `/actividad?entidad=vehiculos&registro=${id}`,
  )
  // Las filas se leen desde el navegador al acercarse: el alta del vehículo es la última.
  await expect(actividad.getByRole('listitem').last()).toContainText(`creó ${titulo}`)
})

test('E2E ficha en dos columnas · la vitrina no es un bloque: se publica en su panel y la insignia dice si se ve', async ({
  page,
}, info) => {
  sql(
    `update public.vehiculos set publicado_web = false, precio_web = null, precio_web_hasta = null where id = ${literal(id)}::uuid`,
  )
  await entrar(page, duena)
  await alaFicha(page)
  await expect(region(page, 'Vitrina')).toHaveCount(0)
  await expect(indice(page).getByRole('link', { name: 'Vitrina' })).toHaveCount(0)
  await page.goto(`/vehiculos/${id}?panel=vitrina`)
  await expect(page.getByRole('dialog', { name: 'Publicar en la web' })).toBeVisible()

  // Publicado, la ficha sigue sin bloque: lo dice la insignia de la izquierda.
  sql(
    `update public.vehiculos set publicado_web = true, precio_web = 15000 where id = ${literal(id)}::uuid`,
  )
  await alaFicha(page)
  await expect(region(page, 'Vitrina')).toHaveCount(0)
  await expect(page.getByText(/En vitrina|Publicado, no visible/).first()).toBeVisible()
  await capturar(page, info, 'vitrina-publicada')
})

test('E2E ficha en dos columnas · cada URL abre lo suyo y una sección que no es un bloque no hace nada', async ({
  page,
}) => {
  await entrar(page, duena)
  // `?ver=ficha` abre la ficha completa; `?visor=`, el visor.
  await page.goto(`/vehiculos/${id}?ver=ficha`)
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.goto(`/vehiculos/${id}?visor=${id}&foto=1`)
  await expect(page.locator('[data-visor-de-imagenes]')).toBeVisible()
  // `?seccion=repuestos` no es un bloque: la URL queda como está y la ficha, arriba.
  await alaFicha(page, '?seccion=repuestos')
  await expect(page).toHaveURL(new RegExp(`/vehiculos/${id}\\?seccion=repuestos$`))
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeInViewport()
  // Con un panel abierto, lo de atrás sale del árbol de accesibilidad: se espera lo que abre la URL.
  for (const [busqueda, nombre] of [
    [`?editar=${id}`, `Editar ${titulo}`],
    ['?panel=vitrina', 'Publicar en la web'],
    ['?panel=desvincular', undefined],
    ['?panel=marcar-interesado', 'Marcar un interesado'],
    ['?relacionados=interesado', undefined],
  ] as const) {
    await page.goto(`/vehiculos/${id}${busqueda}`)
    await expect(page.getByRole('dialog', nombre ? { name: nombre } : {})).toBeVisible()
  }
})

test('E2E ficha en dos columnas · sin permisos, sólo «Relacionados» y sin vitrina a la derecha', async ({
  page,
}, info) => {
  // Ve el vehículo y los leads: ni cotizaciones, ni actividad, ni logística.
  await entrar(page, sinLogistica, { fresco: true })
  await alaFicha(page)
  await expect(indice(page).getByRole('link')).toHaveText(['Relacionados'])
  await expect(region(page, 'Cotizaciones de este vehículo')).toHaveCount(0)
  await expect(region(page, 'Actividad reciente')).toHaveCount(0)
  await expect(region(page, 'Vitrina')).toHaveCount(0)
  await capturar(page, info, 'sin-permisos')
  // `?seccion=documentos` no es un bloque: la ficha se queda arriba.
  await alaFicha(page, '?seccion=documentos')
  await expect(page).toHaveURL(new RegExp(`/vehiculos/${id}\\?seccion=documentos$`))
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeInViewport()
  // Sólo con logística: ningún bloque de ventas, y la derecha sin índice.
  await page.context().clearCookies()
  await entrar(page, terreno.sinAsignar.correo, { fresco: true })
  await page.goto(`/vehiculos/${id}`)
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
  await expect(indice(page)).toHaveCount(0)
})

test('E2E ficha en dos columnas · la forma: dos columnas en escritorio, una en el celular y al 200 %', async ({
  page,
}, info) => {
  await entrar(page, duena)
  await alaFicha(page)
  const h1 = page.getByRole('heading', { name: titulo, level: 1 })
  if (info.project.name === 'escritorio') {
    // La lateral, a la izquierda del índice.
    expect((await cajaDe(h1)).derecha).toBeLessThanOrEqual((await cajaDe(indice(page))).x)
  } else {
    // Una columna, en orden.
    const enOrden = [
      h1,
      costo(page),
      tituloDe(page, 'Datos principales'),
      indice(page),
      ...BLOQUES.map((nombre) => tituloDe(page, nombre)),
    ]
    const ys: number[] = []
    for (const elemento of enOrden) {
      ys.push((await cajaDe(elemento)).y)
    }
    expect(ys).toEqual([...ys].sort((a, b) => a - b))
    await capturar(page, info, 'celular')
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  // Una sola columna: la cabecera arriba del índice.
  expect((await cajaDe(h1)).abajo).toBeLessThanOrEqual((await cajaDe(indice(page))).y)
  await region(page, 'Cotizaciones de este vehículo').scrollIntoViewIfNeeded()
  await capturar(page, info, 'texto-al-200')
})

test('E2E ficha en dos columnas · el documento no crece con las cotizaciones', async ({
  page,
}, info) => {
  await entrar(page, duena)
  const largo = async (ruta: string) => (await (await page.goto(ruta))?.body())?.length ?? 0
  const perfil = await largo('/perfil')
  sql(`delete from public.cotizaciones where vehiculo_id = ${literal(id)}::uuid`)
  sembrar(1)
  const conUna = (await largo(`/vehiculos/${id}`)) - perfil
  sembrar(600, 5)
  const conMuchas = (await largo(`/vehiculos/${id}`)) - perfil
  const kb = (bytes: number) => Math.round((bytes / 1024) * 10) / 10
  const medido = `la ficha aporta ${String(kb(conUna))} KB con 1 cotización y ${String(kb(conMuchas))} KB con 601 (sobre un /perfil de ${String(kb(perfil))} KB)`
  console.warn(`[ficha del vehículo] ${info.project.name}: ${medido}`)
  info.annotations.push({ type: 'documento de la ficha', description: medido })
  expect(Math.abs(conMuchas - conUna)).toBeLessThanOrEqual(1024)
  expect(conUna).toBeLessThanOrEqual(PRESUPUESTO_DE_LA_FICHA_DEL_VEHICULO_EN_KB * 1024)
})
