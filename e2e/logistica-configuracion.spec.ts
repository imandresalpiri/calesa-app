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
import { filaDeCatalogo, masAccionesDe, menuDe, nombreDeLaFila } from './soporte/lista-de-catalogo'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// Logística › Configuración (T513, `docs/UX.md` › «Logística (config)»): el ⚙ «Configurar» de la cabecera de Logística (sólo con `logistica.catalogos.gestionar`, en todas
// sus páginas), la tira de pestañas (Puertos, Navieras, Categorías de gasto, Tipos de documento), cada catálogo con su alta y su edición (un toque en la fila, o el «⋯»),
// Tipos de documento sólo de lectura con `flujos.configurar`, la raíz que abre la primera pestaña, una prueba por cada redirección de las URLs viejas y el buscador de
// Configuración, que sigue llevando aquí. El detalle de cada catálogo (rechazos, oferta de transporte) lo prueba `configuracion-logistica.spec.ts`.
test.describe.configure({ mode: 'serial' })

const RAIZ = '/logistica/configuracion'
const ID = '11111111-1111-4111-8111-111111111111'
const PUERTO = 'Puerto e2e T513'
const NAVIERA = 'Naviera e2e T513'
const CATEGORIA = 'Categoría e2e T513'

let duena = ''
let sinPermiso = ''
let lectora = ''

