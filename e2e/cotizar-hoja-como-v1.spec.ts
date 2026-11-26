import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { urlDeLaHoja } from './soporte/cotizar-guardada'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { crearSubastaCopiada } from './soporte/cotizar-subasta-copiada'
import { capturar, textoGrandeAlCargar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// La hoja de cotizar con la forma de V1 (T312, `docs/UX.md` › «Flujo 2 — Cotizar»): el ⚙ de la cabecera («Configuración por defecto de <Origen>», que publica la N+1
// con `formula_cambiar_cabecera()`), los enlaces de la ayuda, la línea del «Avanzado» y los pasos de la hoja. Sobre una copia de la subasta en un origen de prueba (sus
// modos «Paralelo» y «Unificado», «Ver total» en BOB): lo que se publica no toca la semilla. El conflicto (PT409) lo prueban `cambiar-cabecera.sql` y el test del hook.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let ana = ''
let lead = ''
let origen = { id: '', nombre: '' }

const ENLACES = [
  { titulo: 'Copart', url: 'https://www.copart.com/' },
  { titulo: 'IAA', url: 'https://www.iaai.com/' },
]

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  ;({ duena, lead } = await prepararGuardado(proyecto, 'comov1'))
  const nombre = `E2E T312 subasta ${proyecto}`
  origen = { id: await crearSubastaCopiada(nombre, `comov1sub_${proyecto}`), nombre }
  // La ayuda de «Fees» con dos enlaces, sembrada en el diseño de la copia (cada versión que publique el ⚙ la copia).
  sql(`
    do $f$
    declare d jsonb; i int; k int;
    begin
      select diseno into d from public.formulas where origen_id = ${literal(origen.id)}::uuid and estado = 'publicada';
      for i in 0 .. jsonb_array_length(d -> 'secciones') - 1 loop
        for k in 0 .. jsonb_array_length(d -> 'secciones' -> i -> 'items') - 1 loop
          if d -> 'secciones' -> i -> 'items' -> k ->> 'nodo' = 'fees' and d -> 'secciones' -> i -> 'items' -> k ->> 'tipo' = 'celda' then
            d := jsonb_set(d, array['secciones', i::text, 'items', k::text, 'ayuda'],
                           jsonb_build_object('texto', 'Lo cobra la subasta.', 'enlaces', ${literal(JSON.stringify(ENLACES))}::jsonb));
          end if;
        end loop;
      end loop;
      update public.formulas set diseno = d where origen_id = ${literal(origen.id)}::uuid and estado = 'publicada';
    end $f$`)
  // Ana cotiza y ve «costos», pero no configura: sin el ⚙ de la cabecera ni de ninguna celda. Sin `crear.sin_vehiculo`: el vehículo es obligatorio.
  ana = correoDePrueba(`ana-comov1-${proyecto}`)
  await crearPersona({ email: ana, contrasena: CONTRASENA, nombre: 'Ana Asesora', invitada: true })
  await darRolDePrueba({
    email: ana,
    rol: { nombre: `${PREFIJO_ROL_E2E}Ana como V1 ${proyecto}`, clave: `e2e_comov1_${proyecto}` },
    permisos: [
      'cotizaciones.ver',
      'cotizaciones.crear',
      'cotizaciones.nivel.costos.ver',
      'vehiculos.ver',
      'leads.ver',
    ],
  })
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const url = (resto = '') => `${urlDeLaHoja(origen.id, lead)}${resto}`
const engranaje = (page: Page) =>
  page.getByRole('button', { name: `Configuración por defecto de ${origen.nombre}`, exact: true })
const panel = (page: Page) =>
  page.getByRole('dialog', { name: `Configuración por defecto de ${origen.nombre}` })
const modos = (page: Page) => page.getByRole('group', { name: 'Modo de tipo de cambio' })
const verTotal = (page: Page) => page.getByRole('switch', { name: 'Ver total en moneda local' })
const cabeceraPublicada = () =>
  sql(
    `select version || '|' || (diseno -> 'cabecera' ->> 'modo_por_defecto') || '|' || (diseno -> 'cabecera' ->> 'ver_total_bs_por_defecto') || '|' || (diseno -> 'cabecera' -> 'modos_visibles')::text from public.formulas where origen_id = ${literal(origen.id)}::uuid and estado = 'publicada'`,
  )

// Entra como esa persona (otra en la misma prueba: se sueltan las cookies de la anterior) y abre la hoja.
async function abrir(page: Page, correo: string, destino = url()) {
  await page.context().clearCookies()
  await entrar(page, correo, { fresco: true })
  await page.goto(destino)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

test('E2E C1: la dueña cambia la configuración por defecto desde el ⚙ de la cabecera; la hoja abierta y la próxima nacen con eso', async ({
  page,
}, info) => {
  await abrir(page, duena)
  await expect(modos(page).getByRole('radio', { name: 'Paralelo' })).toBeChecked()
  await expect(verTotal(page)).toHaveAttribute('aria-checked', 'false')
  await capturar(page, info, 'hoja')
  await engranaje(page).click()
  const abierto = panel(page)
  await expect(
    abierto.getByText(`Con esto arrancan las cotizaciones nuevas de ${origen.nombre}.`, {
      exact: false,
    }),
  ).toBeVisible()
  const porDefecto = abierto.getByRole('group', { name: 'Tipo de cambio por defecto' })
  await expect(porDefecto.getByRole('radio', { name: 'Paralelo' })).toBeChecked()
  await porDefecto.getByRole('radio', { name: 'Unificado' }).check()
  const visibles = abierto.getByRole('group', { name: 'Opciones visibles en el encabezado' })
  // El modo por defecto queda visible: su casilla, marcada y apagada.
  await expect(visibles.getByRole('checkbox', { name: 'Unificado' })).toBeDisabled()
  await visibles.getByRole('checkbox', { name: 'Paralelo' }).click()
  await abierto.getByRole('checkbox', { name: 'Mostrar el total en BOB por defecto' }).click()
  await expect(
    abierto.getByRole('checkbox', { name: 'Aplicar también a esta cotización' }),
  ).toBeChecked()
  await capturar(page, info, 'panel')
  await abierto.getByRole('button', { name: 'Guardar por defecto' }).click()
  await expect(abierto).toBeHidden()
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'y la aplicaste a esta cotización' }),
  ).toBeVisible()
  expect(cabeceraPublicada()).toBe('2|unificado|true|["unificado"]')
  // La hoja abierta cambió como si la persona eligiera: «Unificado» y «Ver total» encendido. Sigue en su versión (la 1, sin la lista de visibles): los dos modos.
  await expect(modos(page).getByRole('radio', { name: 'Unificado' })).toBeChecked()
  await expect(verTotal(page)).toHaveAttribute('aria-checked', 'true')
  // Una cotización nueva (otra pestaña: sin el borrador de ésta) nace con eso, y el encabezado no muestra el modo oculto.
  const otra = await page.context().newPage()
  await otra.goto(url())
  await expect(otra.locator('[data-hoja]')).toBeVisible()
  // Con un solo modo visible no hay qué elegir: el control de los modos no se dibuja.
  await expect(otra.getByRole('group', { name: 'Modo de tipo de cambio' })).toHaveCount(0)
  await expect(verTotal(otra)).toHaveAttribute('aria-checked', 'true')
  await expect(otra.getByRole('radio', { name: 'Paralelo' })).toHaveCount(0)
  await otra.close()
})

