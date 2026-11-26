import { CONTRASENA, entrar } from './soporte/alta'
import { admin, borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { comboDe } from './soporte/combo'
import { abrirElCampo, filaDelCampo } from './soporte/editor-de-campos'
import { descartarAviso } from './soporte/inventario'
import {
  borrarCamposDeLeadDePrueba,
  borrarLeadsDePrueba,
  campoDeLead,
  crearLead,
  exigir,
  grupoDeCamposDeLead,
  PREFIJO_DE_LEAD_E2E,
} from './soporte/leads'
import { codigoDePaisDeLaEmpresa, telefonoAlAzar } from './soporte/leads-alta'
import { elegirDelMenu, filaDeCatalogo, nombreDeLaFila } from './soporte/lista-de-catalogo'
import { expect, test, type Page } from './soporte/prueba'
import { quieto } from './soporte/recorrido'

// @sin-celular-archivo: Configuración no se prueba en celular; pruebas sólo en lo clave (la persona, 2026-11-08)

// Un grupo de campos y una categoría de FAQ se eligen de un catálogo sin duplicados (docs/GLOSARIO.md › Grupo de campos): el combo del
// panel de un campo ofrece el que ya existe con otra escritura en vez de crearlo y crea lo nuevo; el drawer «Grupos» renombra (la ficha
// del lead lo dice) y quita uno con campos moviéndolos antes; el de «Categorías» de las FAQ hace lo mismo con sus preguntas. Lo que la base
// rechaza (duplicado, versión, permiso, destino) lo prueban `supabase/tests/areas/campos/grupos-*.sql` y `web/categorias-faqs.sql`.
test.describe.configure({ mode: 'serial' })

const EXISTENTE = 'E2E Datos del Cliente'
const NUEVO = 'E2E Medidas nuevas'
const RENOMBRADO = 'E2E Medidas finales'
const CAMPO = { clave: 'e2e_gsd_entrega', etiqueta: 'E2E Ciudad de entrega' }
const LEAD = 'GSD Cliente'
const FAQ = {
  prefijo: 'E2E GSD',
  existente: 'E2E GSD Garantía',
  nueva: 'E2E GSD Envíos',
  pregunta: 'E2E GSD ¿Tiene garantía?',
}

let duena = ''

const drawer = (page: Page, titulo: string) => page.getByRole('dialog', { name: titulo })

async function borrarFaqsDePrueba(): Promise<void> {
  const faqs = await admin().from('web_faqs').delete().like('pregunta', `${FAQ.prefijo}%`)
  exigir(faqs.error, 'borrar las preguntas de prueba')
  const categorias = await admin()
    .from('web_categorias_faqs')
    .delete()
    .like('nombre', `${FAQ.prefijo}%`)
  exigir(categorias.error, 'borrar las categorías de prueba')
}

async function limpiar(): Promise<void> {
  await borrarLeadsDePrueba()
  await borrarCamposDeLeadDePrueba()
  await borrarFaqsDePrueba()
  await borrarPersonasDePrueba()
}

async function categoriaDeFaq(nombre: string): Promise<string> {
  const { data, error } = await admin()
    .from('web_categorias_faqs')
    .select('id')
    .eq('nombre', nombre)
    .limit(1)
  exigir(error, `leer la categoría «${nombre}»`)
  return data?.[0]?.id ?? ''
}

test.beforeAll(async ({}, info) => {
  await limpiar()
  duena = correoDePrueba(`duena-grupos-sin-duplicados-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Gala Grupos' })
  const grupoId = await grupoDeCamposDeLead(EXISTENTE)
  const campo = await admin()
    .from('leads_campos')
    .insert({ ...CAMPO, tipo: 'texto', grupo_id: grupoId, orden: 950 })
  exigir(campo.error, `crear el campo ${CAMPO.clave}`)
  const categoria = await admin()
    .from('web_categorias_faqs')
    .insert({ nombre: FAQ.existente, orden: 990 })
    .select('id')
    .single<{ id: string }>()
  exigir(categoria.error, `crear la categoría «${FAQ.existente}»`)
  const faq = await admin()
    .from('web_faqs')
    .insert({
      pregunta: FAQ.pregunta,
      respuesta: 'Sí, un año.',
      categoria_id: categoria.data?.id ?? null,
      publicada: false,
      orden: 990,
    })
  exigir(faq.error, 'crear la pregunta de prueba')
})

test.afterAll(limpiar)

test('E2E escritorio: el combo del grupo ofrece el que existe con otra escritura y crea lo nuevo', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/leads/campos')
  await expect(filaDelCampo(page, CAMPO.etiqueta)).toBeVisible()
  await abrirElCampo(page, CAMPO.etiqueta)
  const panel = page.getByRole('dialog')
  const combo = comboDe(panel, 'Grupo')
  await expect(combo).toHaveAccessibleName(`Grupo ${EXISTENTE}`)

  // La lista del combo flota: el campo de abajo no se mueve al abrirla.
  const siguiente = panel.getByRole('switch', { name: 'Activo' })
  await quieto(panel)
  const antes = await siguiente.boundingBox()
  await combo.click()
  const buscar = page.locator('[cmdk-input]')
  await buscar.fill('e2e datos  del cliente')
  await expect(page.getByRole('option', { name: EXISTENTE, exact: true })).toBeVisible()
  await expect(page.getByText(`Ya existe «${EXISTENTE}».`)).toBeVisible()
  await expect(page.getByRole('option', { name: /^Crear grupo/ })).toHaveCount(0)
  expect(await siguiente.boundingBox()).toEqual(antes)

  // Lo que no existe se crea desde ahí y queda elegido; al guardar, el campo va bajo su bloque.
  await buscar.fill(NUEVO)
  await page.getByRole('option', { name: `Crear grupo «${NUEVO}»` }).click()
  await expect(buscar).toBeHidden()
  await expect(combo).toHaveAccessibleName(`Grupo ${NUEVO}`)
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await descartarAviso(page, `Campo «${CAMPO.etiqueta}» guardado`)
  await expect(page.getByRole('heading', { name: NUEVO, level: 3 })).toBeVisible()
  await expect.poll(async () => (await campoDeLead(CAMPO.clave)).grupo).toBe(NUEVO)
})

test('E2E escritorio: «Grupos» renombra sin duplicar y la ficha del lead dice el nombre nuevo', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/leads/campos')
  await page.getByRole('button', { name: 'Grupos', exact: true }).click()
  await expect(page).toHaveURL(/[?&]panel=grupos/)
  const panel = drawer(page, 'Grupos de campos')
  await expect(nombreDeLaFila(page, NUEVO)).toBeVisible()

  // Renombrar cambia el formulario de arriba sin mover la lista.
  const fila = filaDeCatalogo(page, NUEVO)
  await quieto(panel)
  const antes = await fila.boundingBox()
  await elegirDelMenu(page, NUEVO, 'Renombrar')
  const nombre = panel.getByLabel(`Renombrar «${NUEVO}»`)
  await expect(nombre).toHaveValue(NUEVO)
  expect((await fila.boundingBox())?.y).toBe(antes?.y)
  await nombre.fill(RENOMBRADO)
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await descartarAviso(page, 'Grupo renombrado')
  await expect(nombreDeLaFila(page, RENOMBRADO)).toBeVisible()

  // Otra escritura de uno que existe no se agrega: lo dice junto al nombre.
  const agregar = panel.getByLabel('Nombre', { exact: true })
  await agregar.fill('e2e datos del cliente')
  await panel.getByRole('button', { name: 'Agregar' }).click()
  await expect(panel.getByText(`Ya existe «${EXISTENTE}».`)).toBeVisible()
  await agregar.fill('')

  // La ficha del lead agrupa sus datos con el nombre nuevo.
  const leadId = await crearLead({
    nombre: LEAD,
    telefono: `${await codigoDePaisDeLaEmpresa()}${telefonoAlAzar()}`,
    deQuien: duena,
    atributos: { [CAMPO.clave]: 'Cochabamba' },
  })
  await page.goto(`/leads/${leadId}?ver=datos`)
  const datos = page.getByRole('dialog', { name: `Datos de ${PREFIJO_DE_LEAD_E2E}${LEAD}` })
  await expect(datos.getByRole('region', { name: RENOMBRADO })).toContainText('Cochabamba')
})

test('E2E escritorio: quitar un grupo con campos los mueve antes a «Sin grupo»', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/leads/campos?panel=grupos')
  await expect(nombreDeLaFila(page, RENOMBRADO)).toBeVisible()
  await elegirDelMenu(page, RENOMBRADO, 'Quitar')
  await expect(page).toHaveURL(/[?&]quitar=/)
  const confirmar = page.getByRole('dialog', { name: `Quitar el grupo «${RENOMBRADO}»` })
  await expect(confirmar).toContainText(`«${RENOMBRADO}» tiene 1 campo. Muévelo antes de quitarlo.`)
  await expect(confirmar.getByLabel('Mover su campo a…')).toHaveValue('')
  await confirmar.getByRole('button', { name: 'Mover y quitar' }).click()
  await descartarAviso(page, 'Grupo quitado')
  await expect(nombreDeLaFila(page, RENOMBRADO)).toHaveCount(0)
  await expect.poll(async () => (await campoDeLead(CAMPO.clave)).grupo).toBeNull()
})

test('E2E escritorio: «Categorías» de las preguntas frecuentes, sin duplicados y moviendo sus preguntas', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/web/faqs')
  await page.getByRole('button', { name: 'Categorías', exact: true }).click()
  await expect(page).toHaveURL(/[?&]panel=categorias/)
  const panel = drawer(page, 'Categorías de las preguntas')
  await expect(nombreDeLaFila(page, FAQ.existente)).toBeVisible()

  const nombre = panel.getByLabel('Nombre', { exact: true })
  await nombre.fill('e2e gsd garantia')
  await panel.getByRole('button', { name: 'Agregar' }).click()
  await expect(panel.getByText(`Ya existe «${FAQ.existente}».`)).toBeVisible()
  await nombre.fill(FAQ.nueva)
  await panel.getByRole('button', { name: 'Agregar' }).click()
  await descartarAviso(page, 'Categoría agregada')
  await expect(nombreDeLaFila(page, FAQ.nueva)).toBeVisible()

  await elegirDelMenu(page, FAQ.existente, 'Quitar')
  const confirmar = page.getByRole('dialog', { name: `Quitar la categoría «${FAQ.existente}»` })
  await expect(confirmar).toContainText(
    `«${FAQ.existente}» tiene 1 pregunta. Muévela antes de quitarla.`,
  )
  await confirmar.getByLabel('Mover su pregunta a…').selectOption({ label: FAQ.nueva })
  await confirmar.getByRole('button', { name: 'Mover y quitar' }).click()
  await descartarAviso(page, 'Categoría quitada')
  await expect(nombreDeLaFila(page, FAQ.existente)).toHaveCount(0)
  const destino = await categoriaDeFaq(FAQ.nueva)
  await expect
    .poll(async () => {
      const { data } = await admin()
        .from('web_faqs')
        .select('categoria_id')
        .eq('pregunta', FAQ.pregunta)
        .limit(1)
      return data?.[0]?.categoria_id
    })
    .toBe(destino)
})
