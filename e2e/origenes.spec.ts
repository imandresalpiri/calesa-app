import { expect, test, type Browser, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import {
  abrirLosDatos,
  borrarOrigenes,
  camposDelOrigen,
  campoDelOrigen,
  delAltaASuPagina,
  flujoDelOrigen,
  origenDeLaBase,
  irAParte,
  irADetalle,
  origenPorClave,
  tarjetaDelOrigen,
} from './soporte/origenes'
import { apagarApibara } from './soporte/apibara'
import { abrirElCampo, elegirDelMenu, filaDelCampo, lineaApagada } from './soporte/editor-de-campos'
import { descartarAviso } from './soporte/inventario'
import { ingresar } from './soporte/pasos'

// @sin-celular-archivo: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)

// Configuración › Orígenes contra la app compilada y el Supabase local. Una sola historia, en
// orden: se crean un origen manual y uno de subasta (cada uno con su flujo y sus campos), se edita
// el layout, y se prueban los casos no felices. Al terminar se borra todo lo que se creó.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const DUENA = 'Dalia Prueba'
const MANUAL = 'Corea'
const SUBASTA = 'Subasta Japón'
const CLAVES_DE_ORIGEN = ['corea', 'subasta_japon']
const MOTIVO_SIN_PERMISO =
  'Puedes ver cómo está configurado, pero no tienes el permiso «Gestionar orígenes» para cambiarlo.'

let duena = ''
let configuradora = ''
let sinPermisos = ''
let proyecto = ''
let dejarApibara: () => Promise<void> = () => Promise.resolve()

test.beforeAll(async ({}, info) => {
  dejarApibara = await apagarApibara()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes(CLAVES_DE_ORIGEN)
  proyecto = info.project.name
  duena = correoDePrueba(`duena-origenes-${proyecto}`)
  configuradora = correoDePrueba(`configuradora-${proyecto}`)
  sinPermisos = correoDePrueba(`sinpermisos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: DUENA })
  // Quien configura el flujo de un origen puede verlo, pero no gestionarlo.
  await crearPersona({
    email: configuradora,
    contrasena: CLAVE,
    nombre: 'Flor Flujos',
    invitada: true,
  })
  await darRolDePrueba({
    email: configuradora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Flujos ${proyecto}`, clave: `e2e_flujos_${proyecto}` },
    permisos: ['flujos.configurar'],
  })
  await crearPersona({
    email: sinPermisos,
    contrasena: CLAVE,
    nombre: 'Sin Permisos',
    invitada: true,
  })
})

