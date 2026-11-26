// @sin-celular-archivo: el celular lo cubre el recorrido de la IA con capturas
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  type PermisoDePrueba,
} from './soporte/base'
import { PREFIJO_CLAVE_E2E, abrirLosDatos, crearOrigenDePrueba } from './soporte/origenes'
import { enLaPestana, pestanaDelOrigen } from './soporte/pestanas-del-origen'
import { expect, test, type Page } from './soporte/prueba'
import { formulaDeTrabajoDe } from './soporte/rutas-de-la-formula'
import { esperarDosCuadros } from './soporte/barra-de-filtros'
import { literal, sql } from './soporte/sql'

// La página del origen en pestañas planas (docs/UX.md › «La página del origen»): a todo el ancho, con las migas y el selector de origen, «Datos» en un
// drawer (en el celular, dentro del «⋯»), el ⚠ con su tooltip y la entrada que recuerda la última pestaña de cada persona.

type Origen = { id: string; nombre: string }

let proyecto = ''
let duena = ''
// Configura el cotizador de A y gestiona B: en B no abre la Planilla.
let mixta = ''
// A y B: con fases y sin ellas. S: sin nada (el ⚠ de Fases).
let a: Origen = { id: '', nombre: '' }
let b: Origen = { id: '', nombre: '' }
let s: Origen = { id: '', nombre: '' }

const claveBase = () => `pestanas_${proyecto}_`

async function borrarLoMio() {
  await admin().from('origenes').delete().like('clave', `${PREFIJO_CLAVE_E2E}${claveBase()}%`)
}

async function persona(etiqueta: string, nombre: string, permisos: PermisoDePrueba[]) {
  const correo = correoDePrueba(`${etiqueta}-pestanas-${proyecto}`)
  await crearPersona({ email: correo, contrasena: CONTRASENA, nombre, invitada: true })
  await darRolDePrueba({
    email: correo,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}${nombre} ${proyecto}`,
      clave: `e2e_${etiqueta}_pestanas_${proyecto}`,
    },
    permisos,
  })
  return correo
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarLoMio()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  const nuevo = (nombre: string, resto: string) =>
    crearOrigenDePrueba(`E2E ${nombre} ${proyecto}`, `${claveBase()}${resto}`, { tipo: 'manual' })
  a = await nuevo('Pestañas A', 'a')
  b = await nuevo('Pestañas B', 'b')
  s = await nuevo('Pestañas Sin Nada', 's')
  duena = correoDePrueba(`duena-pestanas-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Pestañas' })
  mixta = await persona('mixta', 'Mixta Pestañas', [
    { clave: 'cotizaciones.configurar', origenId: a.id },
    { clave: 'origenes.gestionar', origenId: b.id },
  ])
})

