// @sin-celular-archivo: son respuestas del servidor (308) y un buscador; el celular lo revisa la IA con capturas
import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'

// Configuración ya no tiene Catálogos (`docs/DECISIONES.md` › «Cada catálogo vive en el área que lo usa; Configuración no tiene Catálogos»): toda URL vieja de Catálogos, y las que llegaban a Catálogos, llega a su lugar
// nuevo en un solo salto (308) con su consulta; la raíz lleva a cada persona al primer lugar que abre; y el buscador de Configuración encuentra cada catálogo donde vive ahora.
test.describe.configure({ mode: 'serial' })

const ID = '11111111-1111-4111-8111-111111111111'
const OTRO = '22222222-2222-4222-8222-222222222222'
const LOGISTICA = '/logistica/configuracion'

let duena = ''
let soloLogistica = ''
let sinNada = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-catalogos-${proyecto}`)
  soloLogistica = correoDePrueba(`logistica-catalogos-${proyecto}`)
  sinNada = correoDePrueba(`sin-nada-catalogos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Catálogos' })
  for (const [email, nombre, clave, permisos] of [
    [
      soloLogistica,
      'Lía Logística',
      'logistica',
      ['logistica.ver', 'logistica.catalogos.gestionar'],
    ],
    [sinNada, 'Nora Nada', 'nada', ['logistica.ver']],
  ] as const) {
    await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
    await darRolDePrueba({
      email,
      rol: {
        nombre: `${PREFIJO_ROL_E2E}Catálogos ${clave} ${proyecto}`,
        clave: `e2e_catalogos_${clave}_${proyecto}`,
      },
      permisos: [...permisos],
    })
  }
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// La respuesta de una URL vieja, sin seguirla: 308 y a dónde manda (ruta y consulta).
async function redirige(page: Page, desde: string, hacia: string | RegExp): Promise<void> {
  const respuesta = await page.request.get(desde, { maxRedirects: 0 })
  expect(respuesta.status(), `estado de ${desde}`).toBe(308)
  const destino = new URL(respuesta.headers()['location'] ?? '', 'http://x')
  const llegada = destino.pathname + destino.search
  if (typeof hacia === 'string') expect(llegada, desde).toBe(hacia)
  else expect(llegada, desde).toMatch(hacia)
}

test.describe('E2E la raíz /configuracion/catalogos va al primer lugar que la persona abre', () => {
  test('con cotizaciones.configurar, a Colores en Orígenes y con su consulta', async ({ page }) => {
    await entrar(page, duena, { fresco: true })
    await redirige(page, '/configuracion/catalogos', '/configuracion/origenes?panel=colores')
    await redirige(
      page,
      '/configuracion/catalogos?x=1',
      '/configuracion/origenes?panel=colores&x=1',
    )
    const respuesta = await page.request.get('/configuracion/catalogos', { maxRedirects: 0 })
    expect(respuesta.headers()['cache-control']).toBe('private, no-store')
  })

  test('sólo con logistica.catalogos.gestionar, a Puertos', async ({ page }) => {
    await entrar(page, soloLogistica, { fresco: true })
    await redirige(page, '/configuracion/catalogos', `${LOGISTICA}/puertos`)
  })

  test('sin nada que abrir, al inicio de Configuración', async ({ page }) => {
    await entrar(page, sinNada, { fresco: true })
    await redirige(page, '/configuracion/catalogos', '/configuracion/inicio')
  })
})

