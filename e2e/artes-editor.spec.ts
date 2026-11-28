// @sin-celular-archivo: el editor de artes es una herramienta de escritorio y desde 1024 px de ancho no se dibuja en el celular
import { readFileSync } from 'node:fs'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { idDePersona } from './soporte/cotizaciones-sembradas'
import {
  abrirCapas,
  abrirElEditorDeArtes,
  borrarPlantillasDeArte,
  elegirEnCapas,
  escribirUnTexto,
  filaDeCapas,
  filasDeCapas,
  sembrarPlantillaDeArte,
  superficieDelLienzo,
} from './soporte/artes-editor'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { expect, test, type Locator, type Page, type TestInfo } from './soporte/prueba'

// El editor de artes (docs/UX.md › «Editor de artes») contra la app compilada y el Supabase local, sobre una plantilla Vertical sembrada:
// R y un arrastre dibujan un rectángulo, T y un clic crean un texto que se escribe en el lienzo; elegido en «Capas», → y Mayús+→ lo mueven
// 11 px; el ojo lo oculta, Ctrl+] y arrastrar la fila reordenan y Ctrl+Z deshace; Ctrl+S guarda (versión 2 del documento) y al recargar
// sigue igual; «Exportar PNG» baja 1080 × 1350 y «Duplicar en otro formato» a Historia deja el texto con su tamaño. Que la caja del lienzo no
// cambie lo mide `artes-editor-sin-saltos.spec.ts` (este no corre en el celular y la guarda no deja medir la disposición en él).
test.describe.configure({ mode: 'serial' })

const NOMBRE = 'E2E Arte del editor'
const TEXTO = 'E2E Hola'
// En «Capas», un texto sin nombre propio se ve con lo que dice.
const FILA = `Texto · ${TEXTO}`

let duena = ''
let plantilla = ''

test.beforeAll(async () => {
  borrarPlantillasDeArte(NOMBRE)
  await borrarPersonasDePrueba()
  duena = correoDePrueba('duena-arte-editor')
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Elena Editora' })
  plantilla = sembrarPlantillaDeArte({ nombre: NOMBRE, autorId: idDePersona(duena) })
})

test.afterAll(async () => {
  borrarPlantillasDeArte(NOMBRE)
  await borrarPersonasDePrueba()
})

const campo = (page: Page, etiqueta: string) => page.getByLabel(etiqueta, { exact: true })

// Lo que muestra un campo numérico del inspector («1.080», «12,5» o «-3»), como número.
async function numeroDe(lugar: Locator): Promise<number> {
  const texto = (await lugar.inputValue()).replace(/\s/g, '')
  return Number(texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto)
}

async function nombresDeLasFilas(page: Page): Promise<string[]> {
  return (await filasDeCapas(page).allInnerTexts()).map((t) => t.trim())
}

async function dibujarUnRectangulo(page: Page): Promise<void> {
  await page.keyboard.press('r')
  const herramientas = page.getByRole('group', { name: 'Herramientas', exact: true })
  await expect(
    herramientas.getByRole('button', { name: 'Rectángulo', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  const superficie = superficieDelLienzo(page)
  await superficie.dragTo(superficie, {
    sourcePosition: { x: 220, y: 180 },
    targetPosition: { x: 380, y: 280 },
    steps: 8,
  })
}

async function ocultarYReordenar(page: Page): Promise<void> {
  // El ojo es un interruptor: el mismo nombre, apretado mientras la capa está oculta.
  const ojo = page.getByRole('button', { name: `Ocultar «${FILA}»`, exact: true })
  await ojo.click()
  await expect(ojo).toHaveAttribute('aria-pressed', 'true')
  await elegirEnCapas(page, 'Rectángulo')
  await page.keyboard.press('Control+BracketRight')
  await expect.poll(() => nombresDeLasFilas(page)).toEqual(['Rectángulo', FILA])
  // Arrastrar la fila hasta la mitad de abajo de la otra (dnd-kit: pasados 4 px es un arrastre).
  await filaDeCapas(page, 'Rectángulo').dragTo(filaDeCapas(page, FILA), {
    targetPosition: { x: 60, y: 30 },
    steps: 12,
  })
  await expect.poll(() => nombresDeLasFilas(page)).toEqual([FILA, 'Rectángulo'])
  await page.keyboard.press('Control+z')
  await expect.poll(() => nombresDeLasFilas(page)).toEqual(['Rectángulo', FILA])
}

const versionDelDocumento = (id: string): string =>
  sql(`select documento->>'version' from public.artes_plantillas where id = ${literal(id)}::uuid`)

const tamanoDelTextoEnLaBase = (id: string): string =>
  sql(`select jsonb_path_query(documento, '$.paginas[0].capas[*] ? (@.tipo == "texto").tamano')
         from public.artes_plantillas where id = ${literal(id)}::uuid`)

function medidasDelPng(ruta: string): { ancho: number; alto: number } {
  const png = readFileSync(ruta)
  // La firma (8 bytes), el largo y el tipo del primer bloque (IHDR) y después el ancho y el alto.
  expect(png.subarray(12, 16).toString('latin1')).toBe('IHDR')
  return { ancho: png.readUInt32BE(16), alto: png.readUInt32BE(20) }
}

async function abrirElMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: `Más acciones de ${NOMBRE}`, exact: true }).click()
  await expect(page.getByRole('menu')).toBeVisible()
}

