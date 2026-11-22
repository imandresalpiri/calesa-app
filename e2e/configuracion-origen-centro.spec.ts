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
import { formulaDeTrabajoDe } from './soporte/rutas-de-la-formula'
import { literal, sql } from './soporte/sql'

// El origen como centro: cada origen tiene su página (`/configuracion/origenes/<id>/<pestaña>`) con seis pestañas, cada una con su permiso en ese
// origen y un ⚠ en la que tiene algo pendiente; lo de toda la empresa vive en Catálogos. Las URL de cuando Cotización, Flujos y Logística eran
// secciones siguen llevando adonde vive hoy lo que pedían, con un 308 del servidor y su consulta.

const ID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const UNA_FASE = '00000000-0000-4000-8000-0000000000f1'
const UNA_TABLA = '00000000-0000-4000-8000-0000000000a1'
const UN_CAMPO = '00000000-0000-4000-8000-0000000000c1'
const UNA_CATEGORIA = '00000000-0000-4000-8000-0000000000d1'

type Origen = { id: string; nombre: string }

let proyecto = ''
let duena = ''
let cotizadora = ''
let logistica = ''
// A: el que configura la cotizadora. B: uno que ella no abre. T: el de la tira. C: uno inactivo.
let a: Origen = { id: '', nombre: '' }
let b: Origen = { id: '', nombre: '' }
let t: Origen = { id: '', nombre: '' }
let c: Origen = { id: '', nombre: '' }
// F: uno con una fórmula del origen (la de trabajo), para las URL viejas de la fórmula.
let f: Origen = { id: '', nombre: '' }
let formulaDeF = ''

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
  f = await nuevo('Centro Con Fórmula', 'formula')
  formulaDeF = formulaDeTrabajoDe(f.id)
  const { error } = await admin().from('origenes').update({ activo: false }).eq('id', c.id)
  if (error) throw new Error(`No se pudo desactivar el origen: ${error.message}`)
  duena = correoDePrueba(`duena-centro-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Celia Centro' })
  cotizadora = await persona('cotiza', 'Coti Centro', [
    { clave: 'cotizaciones.configurar', origenId: a.id },
  ])
  logistica = await persona('logistica', 'Lola Logística', ['logistica.catalogos.gestionar'])
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
    page.getByText('Fases: Lo configura quien tiene el permiso «Configurar el flujo».'),
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

// Cada URL vieja, con quién la pide y adónde tiene que llevar (ruta y consulta). `destino` es la ruta exacta o una expresión para lo que
// depende del orden de los orígenes.
type Redireccion = {
  de: () => string
  a: () => string | RegExp
  quien?: 'duena' | 'logistica'
}

const REDIRECCIONES: Record<string, Redireccion> = {
  // Las fijas de next.config.ts. Colores y Vigencia viven en Orígenes (`?panel=`): un `?panel=` propio manda y va solo.
  'cotizacion/general': {
    de: () => '/configuracion/cotizacion/general?x=1',
    a: () => '/configuracion/origenes?x=1&panel=colores',
  },
  'cotizacion/general/niveles': {
    de: () => '/configuracion/cotizacion/general/niveles?panel=nuevo-nivel',
    a: () => '/configuracion/roles?panel=nuevo-nivel&bloque=cotizaciones',
  },
  'cotizacion/<origen>/formula': {
    de: () => `/configuracion/cotizacion/${a.id}/formula?version=2`,
    a: () => `/configuracion/origenes/${a.id}/planilla?version=2`,
  },
  'cotizacion/<origen>/hoja': {
    de: () => `/configuracion/cotizacion/${a.id}/hoja?vista=412`,
    a: () => `/configuracion/origenes/${a.id}/hoja?vista=412`,
  },
  'cotizacion/<origen>/tarjeta': {
    de: () => `/configuracion/cotizacion/${a.id}/tarjeta?panel=publicar-tarjeta`,
    a: () => `/configuracion/origenes/${a.id}/tarjeta?panel=publicar-tarjeta`,
  },
  'cotizacion/<origen>/tablas': {
    de: () => `/configuracion/cotizacion/${a.id}/tablas?tabla=${UNA_TABLA}`,
    // `next.config.ts` pone la consulta pedida antes que la del destino.
    a: () => `/configuracion/origenes/${a.id}/planilla?tabla=${UNA_TABLA}&panel=tablas`,
  },
  'cotizacion/<origen>': {
    de: () => `/configuracion/cotizacion/${a.id}?x=1`,
    a: () => `/configuracion/origenes/${a.id}/planilla?x=1`,
  },
  'logistica/navieras': {
    de: () => '/configuracion/logistica/navieras?panel=nueva-naviera',
    a: () => '/configuracion/catalogos/navieras?panel=nueva-naviera',
  },
  // /configuracion/cotizacion (route.ts).
  'cotizacion sin nada': {
    de: () => '/configuracion/cotizacion',
    a: () => '/configuracion/origenes',
  },
  'cotizacion ?seccion=niveles': {
    de: () => '/configuracion/cotizacion?seccion=niveles',
    a: () => '/configuracion/roles?bloque=cotizaciones',
  },
  'cotizacion ?seccion=tablas&origen&tabla': {
    de: () => `/configuracion/cotizacion?seccion=tablas&origen=${a.id}&tabla=${UNA_TABLA}`,
    a: () => `/configuracion/origenes/${a.id}/planilla?panel=tablas&tabla=${UNA_TABLA}`,
  },
  'cotizacion ?origen': {
    de: () => `/configuracion/cotizacion?origen=${a.id}`,
    a: () => `/configuracion/origenes/${a.id}/planilla`,
  },
  // /configuracion/flujos (route.ts, por persona).
  'flujos ?origen&fase&vista': {
    de: () => `/configuracion/flujos?origen=${a.id}&fase=${UNA_FASE}&vista=lista`,
    a: () => `/configuracion/origenes/${a.id}/fases?fase=${UNA_FASE}&vista=lista`,
  },
  'flujos ?ambito=repuestos': {
    de: () => '/configuracion/flujos?ambito=repuestos',
    a: () => '/configuracion/repuestos/flujo',
  },
  'flujos ?seccion=documentos, sin configurar un flujo': {
    de: () => '/configuracion/flujos?seccion=documentos',
    a: () => '/configuracion/catalogos/tipos-de-documento',
    quien: 'logistica',
  },
  'flujos sin nada': {
    de: () => '/configuracion/flujos',
    a: () => new RegExp(`^/configuracion/origenes/${ID}/fases$`),
  },
  // /configuracion/logistica (route.ts, por persona).
  'logistica ?seccion=navieras': {
    de: () => '/configuracion/logistica?seccion=navieras',
    a: () => '/configuracion/catalogos/navieras',
  },
  'logistica sin nada': {
    de: () => '/configuracion/logistica',
    a: () => '/configuracion/catalogos/puertos',
  },
  // /configuracion/catalogos (route.ts, por persona): no tiene página propia.
  'catalogos sin nada': {
    de: () => '/configuracion/catalogos',
    a: () => '/configuracion/catalogos/puertos',
  },
  // /configuracion/origenes/<id> (route.ts, por persona: sin pestaña recordada, la primera que abre).
  'origenes/<id> ?seccion=campos&campo': {
    de: () => `/configuracion/origenes/${a.id}?seccion=campos&campo=${UN_CAMPO}`,
    a: () => `/configuracion/origenes/${a.id}/campos?campo=${UN_CAMPO}`,
  },
  'origenes/<id> ?categoria': {
    de: () => `/configuracion/origenes/${a.id}?categoria=${UNA_CATEGORIA}`,
    a: () => `/configuracion/origenes/${a.id}/categorias?categoria=${UNA_CATEGORIA}`,
  },
  'origenes/<id> ?seccion=formula': {
    de: () => `/configuracion/origenes/${a.id}?seccion=formula`,
    a: () => `/configuracion/origenes/${a.id}/planilla`,
  },
  'origenes/<id> sin nada': {
    de: () => `/configuracion/origenes/${a.id}`,
    a: () => `/configuracion/origenes/${a.id}/fases`,
  },
  // Las pestañas de antes: Datos es un drawer sobre la de entrada; Flujo es Fases; Tablas, el drawer de la Planilla (el panel de la tabla, en `accion`).
  'origenes/<id>/datos': {
    de: () => `/configuracion/origenes/${a.id}/datos`,
    a: () => `/configuracion/origenes/${a.id}/fases?panel=datos`,
  },
  'origenes/<id>/flujo ?fase&vista': {
    de: () => `/configuracion/origenes/${a.id}/flujo?fase=${UNA_FASE}&vista=lista`,
    a: () => `/configuracion/origenes/${a.id}/fases?fase=${UNA_FASE}&vista=lista`,
  },
  'origenes/<id>/tablas ?tabla&panel': {
    de: () => `/configuracion/origenes/${a.id}/tablas?tabla=${UNA_TABLA}&panel=publicar-tabla`,
    a: () =>
      `/configuracion/origenes/${a.id}/planilla?panel=tablas&tabla=${UNA_TABLA}&accion=publicar-tabla`,
  },
  // La lista de fórmulas y las rutas cortas: la pestaña sin `?formula=` (la de trabajo), con su consulta.
  'origenes/<id>/formulas ?panel=nueva-formula': {
    de: () => `/configuracion/origenes/${f.id}/formulas?panel=nueva-formula`,
    a: () => `/configuracion/origenes/${f.id}/planilla?panel=nueva-formula`,
  },
  'origenes/<id>/formula/hoja ?vista': {
    de: () => `/configuracion/origenes/${f.id}/formula/hoja?vista=412`,
    a: () => `/configuracion/origenes/${f.id}/hoja?vista=412`,
  },
  'origenes/<id>/formula ?panel=editar-formula': {
    de: () => `/configuracion/origenes/${f.id}/formula?panel=editar-formula`,
    a: () => `/configuracion/origenes/${f.id}/planilla`,
  },
  // El editor de una fórmula de antes: su pestaña con ella elegida, sin el Modo avanzado y con el resto de la consulta.
  'origenes/<id>/formulas/<fórmula>/planilla ?panel=editar-formula': {
    de: () =>
      `/configuracion/origenes/${f.id}/formulas/${formulaDeF}/planilla?panel=editar-formula&fila=x`,
    a: () => `/configuracion/origenes/${f.id}/planilla?formula=${formulaDeF}&fila=x`,
  },
  // Sin parte, la Planilla; el panel de una fórmula nombra la suya en `cual`.
  'origenes/<id>/formulas/<fórmula> ?panel=renombrar-formula&formula': {
    de: () =>
      `/configuracion/origenes/${f.id}/formulas/${formulaDeF}?panel=renombrar-formula&formula=${formulaDeF}`,
    a: () =>
      `/configuracion/origenes/${f.id}/planilla?formula=${formulaDeF}&panel=renombrar-formula&cual=${formulaDeF}`,
  },
}

for (const [nombre, r] of Object.entries(REDIRECCIONES)) {
  test(`E2E 308: ${nombre}`, async ({ page }) => {
    olvidarLasPestanas(duena)
    await entrar(page, r.quien === 'logistica' ? logistica : duena)
    const respuesta = await page.request.get(r.de(), { maxRedirects: 0 })
    expect(respuesta.status()).toBe(308)
    // `Location` puede venir relativa (los `route.ts`) o entera: se compara su ruta y su consulta.
    const destino = new URL(respuesta.headers()['location'] ?? '', 'http://x')
    const esperado = r.a()
    const llega = `${destino.pathname}${destino.search}`
    if (typeof esperado === 'string') {
      expect(llega).toBe(esperado)
    } else {
      expect(llega).toMatch(esperado)
    }
  })
}
