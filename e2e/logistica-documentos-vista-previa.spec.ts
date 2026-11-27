import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  borrarArchivosDeDocumentos,
  borrarDocumentos,
  sembrarArchivosDeDocumentos,
  sembrarDocumentos,
  type DocumentoSembrado,
  type TerrenoDeDocumentos,
} from './soporte/documentos'
import { fotos } from './soporte/fotos'
import { abrirSeccionDeLaUnidad } from './soporte/unidad'

// Un documento se reconoce por su miniatura y se revisa en su vista previa (T574): la fila muestra la imagen o el icono de su tipo, tocarla abre un modal de tamaño fijo en `?documento=<id>` con
// el archivo, las flechas y, en el pie, Aprobar, Rechazar con motivo y «Visible en el portal»; el «⋯» reúne las siete acciones y la bandeja de subida se mira antes de confirmar.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeDocumentos
let sembrados: DocumentoSembrado[] = []

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarDocumentos(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-vista-previa-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Vera Vistaprevia',
  })
  terreno = await sembrarDocumentos(proyecto)
  sembrados = await sembrarArchivosDeDocumentos(terreno, terreno.enA.id)
})

test.afterAll(async () => {
  await borrarArchivosDeDocumentos(sembrados)
  await borrarDocumentos(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function abrirLosDocumentos(
  page: Page,
  correo: string,
  vehiculoId: string,
): Promise<Locator> {
  await entrar(page, correo, { fresco: true })
  await page.goto(`/logistica/vehiculo/${vehiculoId}`)
  return abrirSeccionDeLaUnidad(page, 'documentos')
}

const duena = () => correoDePrueba(`duena-vista-previa-${proyecto}`)
const vista = (page: Page) => page.getByRole('dialog', { name: 'Vista previa' })
const nombreMostrado = (modal: Locator) =>
  modal.locator('[data-vista-previa-del-documento] [title]').first()

// El alto y el ancho del modal: no cambian entre una imagen, un PDF y un aviso.
async function cajaDe(modal: Locator): Promise<{ width: number; height: number }> {
  const caja = await modal.boundingBox()
  if (!caja) throw new Error('El modal no tiene caja.')
  return { width: Math.round(caja.width), height: Math.round(caja.height) }
}

test('E2E la fila muestra la miniatura de la imagen y el icono del PDF; tocarla abre la vista previa y Esc devuelve el foco', async ({
  page,
}) => {
  const hueco = await abrirLosDocumentos(page, duena(), terreno.enA.id)
  const imagen = hueco.locator('[data-documento-id]').filter({ hasText: 'foto-1.png' })
  const pdf = hueco.locator('[data-documento-id]').filter({ hasText: 'bl.pdf' })
  const miniatura = imagen.locator('[data-miniatura-del-documento="imagen"] img')
  await expect(miniatura).toBeVisible()
  await expect
    .poll(() => miniatura.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0)
  await expect(pdf.locator('[data-miniatura-del-documento="icono"]')).toContainText('PDF')

  const alto = await imagen.boundingBox()
  await page.getByRole('button', { name: 'Ver foto-1.png' }).click()
  const modal = vista(page)
  await expect(modal).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`documento=${sembrados[0]?.id ?? ''}`))
  await expect(modal.locator('[data-imagen-con-zoom] img')).toBeVisible()
  await expect(nombreMostrado(modal)).toHaveText('foto-1.png')
  // La lista de atrás no cambió de alto al abrirse el modal.
  expect((await imagen.boundingBox())?.height).toBe(alto?.height)

  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  await expect(page).not.toHaveURL(/documento=/)
  await expect(page.getByRole('button', { name: 'Ver foto-1.png' })).toBeFocused()
})

test('E2E las flechas pasan de un documento a otro y el modal no cambia de tamaño entre imagen y PDF', async ({
  page,
}) => {
  const hueco = await abrirLosDocumentos(page, duena(), terreno.enA.id)
  await hueco.getByRole('button', { name: 'Ver bl.pdf' }).click()
  const modal = vista(page)
  await expect(nombreMostrado(modal)).toHaveText('bl.pdf')
  // En headless puede no haber visor de PDF: entonces el aviso ocupa la misma caja.
  await expect(
    modal.locator('[data-visor-de-pdf], [data-mensaje-de-la-vista-previa]'),
  ).toBeVisible()
  const delPdf = await cajaDe(modal)

  // El vecino de un PDF es una imagen, vaya por donde vaya la flecha.
  const siguiente = modal.getByRole('button', { name: 'Documento siguiente' })
  const anterior = modal.getByRole('button', { name: 'Documento anterior' })
  await ((await siguiente.isEnabled()) ? siguiente : anterior).click()
  await expect(modal.locator('[data-imagen-con-zoom] img')).toBeVisible()
  await expect(nombreMostrado(modal)).not.toHaveText('bl.pdf')
  expect(await cajaDe(modal)).toEqual(delPdf)

  // El teclado también las recorre: ← y → no salen del modal.
  const antes = await nombreMostrado(modal).textContent()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowLeft')
  await expect(nombreMostrado(modal)).toHaveText(antes ?? '')
  expect(await cajaDe(modal)).toEqual(delPdf)

  // El zoom: «Acercar» sube la escala y «Ajustar a la caja» la devuelve, sin mover el modal.
  const zoom = modal.locator('[data-imagen-con-zoom]')
  await modal.getByRole('button', { name: 'Acercar' }).click()
  await expect(zoom).not.toHaveAttribute('data-escala', '1')
  await modal.getByRole('button', { name: 'Ajustar a la caja' }).click()
  await expect(zoom).toHaveAttribute('data-escala', '1')
  expect(await cajaDe(modal)).toEqual(delPdf)
})

test('E2E desde el pie de la vista previa se aprueba uno y se rechaza otro con su motivo', async ({
  page,
}) => {
  const hueco = await abrirLosDocumentos(page, duena(), terreno.enA.id)
  await hueco.getByRole('button', { name: 'Ver foto-1.png' }).click()
  const modal = vista(page)
  await expect(nombreMostrado(modal)).toHaveText('foto-1.png')
  const pie = modal.locator('[data-pie-de-la-vista-previa]')
  const alto = await pie.boundingBox()
  await pie.getByRole('button', { name: 'Aprobar' }).click()
  await expect(modal.getByText('Aprobado', { exact: true })).toBeVisible()
  await expect(pie.getByRole('button', { name: 'Aprobar' })).toHaveCount(0)
  // El pie no cambió de alto al cambiar de estado.
  expect((await pie.boundingBox())?.height).toBe(alto?.height)

  // Rechazar el PDF: se llega a él por las flechas, sin saber el orden.
  for (let intento = 0; intento < 3; intento++) {
    if ((await nombreMostrado(modal).textContent()) === 'bl.pdf') break
    const flecha = modal.getByRole('button', { name: 'Documento siguiente' })
    await (
      (await flecha.isEnabled())
        ? flecha
        : modal.getByRole('button', { name: 'Documento anterior' })
    ).click()
  }
  await expect(nombreMostrado(modal)).toHaveText('bl.pdf')
  await pie.getByRole('button', { name: 'Rechazar' }).click()
  const motivo = modal.getByLabel('Motivo del rechazo')
  await expect(motivo).toBeFocused()
  await expect(pie.getByRole('button', { name: 'Confirmar rechazo' })).toBeDisabled()
  expect((await pie.boundingBox())?.height).toBe(alto?.height)
  await motivo.fill('Falta la hoja de firmas')
  await pie.getByRole('button', { name: 'Confirmar rechazo' }).click()
  await expect(modal.getByText('Rechazado', { exact: true })).toBeVisible()

  const filas = await admin()
    .from('documentos')
    .select('nombre_archivo, estado, motivo_rechazo')
    .eq('vehiculo_id', terreno.enA.id)
    .in('nombre_archivo', ['foto-1.png', 'bl.pdf'])
  const porNombre = Object.fromEntries((filas.data ?? []).map((f) => [f.nombre_archivo, f]))
  expect(porNombre['foto-1.png']?.estado).toBe('aprobado')
  expect(porNombre['bl.pdf']).toMatchObject({
    estado: 'rechazado',
    motivo_rechazo: 'Falta la hoja de firmas',
  })
})

test('E2E el «⋯» de una fila reúne las siete acciones y «Rechazar» abre la vista previa con el motivo enfocado', async ({
  page,
}) => {
  const hueco = await abrirLosDocumentos(page, duena(), terreno.enA.id)
  // `foto-2.png` sigue «subido»: todas las acciones corresponden.
  await hueco.getByRole('button', { name: 'Más acciones de foto-2.png' }).click()
  const menu = page.getByRole('menu')
  await expect(menu.getByRole('menuitem', { name: 'Ver', exact: true })).toBeEnabled()
  await expect(menu.getByRole('menuitem', { name: 'Descargar' })).toBeEnabled()
  await expect(menu.getByRole('menuitem', { name: 'Aprobar' })).toBeEnabled()
  await expect(menu.getByRole('menuitem', { name: 'Rechazar…' })).toBeEnabled()
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Visible en el portal' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Editar…' })).toBeEnabled()
  await expect(menu.getByRole('menuitem', { name: 'Eliminar…' })).toBeEnabled()

  await menu.getByRole('menuitem', { name: 'Rechazar…' }).click()
  const modal = vista(page)
  await expect(modal).toBeVisible()
  await expect(modal.getByLabel('Motivo del rechazo')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()

  // «Editar…» abre su modal; «Eliminar…» sigue en `?panel=eliminar-documento`.
  await hueco.getByRole('button', { name: 'Más acciones de foto-2.png' }).click()
  await page.getByRole('menuitem', { name: 'Editar…' }).click()
  await expect(page.getByRole('dialog', { name: /Editar «foto-2\.png»/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: /Editar/ })).toBeHidden()
  await hueco.getByRole('button', { name: 'Más acciones de foto-2.png' }).click()
  await page.getByRole('menuitem', { name: 'Eliminar…' }).click()
  await expect(page).toHaveURL(/panel=eliminar-documento/)
  await page.keyboard.press('Escape')
  await expect(page).not.toHaveURL(/panel=eliminar-documento/)
})

