// @sin-celular-archivo: la configuración se recorre en escritorio; el celular lo revisa la IA con capturas
import { expect, test, type Page } from './soporte/prueba'
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
import { publicarFormulaDePrueba } from './soporte/cotizar-formula'
import { PREFIJO_CLAVE_E2E, crearOrigenDePrueba, tarjetaDelOrigen } from './soporte/origenes'
import { enLaPestana, pestanaDelOrigen } from './soporte/pestanas-del-origen'
import { literal, sql } from './soporte/sql'

// El origen como centro: cada origen tiene su página (`/configuracion/origenes/<id>/<pestaña>`) con seis pestañas, cada una con su permiso en ese
// origen y un ⚠ en la que tiene algo pendiente. `/configuracion/origenes/<id>` sin pestaña lleva a la de entrada de quien pide (308, por persona).

type Origen = { id: string; nombre: string }

let proyecto = ''
let duena = ''
let cotizadora = ''
// A: el que configura la cotizadora. B: uno que ella no abre. T: el de la tira. C: uno inactivo.
let a: Origen = { id: '', nombre: '' }
let b: Origen = { id: '', nombre: '' }
let t: Origen = { id: '', nombre: '' }
let c: Origen = { id: '', nombre: '' }

const claveBase = () => `centro_${proyecto}_`

async function borrarLoMio() {
  await admin().from('origenes').delete().like('clave', `${PREFIJO_CLAVE_E2E}${claveBase()}%`)
}

async function persona(etiqueta: string, nombre: string, permisos: PermisoDePrueba[]) {
  const correo = correoDePrueba(`${etiqueta}-centro-${proyecto}`)
  await crearPersona({ email: correo, contrasena: CONTRASENA, nombre, invitada: true })
  await darRolDePrueba({
    email: correo,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}${nombre} ${proyecto}`,
      clave: `e2e_${etiqueta}_centro_${proyecto}`,
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
  a = await nuevo('Centro A', 'a')
  b = await nuevo('Centro B', 'b')
  t = await nuevo('Centro Tira', 'tira')
  c = await nuevo('Centro Inactivo', 'inactivo')
  const { error } = await admin().from('origenes').update({ activo: false }).eq('id', c.id)
  if (error) throw new Error(`No se pudo desactivar el origen: ${error.message}`)
  duena = correoDePrueba(`duena-centro-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Celia Centro' })
  cotizadora = await persona('cotiza', 'Coti Centro', [
    { clave: 'cotizaciones.configurar', origenId: a.id },
  ])
})