test.afterAll(async () => {
  await dejarApibara()
  await borrarOrigenes(CLAVES_DE_ORIGEN)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function entrar(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

// Otra persona, en su propio navegador (sus cookies no se mezclan con las de la dueña).
async function otraPersona(browser: Browser, page: Page): Promise<Page> {
  const contexto = await browser.newContext({ baseURL: new URL(page.url()).origin })
  return contexto.newPage()
}

test('se crea un origen manual y uno de subasta, cada uno con su flujo y sus campos', async ({
  page,
}) => {
  await entrar(page, duena)

  // Llega por su menú: Configuración → Orígenes. Sin orígenes propios, los sembrados se ven.
  await page.getByRole('button', { name: `Menú de ${DUENA}` }).click()
  await page.getByRole('menuitem', { name: 'Configuración' }).click()
  await page
    .getByRole('region')
    .getByRole('link', { name: /Orígenes/ })
    .click()
  await expect(page.getByRole('heading', { name: 'Orígenes', level: 1 })).toBeVisible()

  // Manual: «Nuevo origen» abre la página del primer paso de la puesta en marcha. El género acompaña al sustantivo hasta que la persona lo elige.
  await page.getByRole('link', { name: 'Nuevo origen' }).click()
  const panel = page.locator('main')
  await panel.getByLabel('Nombre', { exact: true }).fill(MANUAL)
  await panel.getByLabel('Lo que entra por acá se llama').fill('unidad')
  await expect(panel.getByRole('radio', { name: 'Femenino' })).toBeChecked()
  await expect(panel.getByText('«ninguna unidad en Corea todavía»')).toBeVisible()
  await panel.getByRole('button', { name: 'Crear origen' }).click()
  await expect(page.getByText(`Origen «${MANUAL}» creado`)).toBeVisible()

  // Sigue en el paso Campos de la puesta en marcha. En la página del origen, la pestaña con algo pendiente lo dice (su ⚠).
  await delAltaASuPagina(page)
  await expect(page.getByRole('heading', { name: MANUAL, level: 1 })).toBeVisible()
  await expect(
    page.getByRole('tab', { name: 'Fases. Sin fases: sus vehículos no se pueden mover' }),
  ).toBeVisible()
  await expect(
    page.getByRole('tab', { name: 'Planilla. Sin fórmula activa: no se puede cotizar' }),
  ).toBeVisible()

  const corea = await origenDeLaBase('corea')
  expect(corea).toMatchObject({ nombre: MANUAL, tipo: 'manual', sustantivo: 'unidad', genero: 'f' })
  expect(await flujoDelOrigen(corea.id)).toEqual({
    nombre: `Logística ${MANUAL}`,
    fases: 0,
    reglas: [
      'alerta_demora',
      'contenedor',
      'esperas',
      'gastos',
      'logistica',
      'pagos',
      'portal_cliente',
      'transporte',
      'vitrina_web',
    ],
  })
  expect(await camposDelOrigen(corea.id)).toHaveLength(8)

  // Subasta: nace con los campos mapeados a apibara y la regla de aduana.
  await page.goto('/configuracion/origenes/nuevo')
  const otro = page.locator('main')
  await otro.getByLabel('Nombre', { exact: true }).fill(SUBASTA)
  // Las opciones son radios nativos con otra piel: se elige tocando su etiqueta.
  await otro
    .locator('label')
    .filter({ hasText: /^Subasta$/ })
    .click()
  await otro.getByRole('checkbox', { name: 'Copart' }).check()
  await otro.getByRole('button', { name: 'Crear origen' }).click()
  await delAltaASuPagina(page)
  await expect(page.getByRole('heading', { name: SUBASTA, level: 1 })).toBeVisible()

  const japon = await origenDeLaBase('subasta_japon')
  expect(japon).toMatchObject({ tipo: 'subasta', apibara_plataformas: ['copart'] })
  const campos = await camposDelOrigen(japon.id)
  // Nace con los 17 de siempre y un campo por cada dato normalizado de la API, todos encendidos.
  expect(campos.length).toBeGreaterThan(100)
  expect(campos.filter((campo) => campo.es_sistema)).toHaveLength(17)
  expect(campos.filter((campo) => campo.clave_apibara !== null).length).toBeGreaterThan(95)
  expect(campos.every((campo) => campo.activo)).toBe(true)
  expect((await flujoDelOrigen(japon.id)).reglas).toContain('aduana')
  // Un origen de subasta suma activar apibara a lo que le falta: su tarjeta en la lista lo dice.
  await page.goto('/configuracion/origenes')
  await expect(tarjetaDelOrigen(page, SUBASTA)).toContainText('Falta activar apibara')
})

test('un nombre repetido se dice en el campo y lo tipeado queda', async ({ page }) => {
  await entrar(page, duena)
  await page.goto('/configuracion/origenes/nuevo')
  const panel = page.locator('main')
  await panel.getByLabel('Nombre', { exact: true }).fill(' corea ')
  await panel.getByLabel('Lo que entra por acá se llama').fill('lote')
  await panel.getByRole('button', { name: 'Crear origen' }).click()
  await expect(panel.getByText('Ya existe un origen llamado «corea».')).toBeVisible()
  await expect(panel.getByLabel('Nombre', { exact: true })).toHaveValue(' corea ')
  await expect(panel.getByLabel('Lo que entra por acá se llama')).toHaveValue('lote')
  expect(await origenPorClave('corea_2')).toBeNull()
})

test('se edita el layout de campos y se refleja', async ({ page }) => {
  await entrar(page, duena)
  await irADetalle(page, MANUAL, 'Campos')
  const corea = await origenDeLaBase('corea')

  // Una bandera se elige en el panel del campo y la fila la dice como insignia.
  await abrirElCampo(page, 'Motor')
  const delMotor = page.getByRole('dialog')
  await delMotor.getByRole('switch', { name: 'Filtrable', checked: false }).click()
  await delMotor.getByRole('button', { name: 'Guardar' }).click()
  await descartarAviso(page, 'Campo «Motor» guardado')
  await expect(filaDelCampo(page, 'Motor')).toContainText('Filtrable')
  await expect.poll(async () => (await campoDelOrigen(corea.id, 'motor')).filtrable).toBe(true)

  // Subir y bajar desde el «⋯» de la fila (el arrastre tiene su propio spec).
  await elegirDelMenu(page, 'Color', 'Bajar')
  await expect
    .poll(async () => (await camposDelOrigen(corea.id)).map((campo) => campo.clave).slice(0, 2))
    .toEqual(['transmision', 'color'])
  await lineaApagada(page, 'Transmisión', 'Subir')

  // Un campo propio, con opciones.
  await page.getByRole('button', { name: 'Nuevo campo' }).click()
  const panel = page.getByRole('dialog')
  await panel.getByLabel('Nombre', { exact: true }).fill('Kit de extras')
  await panel.getByLabel('Tipo').selectOption({ label: 'Una opción' })
  await panel.getByLabel('Nueva opción').fill('Básico')
  await panel.getByLabel('Nueva opción').press('Enter')
  await panel.getByLabel('Nueva opción').fill('Full')
  await panel.getByRole('button', { name: 'Agregar' }).click()
  await panel.getByLabel('Grupo').fill('Venta')
  await panel.getByRole('button', { name: 'Crear campo' }).click()
  await descartarAviso(page, 'Campo «Kit de extras» creado')
  const kit = await campoDelOrigen(corea.id, 'kit_de_extras')
  expect(kit).toMatchObject({ tipo: 'opcion', grupo: 'Venta', es_sistema: false, activo: true })
  expect(kit.opciones.map((opcion) => opcion.etiqueta)).toEqual(['Básico', 'Full'])

  // Desactivarlo desde su «⋯» lo saca del layout (el dato se conserva) y «Activar» lo devuelve.
  await elegirDelMenu(page, 'Kit de extras', 'Desactivar')
  await descartarAviso(page, '«Kit de extras» desactivado')
  await page.getByText('Desactivados', { exact: true }).click()
  await elegirDelMenu(page, 'Kit de extras', 'Activar')
  await expect(page.getByText('«Kit de extras» activado')).toBeVisible()
  await expect.poll(async () => (await campoDelOrigen(corea.id, 'kit_de_extras')).activo).toBe(true)

  // Lo que se guardó sobrevive a recargar.
  await page.reload()
  await expect(filaDelCampo(page, 'Motor')).toContainText('Filtrable')
  await expect(page.getByRole('button', { name: 'Editar Kit de extras' })).toBeVisible()
})

test('un campo de fábrica no cambia de tipo ni se elimina', async ({ page }) => {
  await entrar(page, duena)
  await irADetalle(page, MANUAL, 'Campos')
  await page.getByRole('button', { name: 'Editar Color' }).click()
  const panel = page.getByRole('dialog')
  await expect(panel.getByLabel('Tipo')).toBeDisabled()
  await expect(panel.getByText('Es un campo de fábrica')).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Eliminar campo' })).toHaveCount(0)
})

test('sin el permiso, la sección sale deshabilitada y dice por qué', async ({ page, browser }) => {
  await entrar(page, configuradora)
  await page.goto('/configuracion/origenes')
  await expect(page.getByRole('heading', { name: 'Orígenes', level: 1 })).toBeVisible()
  await expect(page.getByText(MOTIVO_SIN_PERMISO)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo origen' })).toBeDisabled()

  await tarjetaDelOrigen(page, MANUAL).click()
  await expect(page.getByRole('heading', { name: MANUAL, level: 1 })).toBeVisible()
  await irAParte(page, 'Campos')
  // Next conserva la pestaña anterior oculta: sólo cuenta lo que se ve.
  await expect(page.getByText(MOTIVO_SIN_PERMISO).filter({ visible: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ver Motor', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mover «Transmisión»' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Nuevo campo' })).toBeDisabled()

  // Quien no tiene nada que ver con los orígenes no entra.
  const ajena = await otraPersona(browser, page)
  await ajena.goto('/ingreso')
  await ingresar(ajena, sinPermisos, CLAVE)
  await expect(ajena).toHaveURL('/')
  await ajena.goto('/configuracion/origenes')
  await expect(ajena.getByText('No tienes permiso para ver esto')).toBeVisible()
  await ajena.context().close()
})

test('dos personas editando el mismo origen: la segunda ve el conflicto y no pierde lo tipeado', async ({
  page,
  browser,
}) => {
  await entrar(page, duena)
  await irADetalle(page, MANUAL)
  const datos = await abrirLosDatos(page)
  const segunda = await otraPersona(browser, page)
  await segunda.goto('/ingreso')
  await ingresar(segunda, duena, CLAVE)
  await expect(segunda).toHaveURL('/')
  // La misma pestaña con `?panel=datos`: el drawer abierto.
  await segunda.goto(page.url())
  const susDatos = segunda.getByRole('dialog', { name: 'Datos del origen' })

  // La segunda guarda primero: el drawer se cierra.
  await susDatos.getByLabel('Nombre', { exact: true }).fill('Corea del Sur')
  await susDatos.getByRole('button', { name: 'Guardar' }).click()
  await expect(segunda.getByText('Origen «Corea del Sur» guardado')).toBeVisible()
  await expect(susDatos).toBeHidden()

  // La primera todavía tiene la versión vieja en pantalla.
  await datos.getByLabel('Nombre', { exact: true }).fill('Corea Norte')
  await datos.getByRole('button', { name: 'Guardar' }).click()
  await expect(
    datos.getByText('Otra persona cambió este origen mientras lo editabas.'),
  ).toBeVisible()
  await expect(datos.getByRole('button', { name: 'Recargar', exact: true })).toBeVisible()
  await expect(datos.getByLabel('Nombre', { exact: true })).toHaveValue('Corea Norte')
  expect((await origenDeLaBase('corea')).nombre).toBe('Corea del Sur')

  // Al renombrarse, el flujo acompaña al nombre.
  expect((await flujoDelOrigen((await origenDeLaBase('corea')).id)).nombre).toBe(
    'Logística Corea del Sur',
  )
  await segunda.context().close()
})

test('con la conexión caída el formulario conserva lo tipeado y avisa', async ({
  page,
  context,
}) => {
  await entrar(page, duena)
  await irADetalle(page, 'Corea del Sur')
  const datos = await abrirLosDatos(page)
  await datos.getByLabel('Nombre', { exact: true }).fill('Corea sin red')
  await context.setOffline(true)
  await datos.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText(/No hay conexión|No pudimos llegar al servidor/)).toBeVisible()
  await expect(datos.getByLabel('Nombre', { exact: true })).toHaveValue('Corea sin red')
  await context.setOffline(false)
  expect((await origenDeLaBase('corea')).nombre).toBe('Corea del Sur')
})

test('desactivar es reversible, y eliminar sólo vale sin uso', async ({ page }) => {
  await entrar(page, duena)
  await irADetalle(page, 'Corea del Sur')

  // Desactivar (en el «⋯» del encabezado): se hace y se ofrece «Deshacer».
  await page.getByRole('button', { name: 'Más acciones de Corea del Sur' }).click()
  await page.getByRole('menuitem', { name: 'Desactivar' }).click()
  await expect(page.getByText('«Corea del Sur» desactivado')).toBeVisible()
  await expect(page.getByText('Inactivo', { exact: true })).toBeVisible()
  expect((await origenDeLaBase('corea')).activo).toBe(false)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect.poll(async () => (await origenDeLaBase('corea')).activo).toBe(true)

  // Eliminar pide tipear el nombre; el origen y lo que colgaba desaparecen.
  const id = (await origenDeLaBase('subasta_japon')).id
  await irADetalle(page, SUBASTA)
  await page.getByRole('button', { name: `Más acciones de ${SUBASTA}` }).click()
  await page.getByRole('menuitem', { name: 'Eliminar origen' }).click()
  const dialogo = page.getByRole('dialog')
  await expect(dialogo.getByRole('button', { name: 'Eliminar origen' })).toBeDisabled()
  await dialogo.getByLabel(/Para confirmar/).fill(SUBASTA)
  await dialogo.getByRole('button', { name: 'Eliminar origen' }).click()
  await expect(page.getByText(`Origen «${SUBASTA}» eliminado`)).toBeVisible()
  expect(await origenPorClave('subasta_japon')).toBeNull()
  expect(await camposDelOrigen(id)).toHaveLength(0)
})