test('E2E quien sólo sube ve apagado lo que no puede, con su motivo, y el «⋯» le ofrece lo demás', async ({
  page,
}) => {
  const hueco = await abrirLosDocumentos(page, terreno.quienSube.correo, terreno.enA.id)
  await hueco.getByRole('button', { name: 'Más acciones de foto-2.png' }).click()
  const menu = page.getByRole('menu')
  await expect(menu.getByRole('menuitem', { name: 'Ver', exact: true })).toBeEnabled()
  await expect(menu.getByRole('menuitem', { name: 'Aprobar' })).toBeDisabled()
  await expect(menu.getByRole('menuitem', { name: 'Rechazar…' })).toBeDisabled()
  await expect(menu.getByRole('menuitemcheckbox', { name: 'Visible en el portal' })).toBeDisabled()
  await expect(menu.getByText('Necesitas permiso para aprobar documentos.')).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Editar…' })).toBeEnabled()
  await page.keyboard.press('Escape')

  // En la vista previa, el pie dice lo mismo y no deja aprobar.
  await hueco.getByRole('button', { name: 'Ver foto-2.png' }).click()
  const modal = vista(page)
  await expect(modal.getByRole('button', { name: 'Aprobar' })).toBeDisabled()
  await expect(modal.getByText('Necesitas permiso para aprobar documentos.').first()).toBeVisible()
})

