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
} from './soporte/base'
import {
  abrirElCampo,
  abrirElMenu,
  casillasEnOrden,
  elegirDelMenu,
  filaDelCampo,
  lineaApagada,
} from './soporte/editor-de-campos'
import { descartarAviso } from './soporte/inventario'
import { borrarCamposDeLeadDePrueba, camposDeLead, grupoDeCamposDeLead } from './soporte/leads'
import {
  PREFIJO_CLAVE_E2E,
  borrarOrigenes,
  camposDelOrigen,
  campoDelOrigen,
  crearOrigenDePrueba,
} from './soporte/origenes'
import { expect, test, type Locator, type Page } from './soporte/prueba'

// @sin-celular-archivo: Configuración no se prueba en celular; pruebas sólo en lo clave (la persona, 2026-11-08)

// El editor de campos, el mismo en un origen y en los leads: buscar sin tildes, crear desde «Nuevo campo» y editar tocando la fila
// (el panel `?campo=`), ordenar arrastrando el asa con el mouse y con el teclado, y los datos clave en sus casillas (el «⋯» y soltar
// un campo en la casilla libre). Quien sólo configura el flujo del origen lo ve sin poder cambiarlo. El permiso, la versión y el
// tope de los datos clave los prueba `supabase/tests/areas/origenes/datos-clave.sql`; lo que decide cada soltada, `soltar.test.ts`.
test.describe.configure({ mode: 'serial' })

const CREADO = 'Kilos e2e'
const TOPE = 'Ya hay 4 datos clave: quita uno para sumar este.'
const DE_LEADS = {
  creado: 'E2E Altura',
  primero: 'E2E Peso',
  segundo: 'E2E Talla',
  grupo: 'E2E Medidas',
}

let proyecto = ''
let claveDeOrigen = ''
let duena = ''
let lectora = ''
let origen: { id: string; nombre: string }

const anuncio = (page: Page) => page.locator('[role="status"][aria-live="assertive"]')
const asa = (page: Page, etiqueta: string) =>
  page.getByRole('button', { name: `Mover «${etiqueta}»`, exact: true })
const titulo = (page: Page, n: number) =>
  page.getByRole('heading', { name: `Datos clave (${String(n)} de 4)`, level: 2 })
const ordenDelOrigen = async () => (await camposDelOrigen(origen.id)).map((campo) => campo.clave)

// Con el mouse: tomar el asa y pasar en dos pasos por encima del destino (dnd-kit toma en el primero y lleva en el segundo).
async function arrastrar(page: Page, desde: Locator, hasta: Locator) {
  await desde.hover()
  await page.mouse.down()
  await hasta.hover({ position: { x: 20, y: 12 } })
  await hasta.hover({ position: { x: 24, y: 14 } })
  await page.mouse.up()
}

