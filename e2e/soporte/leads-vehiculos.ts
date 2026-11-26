// El terreno de la sección «Vehículos» de la ficha del lead, en el Supabase LOCAL: el del inventario
// (Corea y Taiwán) más cuatro personas con leads y vehículos, y lo que se lee de la base para
// comprobar el vínculo y el interés sin pasar por la pantalla.
import type { Locator, Page } from '@playwright/test'
import { expect } from './prueba'
import {
  PREFIJO_ROL_E2E,
  admin,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  type PermisoDePrueba,
} from './base'
import { CLAVE, aLaVista, limpiarInventario, prepararInventario, type Terreno } from './inventario'
import { borrarLeadsDePrueba, crearLead, exigir, idDe, PREFIJO_DE_LEAD_E2E } from './leads'

export type TerrenoDeVehiculos = {
  inventario: Terreno
  // Asesoras con alcance «propios» en leads y en los vehículos de Corea.
  ada: string
  cora: string
  // Ve y edita todo (leads y los vehículos de Corea), sin tener los leads en su cartera.
  sol: string
  // Tiene sus leads, pero ningún permiso sobre vehículos: no ve la sección.
  lia: string
}

const ASESORA = (coreaId: string): PermisoDePrueba[] => [
  { clave: 'leads.ver', alcance: 'propios' },
  { clave: 'leads.editar', alcance: 'propios' },
  { clave: 'leads.compartir', alcance: 'propios' },
  { clave: 'leads.transferir', alcance: 'propios' },
  { clave: 'leads.eliminar', alcance: 'propios' },
  { clave: 'vehiculos.ver', origenId: coreaId, alcance: 'propios' },
  { clave: 'vehiculos.editar', origenId: coreaId, alcance: 'propios' },
]