test('E2E la bandeja de subida muestra miniaturas y se mira antes de confirmar, sin aprobar ni subir', async ({
  page,
}) => {
  const hueco = await abrirLosDocumentos(page, terreno.quienSube.correo, terreno.enB.id)
  await hueco.getByRole('button', { name: 'Subir documentos' }).click()
  const bandeja = page.getByRole('dialog', { name: 'Subir documentos' })
  await bandeja.getByLabel('Tipo de documento').selectOption({ label: terreno.tipoDeBl.nombre })
  await bandeja.locator('input[type="file"]:not([capture])').setInputFiles([
    {
      name: 'foto-3.png',
      mimeType: 'image/png',
      buffer: fotos(3)[0]?.buffer ?? Buffer.alloc(0),
    },
    {
      name: 'otro.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(`%PDF-1.4 e2e ${proyecto}`),
    },
  ])
  const lista = bandeja.getByRole('list', { name: 'Archivos para subir' })
  await expect(lista).toContainText('foto-3.png')
  const miniatura = lista.locator('[data-miniatura-del-documento="imagen"] img')
  await expect(miniatura).toBeVisible()
  await expect
    .poll(() => miniatura.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0)
  await expect(lista.locator('[data-miniatura-del-documento="icono"]')).toContainText('PDF')

  await lista.getByRole('button', { name: 'Ver foto-3.png' }).click()
  const modal = vista(page)
  await expect(modal.locator('[data-imagen-con-zoom] img')).toBeVisible()
  // Sólo para ver: no hay documento todavía, nada que aprobar ni rechazar.
  await expect(modal.getByRole('button', { name: 'Aprobar' })).toHaveCount(0)
  await expect(modal.getByRole('button', { name: 'Rechazar' })).toHaveCount(0)
  const delaImagen = await cajaDe(modal)
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  // Esc cerró sólo la vista previa: la bandeja sigue abierta y con sus archivos.
  await expect(bandeja).toBeVisible()

  await lista.getByRole('button', { name: 'Ver otro.pdf' }).click()
  await expect(
    modal.locator('[data-visor-de-pdf], [data-mensaje-de-la-vista-previa]'),
  ).toBeVisible()
  expect(await cajaDe(modal)).toEqual(delaImagen)
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()

  // Nada se subió.
  const filas = await admin()
    .from('documentos')
    .select('id')
    .eq('vehiculo_id', terreno.enB.id)
    .limit(1)
  expect(filas.data).toEqual([])
})