async function campoDeLeadEnGrupo(clave: string, etiqueta: string, orden: number) {
  const grupoId = await grupoDeCamposDeLead(DE_LEADS.grupo)
  const { error } = await admin()
    .from('leads_campos')
    .insert({ clave, etiqueta, tipo: 'texto', grupo_id: grupoId, orden })
  if (error) throw new Error(`No se pudo crear el campo ${clave}: ${error.message}`)
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  claveDeOrigen = `editor_de_campos_${proyecto}`
  await borrarOrigenes([`${PREFIJO_CLAVE_E2E}${claveDeOrigen}`])
  await borrarCamposDeLeadDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-editor-de-campos-${proyecto}`)
  lectora = correoDePrueba(`lectora-editor-de-campos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dina Campos' })
  origen = await crearOrigenDePrueba(`Editor de campos ${proyecto}`, claveDeOrigen)
  await crearPersona({
    email: lectora,
    contrasena: CONTRASENA,
    nombre: 'Lía Lectora',
    invitada: true,
  })
  await darRolDePrueba({
    email: lectora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Editor de campos ${proyecto}`,
      clave: `e2e_editor_campos_${proyecto}`,
    },
    permisos: [{ clave: 'flujos.configurar', origenId: origen.id }],
  })
  await campoDeLeadEnGrupo('e2e_peso', DE_LEADS.primero, 900)
  await campoDeLeadEnGrupo('e2e_talla', DE_LEADS.segundo, 910)
})

test.afterAll(async () => {
  await borrarOrigenes([`${PREFIJO_CLAVE_E2E}${claveDeOrigen}`])
  await borrarCamposDeLeadDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E escritorio: buscar, crear y editar un campo del origen en su panel', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${origen.id}/campos`)

  // Las asas llegan con el código del arrastre, ya hidratada la lista: recién ahí se escribe.
  await expect(asa(page, 'Color')).toBeVisible()
  // Buscar sin tildes deja sólo lo que coincide; «Limpiar» del vacío por filtro lo devuelve todo.
  const buscar = page.getByLabel('Buscar campo')
  await buscar.fill('colór')
  await expect(filaDelCampo(page, 'Color')).toBeVisible()
  await expect(filaDelCampo(page, 'Motor')).toHaveCount(0)
  await expect(page).toHaveURL(/[?&]q=col/)
  await buscar.fill('ninguno así')
  await expect(page.getByText('Nada coincide con «ninguno así».')).toBeVisible()
  await page.getByRole('button', { name: 'Limpiar' }).click()
  await expect(filaDelCampo(page, 'Motor')).toBeVisible()
  await expect(buscar).toHaveValue('')

  // «Nuevo campo» abre el panel en `?campo=nuevo`.
  await page.getByRole('button', { name: 'Nuevo campo' }).click()
  await expect(page).toHaveURL(/[?&]campo=nuevo/)
  const nuevo = page.getByRole('dialog')
  await nuevo.getByLabel('Nombre', { exact: true }).fill(CREADO)
  await nuevo.getByRole('button', { name: 'Crear campo' }).click()
  await descartarAviso(page, `Campo «${CREADO}» creado`)
  const creado = await campoDelOrigen(origen.id, 'kilos_e2e')

  // Tocar la fila abre su panel en `?campo=<id>`; la bandera elegida ahí queda como insignia en la fila.
  await abrirElCampo(page, CREADO)
  await expect(page).toHaveURL(new RegExp(`[?&]campo=${creado.id}`))
  const edicion = page.getByRole('dialog')
  await edicion.getByRole('switch', { name: 'Filtrable', checked: false }).click()
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await descartarAviso(page, `Campo «${CREADO}» guardado`)
  await expect(filaDelCampo(page, CREADO)).toContainText('Filtrable')
  await expect.poll(async () => (await campoDelOrigen(origen.id, 'kilos_e2e')).filtrable).toBe(true)
})

test('E2E escritorio: ordenar los campos arrastrando el asa con el mouse y con el teclado', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${origen.id}/campos`)
  expect((await ordenDelOrigen()).slice(0, 2)).toEqual(['color', 'transmision'])

  // Teclado: Espacio toma, ↓ lleva (la primera flecha se puede perder: se insiste mientras siga en su lugar), Espacio suelta.
  await asa(page, 'Color').focus()
  await page.keyboard.press('Space')
  const tomado = anuncio(page).filter({ hasText: 'Tomaste «Color».' })
  await expect(tomado).toBeAttached()
  await expect(async () => {
    if ((await tomado.count()) > 0) await page.keyboard.press('ArrowDown')
    await expect(
      anuncio(page).filter({ hasText: '«Color» está sobre «Transmisión».' }),
    ).toBeAttached({
      timeout: 1_000,
    })
  }).toPass()
  await page.keyboard.press('Space')
  await expect(
    anuncio(page).filter({ hasText: '«Color» quedó después de «Transmisión».' }),
  ).toBeAttached()
  await expect
    .poll(async () => (await ordenDelOrigen()).slice(0, 2))
    .toEqual(['transmision', 'color'])

  // Mouse: Motor sube sobre Transmisión y queda primero del grupo.
  await arrastrar(page, asa(page, 'Motor'), filaDelCampo(page, 'Transmisión'))
  await expect
    .poll(async () => (await ordenDelOrigen()).slice(0, 3))
    .toEqual(['motor', 'transmision', 'color'])
})

test('E2E escritorio: los datos clave se quitan desde su «⋯» y se ponen soltando un campo en la casilla libre', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/origenes/${origen.id}/campos`)
  await expect(titulo(page, 4)).toBeVisible()
  await expect(page.getByText(TOPE).first()).toBeVisible()
  await lineaApagada(page, 'Combustible', 'Hacer dato clave')

  await elegirDelMenu(page, 'VIN en los datos clave', 'Quitar de los datos clave')
  await expect(titulo(page, 3)).toBeVisible()
  await arrastrar(page, asa(page, 'Combustible'), page.locator('li[data-casilla-libre]').first())
  await expect(titulo(page, 4)).toBeVisible()
  expect(await casillasEnOrden(page)).toEqual(['Año', 'Kilometraje', 'Categoría', 'Combustible'])
  await expect
    .poll(async () => {
      const { data } = await admin()
        .from('origenes')
        .select('datos_clave')
        .eq('id', origen.id)
        .limit(1)
        .single()
      return (data as { datos_clave: unknown } | null)?.datos_clave
    })
    .toContainEqual({ campo: 'combustible' })

  // Quitarlo desde su casilla y volver a hacerlo dato clave desde el «⋯» de su fila.
  await elegirDelMenu(page, 'Combustible en los datos clave', 'Quitar de los datos clave')
  await expect(titulo(page, 3)).toBeVisible()
  await elegirDelMenu(page, 'Combustible', 'Hacer dato clave')
  await expect(titulo(page, 4)).toBeVisible()
  await expect(filaDelCampo(page, 'Combustible')).toContainText('Dato clave')
})