test('E2E C2: quien no configura el origen no ve el ⚙ de la cabecera, y la URL no lo abre', async ({
  page,
}) => {
  await abrir(page, ana, url('&ajuste=cabecera'))
  // La cabecera ya llegó a su ranura (va por un portal al hidratar): «Ver total» está, el ⚙ no.
  await expect(verTotal(page)).toBeVisible()
  await expect(engranaje(page)).toHaveCount(0)
  await expect(panel(page)).toHaveCount(0)
})

test('E2E C3: los enlaces de la ayuda abren en otra pestaña, sin opener ni referrer, y su nombre lo dice', async ({
  page,
}, info) => {
  await abrir(page, ana)
  await page
    .locator('[data-nodo="fees"]')
    .getByRole('button', { name: /^Ayuda de / })
    .click()
  const ayuda = page.getByRole('dialog', { name: /^Ayuda de / })
  await expect(ayuda.getByRole('heading', { name: 'Consulta estas fuentes' })).toBeVisible()
  const copart = ayuda.getByRole('link', { name: 'Copart (abre en otra pestaña)' })
  await expect(copart).toHaveAttribute('href', 'https://www.copart.com/')
  await expect(copart).toHaveAttribute('target', '_blank')
  await expect(copart).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(ayuda.getByRole('link')).toHaveCount(2)
  await capturar(page, info, 'ayuda')
})

