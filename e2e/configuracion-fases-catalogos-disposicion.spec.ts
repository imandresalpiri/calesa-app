import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import {
  botonesDeLosCatalogos,
  drawerDe,
  origenPorClave,
  urlDelCatalogo,
} from './soporte/catalogos-en-fases'
import { esMovil } from './soporte/inventario'
import {
  aLaVistaSinDesplazar,
  sinScrollHorizontal,
  tactil,
  textoGrandeAlCargar,
} from './soporte/recorrido'

// Cómo se acomodan los catálogos de logística de la pestaña Fases (T570): en escritorio los cuatro botones van en una fila arriba del diagrama y al 200 %
// se parten sin desbordar; el drawer no cambia de tamaño al cargar ni al abrir y cerrar su modal; en el celular (390 px) va a todo lo ancho y sus botones
// miden 44 px.
let duena = ''
const a = () => origenPorClave('subasta_usa')

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-catalogos-disposicion-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Cira Catálogos' })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
})

test('E2E los cuatro catálogos van arriba del diagrama, en una fila en escritorio, y al 200 % se parten sin desbordar', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${a().id}/fases`)
  const botones = botonesDeLosCatalogos(page)
  await expect(botones).toHaveText([
    'Puertos',
    'Navieras',
    'Categorías de gasto',
    'Tipos de documento',
  ])
  for (const boton of await botones.all()) {
    await tactil(page, boton)
  }
  if (!esMovil(page)) {
    const filas = await Promise.all(
      (await botones.all()).map(async (b) => Math.round((await b.boundingBox())?.y ?? -1)),
    )
    expect(new Set(filas).size, 'los cuatro en una fila').toBe(1)
  }

  await textoGrandeAlCargar(page)
  await page.goto(`/configuracion/origenes/${a().id}/fases`)
  await expect(botones.last()).toBeVisible()
  await sinScrollHorizontal(page)
  await aLaVistaSinDesplazar(botones.last(), 'el último catálogo')
})

test('E2E el drawer de un catálogo no cambia de tamaño al cargar ni con su modal, y en el celular va a lo ancho con 44 px', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(urlDelCatalogo(a().id, 'puertos'))
  const drawer = drawerDe(page, 'Puertos')
  await expect(drawer).toBeVisible()
  const alAbrir = await drawer.boundingBox()
  await expect(drawer.getByRole('heading', { name: 'Compartidos', level: 3 })).toBeVisible()
  expect(await drawer.boundingBox()).toEqual(alAbrir)

  const nuevo = drawer.getByRole('button', { name: 'Nuevo puerto' })
  await tactil(page, nuevo)
  await nuevo.click()
  const modal = page.getByRole('dialog', { name: 'Nuevo puerto' })
  await expect(modal).toBeVisible()
  await modal.getByRole('button', { name: 'Cancelar' }).click()
  await expect(modal).toBeHidden()
  expect(await drawer.boundingBox()).toEqual(alAbrir)

  if (esMovil(page)) {
    expect(Math.round(alAbrir?.width ?? 0)).toBe(page.viewportSize()?.width ?? 0)
  }
})