test.afterAll(async () => {
  await borrarLoMio()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const recordadaDe = (correo: string, origenId: string): string =>
  sql(
    `select coalesce(valor ->> ${literal(origenId)}, '') from public.preferencias_usuario where clave = 'origenes.ultima_pestana' and usuario_id = (select id from public.perfiles where email = ${literal(correo)})`,
  ).trim()

function olvidarLasPestanas(correo: string) {
  sql(
    `delete from public.preferencias_usuario where clave = 'origenes.ultima_pestana' and usuario_id = (select id from public.perfiles where email = ${literal(correo)})`,
  )
}

// A dónde responde un 308 (ruta y consulta) y con qué caché.
async function redireccion(page: Page, de: string) {
  const respuesta = await page.request.get(de, { maxRedirects: 0 })
  expect(respuesta.status()).toBe(308)
  const destino = new URL(respuesta.headers()['location'] ?? '', 'http://x')
  return {
    a: `${destino.pathname}${destino.search}`,
    cache: respuesta.headers()['cache-control'] ?? '',
  }
}

const menuDeConfiguracion = (page: Page) =>
  page.getByRole('navigation', { name: 'Secciones de Configuración' })
const migas = (page: Page) => page.getByRole('navigation', { name: 'Migas' })

test('E2E la entrada recuerda la última pestaña que cada persona abrió en cada origen', async ({
  page,
}) => {
  olvidarLasPestanas(duena)
  olvidarLasPestanas(mixta)
  await entrar(page, duena, { fresco: true })

  // Sin nada recordado, la primera que abre (Fases), por persona y sin caché compartida.
  const primera = await redireccion(page, `/configuracion/origenes/${a.id}?x=1`)
  expect(primera.a).toBe(`/configuracion/origenes/${a.id}/fases?x=1`)
  expect(primera.cache).toContain('private')

  // Abrir Categorías la recuerda; entrar de nuevo lleva ahí.
  await page.goto(`/configuracion/origenes/${a.id}/categorias`)
  await enLaPestana(page, 'Categorías')
  await expect.poll(() => recordadaDe(duena, a.id)).toBe('categorias')
  expect((await redireccion(page, `/configuracion/origenes/${a.id}`)).a).toBe(
    `/configuracion/origenes/${a.id}/categorias`,
  )
  // Cada origen recuerda la suya: B, sin abrir, sigue en la primera.
  expect((await redireccion(page, `/configuracion/origenes/${b.id}`)).a).toBe(
    `/configuracion/origenes/${b.id}/fases`,
  )

  // Otra persona no hereda lo de la dueña: la mixta entra a A por la primera que abre (Planilla).
  await page.context().clearCookies()
  await entrar(page, mixta, { fresco: true })
  expect((await redireccion(page, `/configuracion/origenes/${a.id}`)).a).toBe(
    `/configuracion/origenes/${a.id}/planilla`,
  )
})

test('E2E a todo el ancho, con las migas y el selector de origen, que conserva la pestaña si la abre', async ({
  page,
}) => {
  await entrar(page, mixta, { fresco: true })
  await page.goto(`/configuracion/origenes/${a.id}/planilla`)
  await enLaPestana(page, 'Planilla')
  await expect(page.getByRole('heading', { name: a.nombre, level: 1 })).toBeVisible()
  // Sin el menú de Configuración: la página usa todo el ancho.
  await expect(menuDeConfiguracion(page)).toHaveCount(0)

  // «Orígenes» de las migas vuelve a la lista, con el menú.
  await expect(migas(page).getByRole('link', { name: 'Orígenes', exact: true })).toHaveAttribute(
    'href',
    '/configuracion/origenes',
  )

  // El selector: en B la mixta no abre la Planilla, así que va a la primera que abre (Campos).
  await migas(page)
    .getByRole('button', { name: `Cambiar de origen (ahora ${a.nombre})` })
    .click()
  const lista = page.getByRole('list', { name: 'Orígenes' })
  await expect(lista.getByRole('link', { name: a.nombre })).toBeVisible()
  await lista.getByRole('link', { name: b.nombre }).click()
  await expect(page).toHaveURL(new RegExp(`/configuracion/origenes/${b.id}/campos$`))
  await expect(page.getByRole('heading', { name: b.nombre, level: 1 })).toBeVisible()

  // De vuelta a A desde Categorías (la abre en los dos): la misma pestaña.
  await pestanaDelOrigen(page, 'Categorías').click()
  await enLaPestana(page, 'Categorías')
  await migas(page)
    .getByRole('button', { name: `Cambiar de origen (ahora ${b.nombre})` })
    .click()
  await page.getByRole('list', { name: 'Orígenes' }).getByRole('link', { name: a.nombre }).click()
  await expect(page).toHaveURL(new RegExp(`/configuracion/origenes/${a.id}/categorias$`))
})

test('E2E el drawer de los datos: guardar lo cierra, y cerrar con cambios pregunta antes', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${b.id}/campos`)
  await enLaPestana(page, 'Campos')
  let datos = await abrirLosDatos(page)
  await expect(page).toHaveURL(/[?&]panel=datos(&|$)/)

  // Cerrar con cambios pregunta en el pie; «Descartar» cierra sin guardar.
  await datos.getByLabel('Nombre', { exact: true }).fill(`${b.nombre} sin guardar`)
  await esperarDosCuadros(page)
  await page.keyboard.press('Escape')
  await expect(datos.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await datos.getByRole('button', { name: 'Descartar' }).click()
  await expect(datos).toBeHidden()
  await expect(page.getByRole('heading', { name: b.nombre, level: 1 })).toBeVisible()

  // Guardar cierra el drawer y el nombre nuevo llega a la cabecera.
  datos = await abrirLosDatos(page)
  const renombrado = `${b.nombre} Renombrado`
  await datos.getByLabel('Nombre', { exact: true }).fill(renombrado)
  await datos.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(datos).toBeHidden()
  await expect(page.getByRole('heading', { name: renombrado, level: 1 })).toBeVisible()
  await expect(page).not.toHaveURL(/[?&]panel=datos/)
  const { error } = await admin().from('origenes').update({ nombre: b.nombre }).eq('id', b.id)
  if (error) throw new Error(`No se pudo volver al nombre: ${error.message}`)
})

test('E2E el ⚠ de una pestaña dice lo que falta en su tooltip', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${s.id}/campos`)
  await enLaPestana(page, 'Campos')
  const fases = page.getByRole('tab', {
    name: 'Fases. Sin fases: sus vehículos no se pueden mover',
  })
  await fases.hover()
  await expect(page.locator('[data-slot="tooltip"]')).toHaveText(
    'Sin fases: sus vehículos no se pueden mover',
  )
})

test('E2E la barra de la fórmula: una archivada o de otro origen por URL, y «Versiones» desde la Hoja', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const deA = formulaDeTrabajoDe(a.id)
  const deB = formulaDeTrabajoDe(b.id)
  const archivada = sql(
    `insert into public.formulas_del_origen (origen_id, nombre, archivada_en) values (${literal(a.id)}::uuid, 'E2E archivada', now()) returning id`,
  ).trim()

  // Una `?formula=` de otro origen: el aviso y la de trabajo.
  await page.goto(`/configuracion/origenes/${a.id}/hoja?formula=${deB}`)
  await enLaPestana(page, 'Hoja')
  await expect(
    page.getByText('Esa fórmula no es de este origen o ya no existe: te mostramos la de trabajo.'),
  ).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/hoja\\?(.*&)?formula=${deA}(&|$)`))

  // «Versiones» desde la Hoja lleva a la Planilla de la misma fórmula, con su drawer.
  await page.locator('[data-barra-de-la-formula]').getByRole('link', { name: 'Versiones' }).click()
  await expect(page).toHaveURL(new RegExp(`/planilla\\?(.*&)?formula=${deA}&?.*panel=versiones`))
  await expect(page.getByRole('dialog', { name: 'Versiones' })).toBeVisible()

  // Una archivada: su aviso, «Copiar» y la vuelta a la de trabajo, sin el editor ni «Versiones».
  await page.goto(`/configuracion/origenes/${a.id}/tarjeta?formula=${archivada}`)
  await expect(
    page.getByText('Esta fórmula está archivada: cópiala para seguir editándola.'),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Copiar', exact: true })).toBeVisible()
  await expect(page.locator('[data-barra-de-la-formula]').getByText('Versiones')).toHaveCount(0)
  await page.getByRole('link', { name: 'Ir a la fórmula de trabajo' }).click()
  await expect(page).toHaveURL(new RegExp(`/tarjeta\\?(.*&)?formula=${deA}(&|$)`))
})
