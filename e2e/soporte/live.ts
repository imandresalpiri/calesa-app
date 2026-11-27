import { expect, type Page } from '@playwright/test'
import { CONTRASENA } from './alta'
import { correoDePrueba, crearPersona } from './base'
import { literal, sql } from './sql'

// El interruptor del Modo Live de la barra superior (sólo con «Puede encender el Modo Live»).
export const interruptorDelLive = (page: Page) =>
  page.getByRole('button', { name: 'Modo Live: ocultar los símbolos de moneda' }).first()

// Encender el Live desde la barra: escribe la cookie y el servidor vuelve a dibujar (`main[data-live]` lo dice).
export async function encenderElLive(page: Page): Promise<void> {
  await interruptorDelLive(page).click()
  await expect(page.locator('html')).toHaveClass(/\blive\b/)
  await expect(page.locator('main[data-live="encendido"]')).toBeVisible()
}

// Una persona del equipo con un rol que ya existe, lista para ingresar (invitada y con la invitación aceptada).
export async function personaConRol(
  etiqueta: string,
  nombre: string,
  rolId: string,
): Promise<{ id: string; email: string; nombre: string }> {
  const email = correoDePrueba(etiqueta)
  await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
  const id = sql(
    `update public.perfiles set invitacion_aceptada_en = now() where email = ${literal(email)} returning id`,
  )
  sql(
    `insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (${literal(id)}::uuid, ${literal(rolId)}::uuid, true)`,
  )
  return { id, email, nombre }
}

// Un rol de prueba («E2E …», lo borra `borrarRolesDePrueba()`) con sus permisos para todos los orígenes.
export function rolDePrueba(nombre: string, clave: string, permisos: readonly string[]): string {
  const id = sql(
    `insert into public.roles (nombre, clave) values (${literal(nombre)}, ${literal(clave)}) returning id`,
  )
  for (const permiso of permisos) {
    sql(
      `insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (${literal(id)}::uuid, ${literal(permiso)}, null, 'todos')`,
    )
  }
  return id
}