const limpiar = () => {
  sql(`delete from categorias_gasto where nombre like ${literal('%e2e T513%')}`)
  sql(
    `delete from flujos_transporte_oferta where naviera_id in (select id from navieras where nombre like ${literal('%e2e T513%')})`,
  )
  sql(`delete from navieras where nombre like ${literal('%e2e T513%')}`)
  sql(`delete from puertos where nombre like ${literal('%e2e T513%')}`)
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  limpiar()
  duena = correoDePrueba(`duena-logistica-config-${proyecto}`)
  sinPermiso = correoDePrueba(`sin-permiso-logistica-config-${proyecto}`)
  lectora = correoDePrueba(`lectora-logistica-config-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Lola Configura' })
  for (const [email, nombre, clave, permisos] of [
    [sinPermiso, 'Sara Sin Permiso', 'sin', ['logistica.ver']],
    [lectora, 'Lupe Lectora', 'lectora', ['logistica.ver', 'flujos.configurar']],
  ] as const) {
    await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
    await darRolDePrueba({
      email,
      rol: {
        nombre: `${PREFIJO_ROL_E2E}Config logística ${clave} ${proyecto}`,
        clave: `e2e_config_logistica_${clave}_${proyecto}`,
      },
      permisos: [...permisos],
    })
  }
})

test.afterAll(async () => {
  limpiar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const configurar = (page: Page) => page.getByRole('link', { name: 'Configurar la logística' })

// La redirección (308) de una URL vieja: se pide sin seguirla y se mira a dónde manda.
async function redirige(page: Page, desde: string, hacia: string): Promise<void> {
  const respuesta = await page.request.get(desde, { maxRedirects: 0 })
  expect(respuesta.status(), `estado de ${desde}`).toBe(308)
  const destino = new URL(respuesta.headers()['location'] ?? '', 'http://x')
  expect(destino.pathname + destino.search).toBe(hacia)
}

test('E2E el ⚙ Configurar sale en toda página de Logística con el permiso y lleva a la configuración', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  for (const ruta of ['/logistica', '/logistica/embarques', '/logistica/gastos']) {
    await page.goto(ruta)
    await expect(configurar(page)).toBeVisible()
    await expect(configurar(page)).not.toHaveAttribute('aria-current', 'page')
    await capturar(page, info, `engranaje-${ruta.split('/').at(-1) ?? ''}`)
  }
  await configurar(page).click()
  await expect(page).toHaveURL(/\/logistica\/configuracion\/puertos$/)
  await expect(
    page.getByRole('heading', { name: 'Configuración de logística', level: 1 }),
  ).toBeVisible()
  // En la configuración el ⚙ es la página actual y ningún enlace de la barra lo es.
  await expect(configurar(page)).toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByRole('navigation', { name: 'Logística' }).locator('a[aria-current="page"]'),
  ).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Nuevo puerto' }).first()).toBeVisible()
  await capturar(page, info, 'configuracion-puertos')
})

test('E2E sin el permiso no hay ⚙ ni en la cadena ni en Embarques y la URL dice «No tienes permiso»', async ({
  page,
}, info) => {
  await entrar(page, sinPermiso, { fresco: true })
  for (const ruta of ['/logistica', '/logistica/embarques', '/logistica/gastos']) {
    await page.goto(ruta)
    await expect(configurar(page)).toHaveCount(0)
  }
  for (const clave of ['puertos', 'navieras', 'categorias-de-gasto', 'tipos-de-documento']) {
    await page.goto(`${RAIZ}/${clave}`)
    await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  }
  // Las pestañas apagadas dicen por qué.
  await expect(page.getByText('Pídelo a quien gestiona los catálogos de logística.')).toBeVisible()
  await capturar(page, info, 'sin-permiso')
})

for (const catalogo of [
  {
    clave: 'puertos',
    pestana: 'Puertos',
    nombre: PUERTO,
    nuevo: 'Nuevo puerto',
    crear: 'Crear puerto',
    editar: 'Editar puerto',
  },
  {
    clave: 'navieras',
    pestana: 'Navieras',
    nombre: NAVIERA,
    nuevo: 'Nueva naviera',
    crear: 'Crear naviera',
    editar: 'Editar naviera',
  },
  {
    clave: 'categorias-de-gasto',
    pestana: 'Categorías de gasto',
    nombre: CATEGORIA,
    nuevo: 'Nueva categoría',
    crear: 'Crear categoría',
    editar: 'Editar categoría',
  },
]) {
  test(`E2E ${catalogo.pestana}: se crea, un toque en la fila abre «Editar» y el «⋯» trae sus acciones`, async ({
    page,
  }, info) => {
    await entrar(page, duena, { fresco: true })
    await page.goto(`${RAIZ}/${catalogo.clave}`)
    await expect(page.getByRole('tab', { name: catalogo.pestana })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    const nuevo = page.getByRole('dialog', { name: catalogo.nuevo })
    await page.getByRole('button', { name: catalogo.nuevo }).first().click()
    await nuevo.getByLabel('Nombre').fill(catalogo.nombre)
    if (catalogo.clave === 'categorias-de-gasto') {
      await nuevo.getByLabel('Propósito').selectOption({ label: 'Otro' })
      await nuevo.getByLabel('Orden').fill('90')
    }
    await nuevo.getByRole('button', { name: catalogo.crear }).click()
    await expect(nuevo).toBeHidden()
    await expect(filaDeCatalogo(page, catalogo.nombre)).toBeVisible()

    // Sin «Editar» ni flechas de orden a la vista: la edición es el nombre y el «⋯».
    await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^(Subir|Bajar) / })).toHaveCount(0)
    await capturar(page, info, `lista-${catalogo.clave}`)
    await expect(nombreDeLaFila(page, catalogo.nombre)).toHaveAttribute(
      'aria-label',
      `Editar ${catalogo.nombre}`,
    )

    // Un toque en la fila abre la edición.
    await nombreDeLaFila(page, catalogo.nombre).click()
    const edicion = page.getByRole('dialog', { name: catalogo.editar })
    await expect(edicion).toBeVisible()
    await edicion.getByRole('button', { name: 'Cancelar' }).click()
    await expect(edicion).toBeHidden()

    // El «⋯»: «Editar» primero.
    await masAccionesDe(page, catalogo.nombre).click()
    await expect(menuDe(page, catalogo.nombre).getByRole('menuitem').first()).toHaveText('Editar')
    await capturar(page, info, `menu-${catalogo.clave}`)
    await page.keyboard.press('Escape')
  })
}

test('E2E Tipos de documento: con el permiso de logística se cambian', async ({ page }, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`${RAIZ}/tipos-de-documento`)
  await expect(page.getByRole('tab', { name: 'Tipos de documento' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('button', { name: 'Nuevo tipo' })).toBeEnabled()
  await expect(nombreDeLaFila(page, 'BL')).toBeVisible()
  await capturar(page, info, 'tipos-de-documento')
})

test('E2E con flujos.configurar sin el permiso de logística, Tipos de documento es de sólo lectura', async ({
  page,
}, info) => {
  await entrar(page, lectora, { fresco: true })
  // La raíz abre la primera pestaña que puede abrir: la única.
  await page.goto(RAIZ)
  await expect(page).toHaveURL(/\/logistica\/configuracion\/tipos-de-documento$/)
  await expect(page.getByRole('button', { name: 'Nuevo tipo' })).toBeDisabled()
  await expect(page.getByRole('tab', { name: 'Puertos' })).toBeDisabled()
  await expect(page.getByText('Pídelo a quien gestiona los catálogos de logística.')).toBeVisible()
  await capturar(page, info, 'tipos-de-documento-de-lectura')
  // Sin ⚙: no gestiona los catálogos.
  await expect(configurar(page)).toHaveCount(0)
  await page.goto(`${RAIZ}/puertos`)
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
})

test('E2E la raíz de la configuración abre la primera pestaña, con su consulta', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`${RAIZ}?panel=nuevo-puerto`)
  await expect(page).toHaveURL(/\/logistica\/configuracion\/puertos\?panel=nuevo-puerto$/)
  await expect(page.getByRole('dialog', { name: 'Nuevo puerto' })).toBeVisible()
  await redirige(page, RAIZ, `${RAIZ}/puertos`)
})

// Una prueba por redirección de las URLs viejas.
test.describe('E2E las URLs viejas siguen funcionando', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, duena, { fresco: true })
  })

  for (const clave of ['puertos', 'navieras', 'categorias-de-gasto', 'tipos-de-documento']) {
    test(`/configuracion/catalogos/${clave} con su consulta`, async ({ page }) => {
      await redirige(page, `/configuracion/catalogos/${clave}?x=1`, `${RAIZ}/${clave}?x=1`)
    })
  }

  test('con ?panel= y un id', async ({ page }) => {
    await redirige(
      page,
      `/configuracion/catalogos/tipos-de-documento?panel=editar-tipo&tipo=${ID}`,
      `${RAIZ}/tipos-de-documento?panel=editar-tipo&tipo=${ID}`,
    )
    await redirige(
      page,
      '/configuracion/catalogos/puertos?panel=nuevo-puerto',
      `${RAIZ}/puertos?panel=nuevo-puerto`,
    )
  })

  for (const clave of ['puertos', 'navieras', 'categorias-de-gasto']) {
    test(`/configuracion/logistica/${clave}`, async ({ page }) => {
      await redirige(page, `/configuracion/logistica/${clave}?panel=x`, `${RAIZ}/${clave}?panel=x`)
    })
  }

  test('/configuracion/logistica va a la pestaña pedida o a la primera', async ({ page }) => {
    await redirige(page, '/configuracion/logistica?seccion=navieras', `${RAIZ}/navieras`)
    await redirige(page, '/configuracion/logistica', `${RAIZ}/puertos`)
  })

  test('/configuracion/flujos?seccion=documentos con flujos.configurar sigue al flujo', async ({
    page,
  }) => {
    const respuesta = await page.request.get('/configuracion/flujos?seccion=documentos', {
      maxRedirects: 0,
    })
    expect(respuesta.status()).toBe(308)
    expect(respuesta.headers()['location']).toContain('/configuracion/origenes/')
  })
})

test('E2E /configuracion/flujos?seccion=documentos sin flujos.configurar va a Tipos de documento', async ({
  page,
}) => {
  await entrar(page, sinPermiso, { fresco: true })
  await redirige(page, '/configuracion/flujos?seccion=documentos', `${RAIZ}/tipos-de-documento`)
  // Sin ninguna pestaña que abrir, la URL vieja de logística va al inicio de Configuración (nunca a un error).
  await redirige(page, '/configuracion/logistica', '/configuracion/inicio')
})

test('E2E el buscador de Configuración encuentra «puertos» y «tipos de documento» y lleva a Logística', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/inicio')
  const buscador = page.getByRole('searchbox', { name: 'Buscar en Configuración' })
  const resultados = page.getByRole('list', { name: 'Resultados de la búsqueda' })
  for (const [texto, titulo, destino] of [
    ['puertos', 'Logística › Puertos', `${RAIZ}/puertos`],
    ['navieras', 'Logística › Navieras', `${RAIZ}/navieras`],
    ['gastos', 'Logística › Categorías de gasto', `${RAIZ}/categorias-de-gasto`],
    ['documentos', 'Logística › Tipos de documento', `${RAIZ}/tipos-de-documento`],
  ] as const) {
    await buscador.fill(texto)
    await expect(resultados.getByRole('link', { name: titulo })).toHaveAttribute('href', destino)
  }
  await buscador.fill('tipos de documento')
  await resultados.getByRole('link', { name: 'Logística › Tipos de documento' }).click()
  await expect(page).toHaveURL(/\/logistica\/configuracion\/tipos-de-documento$/)
})