// Una prueba por URL vieja.
const VIEJAS: Record<string, [desde: string, hacia: string | RegExp]> = {
  'catalogos/colores': [
    '/configuracion/catalogos/colores',
    '/configuracion/origenes?panel=colores',
  ],
  'catalogos/colores con el panel de un color': [
    `/configuracion/catalogos/colores?panel=editar-tono&tono=${ID}`,
    `/configuracion/origenes?panel=editar-tono&tono=${ID}`,
  ],
  'catalogos/vigencia': [
    '/configuracion/catalogos/vigencia?x=1',
    '/configuracion/origenes?panel=vigencia&x=1',
  ],
  'catalogos/niveles': [
    '/configuracion/catalogos/niveles',
    '/configuracion/roles?bloque=cotizaciones',
  ],
  'catalogos/niveles ?panel=nuevo-nivel': [
    '/configuracion/catalogos/niveles?panel=nuevo-nivel',
    '/configuracion/roles?bloque=cotizaciones&panel=nuevo-nivel',
  ],
  'catalogos/niveles ?panel=renombrar-nivel&nivel': [
    `/configuracion/catalogos/niveles?panel=renombrar-nivel&nivel=${ID}`,
    `/configuracion/roles?bloque=cotizaciones&panel=renombrar-nivel&nivel=${ID}`,
  ],
  'catalogos/niveles ?panel=eliminar-nivel&nivel': [
    `/configuracion/catalogos/niveles?panel=eliminar-nivel&nivel=${ID}`,
    `/configuracion/roles?bloque=cotizaciones&panel=eliminar-nivel&nivel=${ID}`,
  ],
  'catalogos/quien-crea-y-quien-ve ?origen': [
    `/configuracion/catalogos/quien-crea-y-quien-ve?origen=${ID}`,
    `/configuracion/roles?bloque=cotizaciones&origen=${ID}`,
  ],
  'catalogos/puertos': [
    '/configuracion/catalogos/puertos?panel=nuevo-puerto',
    `${LOGISTICA}/puertos?panel=nuevo-puerto`,
  ],
  'catalogos/puertos ?panel=editar-puerto&puerto': [
    `/configuracion/catalogos/puertos?panel=editar-puerto&puerto=${ID}`,
    `${LOGISTICA}/puertos?panel=editar-puerto&puerto=${ID}`,
  ],
  'catalogos/navieras ?naviera': [
    `/configuracion/catalogos/navieras?panel=editar-naviera&naviera=${ID}`,
    `${LOGISTICA}/navieras?panel=editar-naviera&naviera=${ID}`,
  ],
  'catalogos/categorias-de-gasto ?categoria': [
    `/configuracion/catalogos/categorias-de-gasto?panel=editar-categoria&categoria=${ID}`,
    `${LOGISTICA}/categorias-de-gasto?panel=editar-categoria&categoria=${ID}`,
  ],
  'catalogos/tipos-de-documento ?tipo': [
    `/configuracion/catalogos/tipos-de-documento?panel=editar-tipo&tipo=${ID}`,
    `${LOGISTICA}/tipos-de-documento?panel=editar-tipo&tipo=${ID}`,
  ],
  'catalogos/tablas': [
    '/configuracion/catalogos/tablas',
    /^\/configuracion\/origenes\/[0-9a-f-]{36}\/planilla\?(.*&)?panel=tablas(&|$)/,
  ],
  'catalogos/tablas ?tabla que no existe': [
    `/configuracion/catalogos/tablas?tabla=${OTRO}`,
    /^\/configuracion\/origenes\/[0-9a-f-]{36}\/planilla\?(.*&)?panel=tablas(&|$)/,
  ],
  'cotizacion/general': [
    '/configuracion/cotizacion/general?x=1',
    '/configuracion/origenes?x=1&panel=colores',
  ],
  'cotizacion/general/colores': [
    '/configuracion/cotizacion/general/colores',
    '/configuracion/origenes?panel=colores',
  ],
  'cotizacion/general/niveles': [
    '/configuracion/cotizacion/general/niveles?panel=nuevo-nivel',
    '/configuracion/roles?panel=nuevo-nivel&bloque=cotizaciones',
  ],
  'cotizacion/general/vigencia': [
    '/configuracion/cotizacion/general/vigencia',
    '/configuracion/origenes?panel=vigencia',
  ],
  'cotizacion ?seccion=niveles': [
    '/configuracion/cotizacion?seccion=niveles',
    '/configuracion/roles?bloque=cotizaciones',
  ],
  'cotizacion ?seccion=colores': [
    '/configuracion/cotizacion?seccion=colores',
    '/configuracion/origenes?panel=colores',
  ],
  'cotizacion ?seccion=tonos': [
    '/configuracion/cotizacion?seccion=tonos',
    '/configuracion/origenes?panel=colores',
  ],
  'cotizacion ?seccion=vigencia': [
    '/configuracion/cotizacion?seccion=vigencia',
    '/configuracion/origenes?panel=vigencia',
  ],
  'cotizacion ?seccion=ajustes': [
    '/configuracion/cotizacion?seccion=ajustes',
    '/configuracion/origenes?panel=vigencia',
  ],
  'logistica ?seccion=navieras': [
    '/configuracion/logistica?seccion=navieras',
    `${LOGISTICA}/navieras`,
  ],
  'logistica sin nada': ['/configuracion/logistica', `${LOGISTICA}/puertos`],
  'logistica/puertos': ['/configuracion/logistica/puertos?panel=x', `${LOGISTICA}/puertos?panel=x`],
  'logistica/navieras': ['/configuracion/logistica/navieras', `${LOGISTICA}/navieras`],
  'logistica/categorias-de-gasto': [
    '/configuracion/logistica/categorias-de-gasto',
    `${LOGISTICA}/categorias-de-gasto`,
  ],
}