test('E2E C4: el «Avanzado» dice su línea: con el ⚙, las dos frases; sin él, la primera', async ({
  page,
}) => {
  const linea = (p: Page) =>
    p.getByRole('dialog', { name: 'Avanzado' }).locator('[data-explicacion-del-avanzado]')
  await abrir(page, duena, url('&panel=avanzado'))
  await expect(linea(page)).toHaveText(
    'Tocar un valor lo cambia sólo en esta cotización. El ⚙ cambia el valor por defecto de las cotizaciones nuevas.',
  )
  await abrir(page, ana, url('&panel=avanzado'))
  await expect(linea(page)).toHaveText('Tocar un valor lo cambia sólo en esta cotización.')
})

test('E2E C5: los pasos son «Privada · Vista previa»: «Vista previa» abre su panel y «atrás» lo cierra', async ({
  page,
}, info) => {
  const pasos = page.getByRole('navigation', { name: 'Pasos de la hoja' })
  const paso = (clave: string) => pasos.locator(`[data-paso="${clave}"]`)
  await abrir(page, ana)
  await expect(paso('vista_previa')).toHaveText('Vista previa')
  // «Hoja», «Vehículo» y «Cliente» ya no son pasos: las barras de arriba abren sus paneles.
  await expect(
    pasos.locator('[data-paso]:not([data-paso="privada"], [data-paso="vista_previa"])'),
  ).toHaveCount(0)
  await capturar(page, info, 'pasos')
  await paso('vista_previa').click()
  await expect(page).toHaveURL(/[?&]panel=vista-previa/)
  await page.goBack()
  await expect(page).not.toHaveURL(/[?&]panel=vista-previa/)
})

test('E2E C6: en el celular los pasos miden 44 px; al 200 % no se salen de su fila', async ({
  page,
  isMobile,
}, info) => {
  test.skip(!isMobile, 'Los 44 px son del celular.')
  const pasos = page.getByRole('navigation', { name: 'Pasos de la hoja' })
  const cajas = async () =>
    pasos
      .locator('[data-paso]')
      .evaluateAll((ps) => ps.map((p) => p.getBoundingClientRect().height))
  await abrir(page, ana)
  await expect(pasos.locator('[data-paso="vista_previa"]')).toBeVisible()
  for (const alto of await cajas()) expect(alto).toBeGreaterThanOrEqual(44)
  await textoGrandeAlCargar(page)
  await page.reload()
  await expect(page.locator('[data-hoja]')).toBeVisible()
  for (const alto of await cajas()) expect(alto).toBeGreaterThanOrEqual(44)
  // Ningún paso se sale por la derecha ni desborda la fila.
  const desborde = await pasos.evaluate((nav) => {
    const visible = document.documentElement.clientWidth
    const derecha = Math.max(...[...nav.children].map((b) => b.getBoundingClientRect().right))
    return { derecha, visible, propio: nav.scrollWidth - nav.clientWidth }
  })
  expect(desborde.derecha).toBeLessThanOrEqual(desborde.visible + 1)
  expect(desborde.propio).toBeLessThanOrEqual(1)
  await capturar(page, info, 'pasos-200')
})