test('E2E escritorio: quien sólo configura el flujo ve los campos sin poder cambiarlos', async ({
  page,
  context,
}) => {
  await context.clearCookies()
  await entrar(page, lectora, { fresco: true })
  await page.goto(`/configuracion/origenes/${origen.id}/campos`)
  await expect(page.getByText(/no tienes el permiso «Gestionar orígenes»/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo campo' })).toBeDisabled()
  await expect(page.getByRole('button', { name: /^Mover «/ })).toHaveCount(0)
  await abrirElMenu(page, 'Color')
  await expect(page.getByRole('menuitem')).toHaveText(['Ver'])
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
  await abrirElCampo(page, 'Color')
  const panel = page.getByRole('dialog')
  await expect(panel.getByLabel('Nombre', { exact: true })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Guardar' })).toHaveCount(0)
})

test('E2E escritorio: los campos de los leads usan el mismo editor, sin casillas', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/leads/campos')
  await expect(page.getByRole('region', { name: /^Datos clave/ })).toHaveCount(0)

  await expect(asa(page, DE_LEADS.primero)).toBeVisible()
  await page.getByLabel('Buscar campo').fill('talla')
  await expect(filaDelCampo(page, DE_LEADS.segundo)).toBeVisible()
  await expect(filaDelCampo(page, DE_LEADS.primero)).toHaveCount(0)
  await page.getByLabel('Buscar campo').fill('')
  await expect(filaDelCampo(page, DE_LEADS.primero)).toBeVisible()

  await page.getByRole('button', { name: 'Nuevo campo' }).click()
  const nuevo = page.getByRole('dialog')
  await nuevo.getByLabel('Nombre', { exact: true }).fill(DE_LEADS.creado)
  await nuevo.getByRole('button', { name: 'Crear campo' }).click()
  await descartarAviso(page, `Campo «${DE_LEADS.creado}» creado`)
  await abrirElCampo(page, DE_LEADS.creado)
  const edicion = page.getByRole('dialog')
  await edicion.getByRole('switch', { name: 'Filtrable', checked: false }).click()
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await descartarAviso(page, `Campo «${DE_LEADS.creado}» guardado`)
  await expect(filaDelCampo(page, DE_LEADS.creado)).toContainText('Filtrable')

  // Talla sube sobre Peso dentro de su grupo.
  await arrastrar(page, asa(page, DE_LEADS.segundo), filaDelCampo(page, DE_LEADS.primero))
  await expect
    .poll(async () =>
      (await camposDeLead())
        .map((campo) => campo.clave)
        .filter((clave) => clave === 'e2e_peso' || clave === 'e2e_talla'),
    )
    .toEqual(['e2e_talla', 'e2e_peso'])
})