async function persona(
  proyecto: string,
  corto: string,
  nombre: string,
  permisos: PermisoDePrueba[],
) {
  const email = correoDePrueba(`${corto}-vehiculos-lead-${proyecto}`)
  await crearPersona({ email, contrasena: CLAVE, nombre, invitada: true })
  await darRolDePrueba({
    email,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}${nombre} ${proyecto}`,
      clave: `e2e_${corto}_vehiculos_lead_${proyecto.replaceAll(/[^a-z0-9]/g, '_')}`,
    },
    permisos,
  })
  return email
}

export async function prepararVehiculosDelLead(proyecto: string): Promise<TerrenoDeVehiculos> {
  await borrarLeadsDePrueba()
  const inventario = await prepararInventario(proyecto)
  const corea = inventario.corea.id
  return {
    inventario,
    ada: await persona(proyecto, 'ada', 'Ada Vínculo', ASESORA(corea)),
    cora: await persona(proyecto, 'cora', 'Cora Vínculo', ASESORA(corea)),
    sol: await persona(proyecto, 'sol', 'Sol Supervisión', [
      { clave: 'leads.ver', alcance: 'todos' },
      { clave: 'leads.editar', alcance: 'todos' },
      { clave: 'vehiculos.ver', origenId: corea, alcance: 'todos' },
      { clave: 'vehiculos.editar', origenId: corea, alcance: 'todos' },
    ]),
    lia: await persona(proyecto, 'lia', 'Lia Sin Vehículos', [
      { clave: 'leads.ver', alcance: 'propios' },
      { clave: 'leads.editar', alcance: 'propios' },
    ]),
  }
}

export async function limpiarVehiculosDelLead(): Promise<void> {
  await borrarLeadsDePrueba()
  await limpiarInventario()
}

let telefono = Number(String(Date.now()).slice(-7))

// Un lead en la cartera de esa persona (dueña). Devuelve su id y el nombre como se ve.
export async function leadDe(
  email: string,
  nombre: string,
): Promise<{ id: string; nombre: string }> {
  telefono += 1
  const id = await crearLead({
    nombre,
    telefono: `5917${String(telefono).slice(-7)}`,
    deQuien: email,
  })
  return { id, nombre: `${PREFIJO_DE_LEAD_E2E}${nombre}` }
}

// Un vehículo de Corea creado por esa persona (con alcance «propios», es suyo).
export async function vehiculoDe(origenId: string, titulo: string, email: string): Promise<string> {
  const { data, error } = await admin()
    .from('vehiculos')
    .insert({ origen_id: origenId, titulo, creado_por: await idDe(email) })
    .select('id')
    .single<{ id: string }>()
  exigir(error, `cargar ${titulo}`)
  return data?.id ?? ''
}

export async function compartirCon(leadId: string, email: string, quien: string): Promise<void> {
  const { error } = await admin()
    .from('leads_asesores')
    .insert({
      lead_id: leadId,
      usuario_id: await idDe(email),
      tipo_acceso: 'compartido',
      compartido_por: await idDe(quien),
    })
  exigir(error, 'compartir el lead')
}

export async function numeroDe(vehiculoId: string): Promise<number> {
  const { data, error } = await admin()
    .from('vehiculos')
    .select('numero')
    .eq('id', vehiculoId)
    .single<{ numero: number }>()
  exigir(error, 'leer el número del vehículo')
  return data?.numero ?? 0
}

export async function leadDelVehiculo(vehiculoId: string): Promise<string | null> {
  const { data, error } = await admin()
    .from('vehiculos')
    .select('lead_id')
    .eq('id', vehiculoId)
    .single<{ lead_id: string | null }>()
  exigir(error, 'leer el vínculo')
  return data?.lead_id ?? null
}

// La nota del interés, o `undefined` si no hay interés.
export async function notaDelInteres(
  vehiculoId: string,
  leadId: string,
): Promise<string | null | undefined> {
  const { data, error } = await admin()
    .from('vehiculos_interesados')
    .select('nota')
    .eq('vehiculo_id', vehiculoId)
    .eq('lead_id', leadId)
    .maybeSingle<{ nota: string | null }>()
  exigir(error, 'leer el interés')
  return data === null ? undefined : data.nota
}

// `?seccion=vehiculos` lleva al bloque «Vehículos» de la ficha (el «Relacionados» del lead: «Vincular o marcar» en su título y, al pie, los
// anteriores plegados, el panel para vincular o marcar uno y la confirmación de desvincular).
export async function irAVehiculos(page: Page, leadId: string, consulta = ''): Promise<void> {
  await page.goto(`/leads/${leadId}?seccion=vehiculos${consulta}`)
  await expect(relacionadosDelLead(page)).toBeVisible()
}

// La región «Vehículos» (el «Relacionados» compacto del lead: el título con su acción y los grupos) y el bloque entero de la ficha (con la
// gestión al pie).
export const relacionadosDelLead = (page: Page): Locator =>
  aLaVista(page.getByRole('region', { name: 'Vehículos', exact: true }))
export const seccionVehiculos = (page: Page): Locator => aLaVista(page.locator('#relacionados'))
export const vinculados = (page: Page): Locator =>
  relacionadosDelLead(page).getByRole('region', { name: 'Vinculado', exact: true })
export const interesados = (page: Page): Locator =>
  relacionadosDelLead(page).getByRole('region', { name: 'Interesado', exact: true })
export const panelAgregar = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Agregar vehículo' })

// Una acción del «⋯» de la fila de un vehículo en un grupo de Relacionados («Desvincular», «Quitar interés»…).
export async function accionDeLaFila(
  grupo: Locator,
  titulo: string,
  accion: string,
): Promise<void> {
  await grupo.getByRole('button', { name: `Más acciones de ${titulo}` }).click()
  await grupo.page().getByRole('menuitem', { name: accion, exact: true }).click()
}

// «Vincular o marcar» del título del bloque «Vehículos». Un clic antes de hidratar se pierde: reintenta con tope corto y, en cada vuelta, mira
// primero si la URL ya pide el panel (un clic de más sumaría una entrada al historial y rompería «atrás»).
export async function abrirAgregarVehiculo(page: Page): Promise<Locator> {
  const panel = panelAgregar(page)
  // El de la vez anterior termina de cerrarse antes de abrirlo de nuevo.
  await expect(panel).toBeHidden()
  await expect(async () => {
    if (!/[?&]panel=agregar-vehiculo/.test(page.url())) {
      await botonVincularOMarcar(page).click({ timeout: 2000 })
    }
    await expect(page).toHaveURL(/[?&]panel=agregar-vehiculo/, { timeout: 2000 })
  }).toPass()
  await expect(panel).toBeVisible()
  return panel
}

// La única acción del título del bloque «Vehículos» (con la cartera y `leads.editar`).
export const botonVincularOMarcar = (page: Page): Locator =>
  relacionadosDelLead(page).getByRole('button', { name: 'Vincular o marcar', exact: true })

// «Ver los vínculos anteriores» al pie del bloque abre su drawer (`?panel=vinculos-anteriores`); devuelve la lista del drawer.
export const drawerDeAnteriores = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Vínculos anteriores' })
export async function abrirAnteriores(page: Page): Promise<Locator> {
  const boton = seccionVehiculos(page).getByRole('button', { name: 'Ver los vínculos anteriores' })
  await expect(async () => {
    if (!/[?&]panel=vinculos-anteriores/.test(page.url())) {
      await boton.click({ timeout: 2000 })
    }
    await expect(page).toHaveURL(/[?&]panel=vinculos-anteriores/, { timeout: 2000 })
  }).toPass()
  await expect(drawerDeAnteriores(page)).toBeVisible()
  return drawerDeAnteriores(page).getByRole('list', { name: 'Vínculos anteriores' })
}

// Abre «Vincular o marcar un vehículo», busca y elige uno.
export async function elegirVehiculo(page: Page, titulo: string): Promise<Locator> {
  const panel = await abrirAgregarVehiculo(page)
  await expect(panel).toBeVisible()
  await panel.getByLabel('Buscar por título, VIN, lote o número').fill(titulo)
  await panel.getByRole('radio', { name: new RegExp(titulo) }).check()
  return panel
}

// El vehículo de los seguimientos o recordatorios de un lead con ese título.
export async function vehiculoDeLaNota(
  tabla: 'seguimientos' | 'recordatorios',
  leadId: string,
  titulo: string,
): Promise<string | null> {
  const { data, error } = await admin()
    .from(tabla)
    .select('vehiculo_id')
    .eq('lead_id', leadId)
    .eq('titulo', titulo)
    .single<{ vehiculo_id: string | null }>()
  exigir(error, `leer el vehículo de «${titulo}»`)
  return data?.vehiculo_id ?? null
}