// Duplica y abre la copia desde el aviso: la URL cambia a la de la plantilla nueva y su lienzo queda listo. Devuelve su id.
async function duplicarEnHistoria(page: Page, info: TestInfo): Promise<string> {
  await abrirElMenu(page)
  await page.getByRole('menuitem', { name: 'Duplicar en otro formato', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Duplicar en otro formato', exact: true })
  await expect(modal).toBeVisible()
  // `Opciones`: el radio va escondido dentro de su etiqueta, que es lo que se toca.
  await modal.getByText('Historia', { exact: true }).click()
  await expect(modal.getByRole('radio', { name: 'Historia', exact: true })).toBeChecked()
  await capturar(page, info, 'otro-formato')
  await modal.getByRole('button', { name: 'Duplicar', exact: true }).click()
  await expect(modal).toBeHidden()
  // La copia no se abre sola: el aviso la ofrece con «Abrir».
  const aviso = page.getByRole('listitem').filter({ hasText: `en Historia.` })
  await aviso.getByRole('button', { name: 'Abrir', exact: true }).click()
  await expect(page).not.toHaveURL(new RegExp(plantilla))
  const copia = /\/artes\/([0-9a-f-]{36})/.exec(page.url())?.[1] ?? ''
  await abrirElEditorDeArtes(page, copia)
  return copia
}

test('E2E la dueña dibuja, ordena, deshace, guarda, exporta y duplica en otro formato', async ({
  page,
}, info) => {
  test.setTimeout(180_000)
  await entrar(page, duena)
  await abrirElEditorDeArtes(page, plantilla)
  await capturar(page, info, 'vacio')

  await test.step('R y un arrastre dibujan un rectángulo; T y un clic, un texto', async () => {
    await dibujarUnRectangulo(page)
    await escribirUnTexto(page, TEXTO, { x: 300, y: 460 })
    await abrirCapas(page)
    expect(await nombresDeLasFilas(page)).toEqual([FILA, 'Rectángulo'])
    await capturar(page, info, 'dos-capas')
  })

  let x = 0
  let tamano = 0
  await test.step('elegido en «Capas», → y Mayús+→ lo mueven 11 px', async () => {
    await elegirEnCapas(page, FILA)
    const antes = await numeroDe(campo(page, 'X'))
    tamano = await numeroDe(campo(page, 'Tamaño'))
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Shift+ArrowRight')
    await expect.poll(() => numeroDe(campo(page, 'X'))).toBe(antes + 11)
    x = antes + 11
  })

  await test.step('el ojo oculta; Ctrl+] y arrastrar la fila reordenan; Ctrl+Z deshace', () =>
    ocultarYReordenar(page))

  await test.step('Ctrl+S guarda y al recargar sigue igual, en la versión 2', async () => {
    const guardado = page.getByRole('status').filter({ hasText: /Guardad|Cambios sin guardar/ })
    await expect(guardado).toHaveText('Cambios sin guardar')
    await page.keyboard.press('Control+s')
    await expect(guardado).toHaveText('Guardado')
    expect(versionDelDocumento(plantilla)).toBe('2')
    await abrirElEditorDeArtes(page, plantilla)
    await abrirCapas(page)
    expect(await nombresDeLasFilas(page)).toEqual(['Rectángulo', FILA])
    await elegirEnCapas(page, FILA)
    await expect.poll(() => numeroDe(campo(page, 'X'))).toBe(x)
  })

  await test.step('«Exportar PNG» baja el arte a 1080 × 1350', async () => {
    await abrirElMenu(page)
    const descarga = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: 'Exportar PNG', exact: true }).click()
    const archivo = await (await descarga).path()
    expect(medidasDelPng(archivo)).toEqual({ ancho: 1080, alto: 1350 })
  })

  await test.step('«Duplicar en otro formato» a Historia: el texto conserva su tamaño', async () => {
    const copia = await duplicarEnHistoria(page, info)
    expect(tamanoDelTextoEnLaBase(copia)).toBe(String(tamano))
    await abrirCapas(page)
    await elegirEnCapas(page, FILA)
    await expect.poll(() => numeroDe(campo(page, 'Tamaño'))).toBe(tamano)
  })
})
