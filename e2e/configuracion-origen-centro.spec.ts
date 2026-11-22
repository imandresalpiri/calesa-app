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
import { enLaPestana } from './soporte/pestanas-del-origen'
import { formulaDeTrabajoDe } from './soporte/rutas-de-la-formula'

// El origen como centro: cada origen tiene su página (`/configuracion/origenes/<id>/<pestaña>`) con «Para cotizar y mover» y seis pestañas,
// cada una con su permiso en ese origen; lo de toda la empresa vive en Catálogos. Las URL de cuando Cotización, Flujos y Logística eran
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
const tira = (page: Page) => page.getByRole('region', { name: 'Para cotizar y mover' })
const paso = (page: Page, titulo: string) =>
  tira(page).getByRole('listitem').filter({ hasText: titulo })

test('E2E pestañas con permisos: quien sólo configura el cotizador de un origen', async ({
  page,
}) => {
  await entrar(page, cotizadora, { fresco: true })

  // La página sola abre la primera pestaña: Datos, que abre todo el que abre el origen.
  await page.goto(`/configuracion/origenes/${a.id}`)
  await expect(page).toHaveURL(`/configuracion/origenes/${a.id}/datos`)
  await expect(page.getByRole('heading', { name: a.nombre, level: 1 })).toBeVisible()
  await enLaPestana(page, 'Datos')

  // Datos, en sólo lectura y con su motivo.
  await expect(page.getByText('no tienes el permiso «Gestionar orígenes»')).toBeVisible()
  await expect(page.getByLabel('Nombre', { exact: true })).toBeDisabled()

  // Flujo, apagada con su motivo bajo las pestañas; en la tira, el paso sin enlace y con el motivo.
  await expect(page.getByRole('tab', { name: 'Flujo', exact: true }).first()).toBeDisabled()
  await expect(
    page.getByText('Flujo: Lo configura quien tiene el permiso «Configurar el flujo».'),
  ).toBeVisible()
  await expect(paso(page, 'Flujo').getByRole('link')).toHaveCount(0)
  await expect(paso(page, 'Flujo')).toContainText('«Configurar el flujo»')

  // Fórmulas sí abre.
  await page.getByRole('tab', { name: 'Fórmulas', exact: true }).click()
  await expect(page).toHaveURL(`/configuracion/origenes/${a.id}/formulas`)
  await enLaPestana(page, 'Fórmulas')

  // Flujo escrita a mano en la URL: dice por qué y ofrece la primera que abre.
  await page.goto(`/configuracion/origenes/${a.id}/flujo`)
  await expect(page.getByText('No puedes abrir esta pestaña')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ir a Datos' })).toHaveAttribute(
    'href',
    `/configuracion/origenes/${a.id}/datos`,
  )

  // El menú nombra el origen que abre (marcado en todas sus pestañas) y no el que no abre.
  await expect(menu(page).getByRole('link', { name: a.nombre, exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(menu(page).getByRole('link', { name: b.nombre, exact: true })).toHaveCount(0)

  // La lista tampoco lo muestra, y su página dice que no se abre.
  await page.goto('/configuracion/origenes')
  await expect(tarjetaDelOrigen(page, a.nombre)).toBeVisible()
  await expect(tarjetaDelOrigen(page, b.nombre)).toHaveCount(0)
  await expect(menu(page).getByRole('link', { name: b.nombre, exact: true })).toHaveCount(0)
  await page.goto(`/configuracion/origenes/${b.id}/datos`)
  await expect(page.getByText('No puedes abrir este origen')).toBeVisible()
})

test('E2E la tira: lo que falta enlaza a su pestaña, publicar la fórmula la pone lista y un inactivo sólo dice «Inactivo»', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${t.id}/datos`)
  await expect(tira(page).getByRole('listitem')).toHaveCount(5)

  // Sin fases ni fórmula: ✗ Flujo y ✗ Fórmula, cada uno a su pestaña (la fórmula, a la lista); la tarjeta, ⚠.
  await expect(paso(page, 'Flujo')).toContainText('Bloquea')
  await expect(paso(page, 'Flujo').getByRole('link')).toHaveAttribute(
    'href',
    `/configuracion/origenes/${t.id}/flujo`,
  )
  await expect(paso(page, 'Fórmula')).toContainText('Bloquea')
  await expect(paso(page, 'Fórmula').getByRole('link')).toHaveAttribute(
    'href',
    `/configuracion/origenes/${t.id}/formulas`,
  )
  await expect(paso(page, 'Tarjeta')).toContainText('Aviso')
  await expect(paso(page, 'Tarjeta').getByRole('link')).toHaveAttribute(
    'href',
    `/configuracion/origenes/${t.id}/formula/tarjeta`,
  )

  // Con la fórmula publicada, el paso queda ✓.
  publicarFormulaDePrueba(t.id)
  await page.reload()
  await expect(paso(page, 'Fórmula')).toContainText('Listo')
  await expect(paso(page, 'Flujo')).toContainText('Bloquea')

  // Inactivo: la tira sólo dice eso, sin pasos.
  await page.goto(`/configuracion/origenes/${c.id}/datos`)
  await expect(page.getByRole('heading', { name: c.nombre, level: 1 })).toBeVisible()
  await expect(tira(page)).toContainText('Inactivo')
  await expect(tira(page).getByRole('listitem')).toHaveCount(0)
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
    a: () => '/configuracion/origenes?panel=colores&x=1',
  },
  'cotizacion/general/niveles': {
    de: () => '/configuracion/cotizacion/general/niveles?panel=nuevo-nivel',
    a: () => '/configuracion/catalogos/niveles?panel=nuevo-nivel',
  },
  'cotizacion/<origen>/formula': {
    de: () => `/configuracion/cotizacion/${a.id}/formula?version=2`,
    a: () => `/configuracion/origenes/${a.id}/formula?version=2`,
  },
  'cotizacion/<origen>/hoja': {
    de: () => `/configuracion/cotizacion/${a.id}/hoja?vista=412`,
    a: () => `/configuracion/origenes/${a.id}/formula/hoja?vista=412`,
  },
  'cotizacion/<origen>/tarjeta': {
    de: () => `/configuracion/cotizacion/${a.id}/tarjeta?panel=publicar-tarjeta`,
    a: () => `/configuracion/origenes/${a.id}/formula/tarjeta?panel=publicar-tarjeta`,
  },
  'cotizacion/<origen>/tablas': {
    de: () => `/configuracion/cotizacion/${a.id}/tablas?tabla=${UNA_TABLA}`,
    a: () => `/configuracion/origenes/${a.id}/tablas?tabla=${UNA_TABLA}`,
  },
  'cotizacion/<origen>': {
    de: () => `/configuracion/cotizacion/${a.id}?x=1`,
    a: () => `/configuracion/origenes/${a.id}/formula?x=1`,
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
    a: () => '/configuracion/catalogos/niveles',
  },
  'cotizacion ?seccion=tablas&origen&tabla': {
    de: () => `/configuracion/cotizacion?seccion=tablas&origen=${a.id}&tabla=${UNA_TABLA}`,
    a: () => `/configuracion/origenes/${a.id}/tablas?tabla=${UNA_TABLA}`,
  },
  'cotizacion ?origen': {
    de: () => `/configuracion/cotizacion?origen=${a.id}`,
    a: () => `/configuracion/origenes/${a.id}/formula`,
  },
  // /configuracion/flujos (route.ts, por persona).
  'flujos ?origen&fase&vista': {
    de: () => `/configuracion/flujos?origen=${a.id}&fase=${UNA_FASE}&vista=lista`,
    a: () => `/configuracion/origenes/${a.id}/flujo?fase=${UNA_FASE}&vista=lista`,
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
    a: () => new RegExp(`^/configuracion/origenes/${ID}/flujo$`),
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
    a: () => '/configuracion/catalogos/niveles',
  },
  // /configuracion/origenes/<id> (route.ts).
  'origenes/<id> ?seccion=campos&campo': {
    de: () => `/configuracion/origenes/${a.id}?seccion=campos&campo=${UN_CAMPO}`,
    a: () => `/configuracion/origenes/${a.id}/campos?campo=${UN_CAMPO}`,
  },
  'origenes/<id> ?categoria': {
    de: () => `/configuracion/origenes/${a.id}?categoria=${UNA_CATEGORIA}`,
    a: () => `/configuracion/origenes/${a.id}/categorias?categoria=${UNA_CATEGORIA}`,
  },
  // La ruta corta de la fórmula (route.ts, por persona): la fórmula de trabajo, con su consulta; sin ninguna, la lista.
  'origenes/<id>/formula': {
    de: () => `/configuracion/origenes/${f.id}/formula`,
    a: () => `/configuracion/origenes/${f.id}/formulas/${formulaDeF}/planilla`,
  },
  'origenes/<id>/formula/hoja ?vista': {
    de: () => `/configuracion/origenes/${f.id}/formula/hoja?vista=412`,
    a: () => `/configuracion/origenes/${f.id}/formulas/${formulaDeF}/hoja?vista=412`,
  },
  'origenes/<id>/formula/tarjeta ?panel': {
    de: () => `/configuracion/origenes/${f.id}/formula/tarjeta?panel=publicar-tarjeta`,
    a: () =>
      `/configuracion/origenes/${f.id}/formulas/${formulaDeF}/tarjeta?panel=publicar-tarjeta`,
  },
  'origenes/<id>/formula ?panel=editar-formula': {
    de: () => `/configuracion/origenes/${f.id}/formula?panel=editar-formula`,
    a: () => `/configuracion/origenes/${f.id}/formulas/${formulaDeF}/planilla`,
  },
  // El Modo avanzado de la planilla ya no existe (proxy): a la misma planilla, sin el panel y con el resto de la consulta.
  'origenes/<id>/formulas/<fórmula>/planilla ?panel=editar-formula': {
    de: () =>
      `/configuracion/origenes/${f.id}/formulas/${formulaDeF}/planilla?panel=editar-formula&fila=x`,
    a: () => `/configuracion/origenes/${f.id}/formulas/${formulaDeF}/planilla?fila=x`,
  },
  'origenes/<id>/formula, sin fórmulas': {
    de: () => `/configuracion/origenes/${a.id}/formula?version=2`,
    a: () => `/configuracion/origenes/${a.id}/formulas`,
  },
  // Una fórmula sin parte (next.config.ts).
  'origenes/<id>/formulas/<fórmula>': {
    de: () => `/configuracion/origenes/${f.id}/formulas/${formulaDeF}?panel=renombrar-formula`,
    a: () =>
      `/configuracion/origenes/${f.id}/formulas/${formulaDeF}/planilla?panel=renombrar-formula`,
  },
  'origenes/<id> ?seccion=formula': {
    de: () => `/configuracion/origenes/${a.id}?seccion=formula`,
    a: () => `/configuracion/origenes/${a.id}/formulas`,
  },
  'origenes/<id> sin nada': {
    de: () => `/configuracion/origenes/${a.id}`,
    a: () => `/configuracion/origenes/${a.id}/datos`,
  },
}

for (const [nombre, r] of Object.entries(REDIRECCIONES)) {
  test(`E2E 308: ${nombre}`, async ({ page }) => {
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