test.describe('E2E cada URL vieja llega a su lugar nuevo en un solo salto', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, duena, { fresco: true })
  })

  for (const [nombre, [desde, hacia]] of Object.entries(VIEJAS)) {
    test(nombre, async ({ page }) => {
      await redirige(page, desde, hacia)
    })
  }
})

test('E2E /configuracion/flujos?seccion=documentos sin flujos.configurar va a Tipos de documento', async ({
  page,
}) => {
  await entrar(page, soloLogistica, { fresco: true })
  await redirige(
    page,
    '/configuracion/flujos?seccion=documentos',
    `${LOGISTICA}/tipos-de-documento`,
  )
})

// El buscador de Configuración: cada catálogo se encuentra con su camino y lleva a donde vive.
test('E2E el buscador encuentra cada catálogo donde vive ahora', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/inicio')
  const buscador = page.getByRole('searchbox', { name: 'Buscar en Configuración' })
  const resultados = page.getByRole('list', { name: 'Resultados de la búsqueda' })
  const casos: [texto: string, camino: string, href: string | RegExp][] = [
    ['colores', 'Orígenes › Colores', '/configuracion/origenes?panel=colores'],
    ['vigencia', 'Orígenes › Vigencia', '/configuracion/origenes?panel=vigencia'],
    [
      'niveles de acceso',
      'Roles y permisos › Niveles de acceso',
      '/configuracion/roles?bloque=cotizaciones',
    ],
    [
      'quién crea',
      'Roles y permisos › Quién crea y quién ve',
      '/configuracion/roles?bloque=cotizaciones',
    ],
    ['puertos', 'Logística › Puertos', `${LOGISTICA}/puertos`],
    ['navieras', 'Logística › Navieras', `${LOGISTICA}/navieras`],
    ['categorías de gasto', 'Logística › Categorías de gasto', `${LOGISTICA}/categorias-de-gasto`],
    ['tipos de documento', 'Logística › Tipos de documento', `${LOGISTICA}/tipos-de-documento`],
    ['flujo de repuestos', 'Repuestos › Flujo de repuestos', '/repuestos/configuracion/flujo'],
    [
      'cotizador de repuestos',
      'Repuestos › Cotizador de repuestos',
      '/repuestos/configuracion/cotizador',
    ],
    [
      'catálogos de repuestos',
      'Repuestos › Catálogos de repuestos',
      '/repuestos/configuracion/catalogos',
    ],
    [
      'tablas compartidas',
      'Orígenes › Tablas compartidas',
      /^\/configuracion\/(catalogos\/tablas|origenes\/[0-9a-f-]{36}\/planilla\?.*panel=tablas)/,
    ],
  ]
  for (const [texto, camino, href] of casos) {
    await buscador.fill(texto)
    const enlace = resultados.getByRole('link', { name: camino })
    await expect(enlace, camino).toHaveAttribute('href', href)
  }
  await buscador.fill('catálogos')
  await expect(resultados.getByRole('link', { name: /^Catálogos$/ })).toHaveCount(0)
})
