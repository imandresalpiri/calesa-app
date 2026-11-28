import { CONTRASENA, entrar } from './soporte/alta'
import { textosDelLienzo } from './soporte/artes-con-datos'
import {
  abrirElEditorDeArtes,
  BASE_DE_CAPA,
  borrarPlantillasDeArte,
  lienzoDelEditor,
  sembrarPlantillaDeArte,
} from './soporte/artes-editor'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { idDePersona } from './soporte/cotizaciones-sembradas'
import { expect, test, type Locator, type Page } from './soporte/prueba'
import { literal, sql } from './soporte/sql'

// Las plantillas de arte en PDF (docs/UX.md › «Editor de artes»): en un A4 la tira de páginas, abajo del panel izquierdo, agrega, duplica,
// reordena con el teclado y quita páginas sin cambiar el tamaño del lienzo ni del panel, y guardar deja el orden. Mide la disposición: con el
// ancho fijo de escritorio corre en los dos proyectos, como `artes-editor-sin-saltos.spec.ts`.
test.use({ viewport: { width: 1280, height: 800 } })

const UNO = 'E2E Página uno'
const DOS = 'E2E Página dos'

let duena = ''
let plantilla = ''
let nombre = ''

// Un texto de una línea arriba de una página A4 (595 × 842 pt).
const textoArriba = (id: string, texto: string) => ({
  ...BASE_DE_CAPA,
  id,
  tipo: 'texto',
  x: 40,
  y: 60,
  ancho: 515,
  alto: 30,
  texto,
  fuente: 'geist',
  tamano: 24,
  peso: 600,
  interlineado: 1.2,
  color: '#111111',
  alineacion: 'izquierda',
  borde: null,
  grosor: 0,
})

test.beforeAll(async ({}, info) => {
  nombre = `E2E Arte en PDF ${info.project.name}`
  borrarPlantillasDeArte(nombre)
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-arte-pdf-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Paula Paginas' })
  plantilla = sembrarPlantillaDeArte({
    nombre,
    autorId: idDePersona(duena),
    formato: 'a4',
    paginas: [[textoArriba('texto-1', UNO)], [textoArriba('texto-2', DOS)]],
  })
})

test.afterAll(async () => {
  borrarPlantillasDeArte(nombre)
  await borrarPersonasDePrueba()
})

async function cajaDe(lugar: Locator) {
  const caja = await lugar.boundingBox()
  if (!caja) throw new Error('sin caja')
  return caja
}

const tira = (page: Page) => page.getByRole('list', { name: 'Páginas', exact: true })
const pagina = (page: Page, n: number) =>
  tira(page).getByRole('button', { name: `Página ${String(n)}`, exact: true })

async function enLaPagina(page: Page, n: number, textos: string[]) {
  await expect(pagina(page, n)).toHaveAttribute('aria-current', 'page')
  await expect.poll(() => textosDelLienzo(page)).toEqual(textos)
}

async function delMenuDe(page: Page, n: number, accion: string) {
  await page
    .getByRole('button', { name: `Más acciones de Página ${String(n)}`, exact: true })
    .click()
  await page.getByRole('menuitem', { name: accion, exact: true }).click()
}

// El texto de la primera capa de cada página guardada, en su orden (vacío: una página en blanco).
const paginasGuardadas = () =>
  sql(`
    select string_agg(coalesce(p -> 'capas' -> 0 ->> 'texto', ''), '|' order by o)
      from public.artes_plantillas, jsonb_array_elements(documento -> 'paginas') with ordinality as e(p, o)
      where id = ${literal(plantilla)}::uuid`)

test('E2E la tira de páginas agrega, duplica, reordena y quita sin mover el lienzo', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirElEditorDeArtes(page, plantilla)
  await expect(tira(page).getByRole('listitem')).toHaveCount(2)
  await enLaPagina(page, 1, [UNO])
  const panel = page.getByRole('complementary', { name: 'Agregar, capas y páginas', exact: true })
  const antes = { lienzo: await cajaDe(lienzoDelEditor(page)), panel: await cajaDe(panel) }
  const mismasCajas = async () => {
    expect(await cajaDe(lienzoDelEditor(page))).toEqual(antes.lienzo)
    expect(await cajaDe(panel)).toEqual(antes.panel)
  }

  await test.step('elegir la 2 la lleva al lienzo', async () => {
    await pagina(page, 2).click()
    await enLaPagina(page, 2, [DOS])
  })

  await test.step('«Agregar página» suma una en blanco después de la elegida', async () => {
    await page.getByRole('button', { name: 'Agregar página', exact: true }).click()
    await expect(tira(page).getByRole('listitem')).toHaveCount(3)
    await enLaPagina(page, 3, [])
    await mismasCajas()
  })

  await test.step('«Duplicar» copia la 2 justo después', async () => {
    await delMenuDe(page, 2, 'Duplicar')
    await expect(tira(page).getByRole('listitem')).toHaveCount(4)
    await enLaPagina(page, 3, [DOS])
  })

  await test.step('con el teclado, la 1 pasa al segundo lugar', async () => {
    // Cada tecla tras el efecto de la anterior: con la máquina cargada, una flecha antes de que dnd-kit tome la página no la mueve. Tomada, la
    // página queda `aria-pressed` (su «Tomaste…» lo pisa al instante «… está sobre …» de ella misma); después, el último anuncio de cada tecla.
    const anuncio = (texto: string) => expect(page.getByText(texto, { exact: true })).toBeAttached()
    await pagina(page, 1).focus()
    await page.keyboard.press('Space')
    await expect(pagina(page, 1)).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('ArrowRight')
    await anuncio('«Página 1» está sobre «Página 2».')
    await page.keyboard.press('Space')
    await anuncio('Soltaste «Página 1» en el lugar de «Página 2».')
    await pagina(page, 2).click()
    await enLaPagina(page, 2, [UNO])
    await pagina(page, 1).click()
    await enLaPagina(page, 1, [DOS])
  })

  await test.step('«Quitar» saca la última; AvPág va a la siguiente', async () => {
    await delMenuDe(page, 4, 'Quitar')
    await expect(tira(page).getByRole('listitem')).toHaveCount(3)
    await lienzoDelEditor(page)
      .locator('.konvajs-content')
      .click({ position: { x: 20, y: 20 } })
    await page.keyboard.press('PageDown')
    await enLaPagina(page, 2, [UNO])
    await mismasCajas()
  })

  await test.step('Ctrl+S guarda las páginas en su orden', async () => {
    const guardado = page.getByRole('status').filter({ hasText: /Guardad|Cambios sin guardar/ })
    await page.keyboard.press('Control+s')
    await expect(guardado).toHaveText('Guardado')
    expect(paginasGuardadas()).toBe([DOS, UNO, DOS].join('|'))
  })
})
