import { expect, test, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  exigirEquipoSinAjenos,
} from './soporte/base'
import { ingresar } from './soporte/pasos'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// «Ver todos» de los bloques de Inicio: el enlace sólo existe cuando el bloque llega a su tope (5) y lleva a la lista completa ya filtrada. Acá, los dos destinos
// nuevos que no son un filtro de leads (ése, en `leads-sin-seguimiento.spec.ts`): «Personas sin rol» → el equipo filtrado por «Sin rol» y «Turnos de la web sin
// confirmar» → el panel `?panel=turnos`, de a 20 con «Ver más». Con el bloque por debajo del tope no hay enlace.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const BLOQUE_DE_TURNOS = 'Turnos de la web sin confirmar'
const BLOQUE_SIN_ROL = 'Personas sin rol'

let duena = ''
let asesora = ''
let asesoraId = ''

const quitarTurnos = () =>
  sql(`delete from public.solicitudes_contacto_web where token_visitante like 'e2etodos%'`)

test.beforeAll(async ({}, info) => {
  quitarTurnos()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await exigirEquipoSinAjenos()
  const proyecto = info.project.name
  duena = correoDePrueba(`duena-todos-${proyecto}`)
  asesora = correoDePrueba(`asesora-todos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Todos' })
  await crearPersona({ email: asesora, contrasena: CLAVE, nombre: 'Aida Todos', invitada: true })
  await darRolDePrueba({
    email: asesora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Todos ${proyecto}`, clave: `e2e_todos_${proyecto}` },
    permisos: [
      { clave: 'leads.ver', alcance: 'propios' },
      'leads.crear',
      { clave: 'leads.editar', alcance: 'propios' },
      'web.cola.participar',
    ],
  })
  asesoraId = sql(`select id from public.perfiles where email = ${literal(asesora)}`)
  sql(`update public.perfiles set whatsapp_web = '+59175550104' where id = ${literal(asesoraId)}`)
})

test.afterAll(async () => {
  quitarTurnos()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function entrar(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

// `cuantos` turnos asignados a la asesora, con vencimientos escalonados (el orden de la lista) y un código que los distingue.
function darTurnos(proyecto: string, desde: number, cuantos: number) {
  sql(`
    insert into public.solicitudes_contacto_web (codigo, token_visitante, usuario_id, estado, fuente, vence_en)
    select '#WEB-T${proyecto.slice(0, 1).toUpperCase()}' || lpad(g::text, 3, '0'),
           'e2etodos${proyecto}' || lpad(g::text, 3, '0'),
           ${literal(asesoraId)}, 'asignada', 'boton_general', now() + interval '2 hours' + g * interval '1 minute'
      from generate_series(${String(desde)}, ${String(desde + cuantos - 1)}) g`)
}

test('«Personas sin rol» en su tope lleva al equipo filtrado por «Sin rol»', async ({
  page,
}, info) => {
  for (let i = 1; i <= 6; i += 1) {
    await crearPersona({
      email: correoDePrueba(`sinrol-todos-${String(i)}-${info.project.name}`),
      contrasena: CLAVE,
      nombre: `Zzz Sin rol ${String(i)}`,
      invitada: true,
    })
  }
  await entrar(page, duena)
  const bloque = page.getByRole('region', { name: BLOQUE_SIN_ROL })
  await expect(bloque).toBeVisible()
  const verTodas = bloque.getByRole('link', { name: 'Ver todas' })
  await verTodas.scrollIntoViewIfNeeded()
  await capturar(page, info, 'inicio-sin-rol-en-el-tope')
  await verTodas.click()
  await expect(page).toHaveURL(/\/configuracion\/equipo\?estado=sin_rol/)
  await expect(page.getByRole('combobox', { name: 'Estado' })).toHaveValue('sin_rol')
  // La asesora tiene rol: no está en la lista; las seis sin rol sí (la lista trae hasta 100).
  await expect(page.getByText('Aida Todos', { exact: true })).toHaveCount(0)
  await expect(page.getByTitle('Zzz Sin rol 1')).toBeVisible()
  await capturar(page, info, 'equipo-sin-rol')
})

test('los turnos: sin tope no hay «Ver todos»; con tope abre el panel de a 20 con «Ver más»', async ({
  page,
}, info) => {
  const proyecto = info.project.name
  darTurnos(proyecto, 1, 2)
  await entrar(page, asesora)
  const bloque = page.getByRole('region', { name: BLOQUE_DE_TURNOS })
  await expect(bloque.getByRole('article')).toHaveCount(2)
  await expect(bloque.getByRole('link', { name: 'Ver todos' })).toHaveCount(0)
  await capturar(page, info, 'turnos-sin-tope')

  darTurnos(proyecto, 3, 23)
  await page.reload()
  await expect(bloque.getByRole('article')).toHaveCount(5)
  const verTodos = bloque.getByRole('link', { name: 'Ver todos' })
  await verTodos.scrollIntoViewIfNeeded()
  await capturar(page, info, 'turnos-en-el-tope')
  await verTodos.click()
  await expect(page).toHaveURL(/panel=turnos/)

  const panel = page.getByRole('dialog', { name: BLOQUE_DE_TURNOS })
  await expect(panel.getByRole('article')).toHaveCount(20)
  await capturar(page, info, 'panel-de-turnos')
  await panel.getByRole('button', { name: 'Ver más' }).click()
  await expect(panel.getByRole('article')).toHaveCount(25)
  await expect(panel.getByRole('button', { name: 'Ver más' })).toHaveCount(0)

  // «Contacté» en el panel saca ese turno de la lista sin soltar las páginas cargadas.
  await panel.getByRole('button', { name: 'Contacté' }).first().click()
  await expect(panel.getByRole('article')).toHaveCount(24)
})