test.afterAll(async () => {
  await borrarLoMio()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const menu = (page: Page) => page.getByRole('navigation', { name: 'Secciones de Configuración' })
const avisos = (page: Page) => page.locator('[data-aviso-de-la-pestana]')

// Quien entra a `/configuracion/origenes/<id>` va a la última pestaña que abrió ahí: las pruebas que miden la primera vez la olvidan antes.
function olvidarLasPestanas(correo: string) {
  sql(
    `delete from public.preferencias_usuario where clave = 'origenes.ultima_pestana' and usuario_id = (select id from public.perfiles where email = ${literal(correo)})`,
  )
}

test('E2E pestañas con permisos: quien sólo configura el cotizador de un origen', async ({
  page,
}) => {
  olvidarLasPestanas(cotizadora)
  await entrar(page, cotizadora, { fresco: true })

  // La página sola abre la primera pestaña que abre: Fases pide el flujo, así que la Planilla.
  await page.goto(`/configuracion/origenes/${a.id}`)
  await expect(page).toHaveURL(new RegExp(`/configuracion/origenes/${a.id}/planilla(\\?|$)`))
  await expect(page.getByRole('heading', { name: a.nombre, level: 1 })).toBeVisible()
  await enLaPestana(page, 'Planilla')

  // Datos, en su drawer, en sólo lectura y con su motivo; sin `origenes.gestionar` no hay «⋯» en escritorio.
  await expect(page.getByRole('button', { name: `Más acciones de ${a.nombre}` })).toHaveCount(0)
  await page.getByRole('button', { name: 'Datos', exact: true }).click()
  const datos = page.getByRole('dialog', { name: 'Datos del origen' })
  await expect(datos.getByText('no tienes el permiso «Gestionar orígenes»')).toBeVisible()
  await expect(datos.getByLabel('Nombre', { exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(datos).toBeHidden()

  // Fases, apagada con su motivo bajo las pestañas; Campos sí abre.
  await expect(pestanaDelOrigen(page, 'Fases')).toBeDisabled()
  await expect(
    page.getByText(
      'Fases: Lo configura quien tiene el permiso «Configurar el flujo» o «Catálogos de logística».',
    ),
  ).toBeVisible()

  await pestanaDelOrigen(page, 'Campos').click()
  await expect(page).toHaveURL(`/configuracion/origenes/${a.id}/campos`)
  await enLaPestana(page, 'Campos')

  // Fases escrita a mano en la URL: dice por qué y ofrece la primera que abre.
  await page.goto(`/configuracion/origenes/${a.id}/fases`)
  await expect(page.getByText('No puedes abrir esta pestaña')).toBeVisible()
  const irALaPrimera = page.getByRole('link', { name: 'Ir a Planilla' })
  await expect(irALaPrimera).toHaveAttribute('href', `/configuracion/origenes/${a.id}/planilla`)

  // El selector de las migas ofrece el origen que abre y no el que no abre.
  await page.getByRole('button', { name: `Cambiar de origen (ahora ${a.nombre})` }).click()
  const otros = page.getByRole('list', { name: 'Orígenes' })
  await expect(otros.getByRole('link', { name: a.nombre })).toBeVisible()
  await expect(otros.getByRole('link', { name: b.nombre })).toHaveCount(0)
  await page.keyboard.press('Escape')

  // La lista y el menú de Configuración tampoco lo muestran, y su página dice que no se abre.
  await page.goto('/configuracion/origenes')
  await expect(tarjetaDelOrigen(page, a.nombre)).toBeVisible()
  await expect(tarjetaDelOrigen(page, b.nombre)).toHaveCount(0)
  await expect(menu(page).getByRole('link', { name: b.nombre, exact: true })).toHaveCount(0)
  await page.goto(`/configuracion/origenes/${b.id}/fases`)
  await expect(page.getByText('No puedes abrir este origen')).toBeVisible()
})

test('E2E el ⚠ de las pestañas: lo que falta lo dice su pestaña, publicar la fórmula lo quita y un inactivo no avisa', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${t.id}/campos`)
  await enLaPestana(page, 'Campos')

  // Sin fases ni fórmula: Fases y Planilla lo dicen en su nombre (y su ⚠); la tarjeta, que se usa la de siempre.
  for (const nombre of [
    'Fases. Sin fases: sus vehículos no se pueden mover',
    'Planilla. Sin fórmula activa: no se puede cotizar',
    'Tarjeta. Sin publicar: se usa la tarjeta de siempre',
  ]) {
    await expect(page.getByRole('tab', { name: nombre })).toBeVisible()
  }
  await expect(pestanaDelOrigen(page, 'Fases').locator('[data-aviso-de-la-pestana]')).toHaveCount(1)

  // Con la fórmula publicada, la Planilla ya no avisa; Fases sí.
  publicarFormulaDePrueba(t.id)
  await page.reload()
  await expect(page.getByRole('tab', { name: 'Planilla', exact: true })).toBeVisible()
  await expect(pestanaDelOrigen(page, 'Fases').locator('[data-aviso-de-la-pestana]')).toHaveCount(1)

  // Inactivo: «Inactivo» junto al nombre y ninguna pestaña avisa.
  await page.goto(`/configuracion/origenes/${c.id}/campos`)
  await expect(page.getByRole('heading', { name: c.nombre, level: 1 })).toBeVisible()
  await expect(page.getByText('Inactivo', { exact: true })).toBeVisible()
  await enLaPestana(page, 'Campos')
  await expect(avisos(page)).toHaveCount(0)
})

test('E2E /configuracion/origenes/<id> sin pestaña lleva a la de entrada, por persona y con su consulta', async ({
  page,
}) => {
  olvidarLasPestanas(duena)
  await entrar(page, duena)
  const respuesta = await page.request.get(`/configuracion/origenes/${a.id}?panel=datos`, {
    maxRedirects: 0,
  })
  expect(respuesta.status()).toBe(308)
  expect(respuesta.headers()['cache-control']).toBe('private, no-store')
  const destino = new URL(respuesta.headers()['location'] ?? '', 'http://x')
  expect(`${destino.pathname}${destino.search}`).toBe(
    `/configuracion/origenes/${a.id}/fases?panel=datos`,
  )
})
