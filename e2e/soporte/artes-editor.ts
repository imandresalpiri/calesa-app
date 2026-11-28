import { expect, type Page } from './prueba'
import { literal, sql } from './sql'

// Las plantillas de arte que siembran los e2e del editor de artes (`artes-editor*.spec.ts`, `presupuesto-js.spec.ts`): se insertan por SQL
// como `supabase/tests/areas/artes/carreras.mjs`, en la subasta de la semilla, con el documento vacío de la versión 1 (el editor lo lee como
// el de hoy y lo guarda así) o, con `capas`, uno de la versión 3 con ellas (`artes-editor-con-datos.spec.ts`); con `paginas`, una página por
// lista (Carta y A4, `artes-pdf.spec.ts`). Todas llevan `E2E` en el nombre; `borrarPlantillasDeArte()` quita las de un prefijo y sus copias.
export type PlantillaSembrada = {
  nombre: string
  autorId: string
  formato?: 'cuadrado' | 'vertical' | 'historia' | 'carta' | 'a4'
  visibilidad?: 'privada' | 'empresa'
  // Con capas, el documento va en la versión de hoy (3) con ellas en su única página; sin ellas, el vacío de la versión 1.
  capas?: readonly Record<string, unknown>[]
  // Varias páginas (`pagina-1`, `pagina-2`…), cada una con sus capas: también en la versión 3.
  paginas?: readonly (readonly Record<string, unknown>[])[]
}

const MEDIDAS = {
  cuadrado: [1080, 1080],
  vertical: [1080, 1350],
  historia: [1080, 1920],
  carta: [612, 792],
  a4: [595, 842],
} as const

// El vacío de la versión 1 (una página con su id y su fondo blanco): el editor lo lleva a la 2 al leerlo.
const DOCUMENTO_V1 = JSON.stringify({
  version: 1,
  paginas: [{ id: 'pagina-1', fondo: { tipo: 'color', color: '#ffffff' }, capas: [] }],
})

export const subastaDeLaSemilla = (): string =>
  sql("select id from public.origenes where clave = 'subasta_usa'")

// Lo común de toda capa sembrada: visible, sin bloquear, sin grupo ni sombra.
export const BASE_DE_CAPA = {
  nombre: null,
  grupoId: null,
  rotacion: 0,
  opacidad: 1,
  bloqueada: false,
  oculta: false,
  sombra: null,
} as const

const documentoCon = (paginas: readonly (readonly Record<string, unknown>[])[]) =>
  JSON.stringify({
    version: 3,
    paginas: paginas.map((capas, i) => ({
      id: `pagina-${String(i + 1)}`,
      fondo: { tipo: 'color', color: '#ffffff' },
      capas,
      grupos: [],
    })),
  })

export function sembrarPlantillaDeArte({
  nombre,
  autorId,
  formato = 'vertical',
  visibilidad = 'privada',
  capas,
  paginas,
}: PlantillaSembrada): string {
  const [ancho, alto] = MEDIDAS[formato]
  const conPaginas = paginas ?? (capas === undefined ? undefined : [capas])
  const documento = conPaginas === undefined ? DOCUMENTO_V1 : documentoCon(conPaginas)
  sql(`delete from public.artes_plantillas where nombre = ${literal(nombre)}`)
  return sql(`
    insert into public.artes_plantillas (id, nombre, formato, ancho, alto, origen_id, visibilidad, autor_id, documento)
      values (gen_random_uuid(), ${literal(nombre)}, ${literal(formato)}, ${String(ancho)}, ${String(alto)},
        ${literal(subastaDeLaSemilla())}::uuid, ${literal(visibilidad)}, ${literal(autorId)}::uuid,
        ${literal(documento)}::jsonb)
      returning id`)
}

// Las del prefijo y las que se crearon a partir de ellas («Copia de …», «… · Historia»).
export function borrarPlantillasDeArte(prefijo: string): void {
  sql(`delete from public.artes_plantillas where nombre like ${literal(`%${prefijo}%`)}`)
}

// --- El editor ---------------------------------------------------------------------------------------
// Lo que recorren `artes-editor.spec.ts` y `artes-editor-sin-saltos.spec.ts`. Lo que se dibuja se apunta con posiciones dentro del `Stage`
// (`.konvajs-content`, donde Konva escucha el puntero), sin medir cajas: el primero no corre en el celular.
export const lienzoDelEditor = (page: Page) =>
  page.getByRole('region', { name: 'Lienzo', exact: true })
export const superficieDelLienzo = (page: Page) => lienzoDelEditor(page).locator('.konvajs-content')
export const filasDeCapas = (page: Page) =>
  page.getByRole('grid', { name: 'Capas', exact: true }).getByRole('row')
export const filaDeCapas = (page: Page, nombre: string) =>
  filasDeCapas(page).filter({ has: page.getByRole('button', { name: nombre, exact: true }) })

// Listo: la píldora del zoom dice su porcentaje (el lienzo midió su lugar y ajustó la cámara); el primero, antes del botón «100 %».
export async function abrirElEditorDeArtes(page: Page, id: string): Promise<void> {
  await page.goto(`/artes/${id}`)
  await expect(
    lienzoDelEditor(page)
      .getByText(/^\d+ %$/)
      .first(),
  ).toBeVisible()
  await expect(
    lienzoDelEditor(page).getByRole('button', { name: 'Ajustar', exact: true }),
  ).toBeVisible()
  await expect(superficieDelLienzo(page)).toBeVisible()
}

export async function abrirCapas(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Capas', exact: true }).click()
  await expect(page.getByRole('grid', { name: 'Capas', exact: true })).toBeVisible()
}

export async function elegirEnCapas(page: Page, nombre: string): Promise<void> {
  await filaDeCapas(page, nombre).getByRole('button', { name: nombre, exact: true }).click()
  await expect(filaDeCapas(page, nombre)).toHaveAttribute('aria-selected', 'true')
}

// T y un clic crean un texto que se escribe en su lugar; `antesDeTerminar` corre con el campo abierto (lo que se mide mientras se escribe).
export async function escribirUnTexto(
  page: Page,
  texto: string,
  donde: { x: number; y: number },
  antesDeTerminar: () => Promise<void> = async () => {},
): Promise<void> {
  await page.keyboard.press('t')
  await superficieDelLienzo(page).click({ position: donde })
  const campo = lienzoDelEditor(page).getByRole('textbox', { name: 'Texto', exact: true })
  await expect(campo).toBeFocused()
  await page.keyboard.type(texto)
  await antesDeTerminar()
  await page.keyboard.press('Escape')
  await expect(campo).toBeHidden()
}
