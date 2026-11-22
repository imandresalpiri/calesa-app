// La bandeja de inicio: lo que hay que hacer ahora, en bloques. Cada bloque se muestra sólo si la
// persona tiene alguno de sus permisos: la bandeja se arma por permisos, nunca por nombre de rol.
// Cada bloque tiene su archivo en `features/bandeja/bloques/<clave>.tsx`: el módulo que lo cuenta lo llena.
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'

export type BloqueBandeja = {
  clave: string
  titulo: string
  // Qué va a aparecer acá y qué lo hace aparecer: es el texto del bloque mientras está vacío.
  vacio: string
  // Alcanza con tener uno.
  permisos: readonly ClavePermiso[]
  // El texto de «Ver todos» del bloque, según el género de lo que lista: «Ver todos» (leads, turnos, vehículos, documentos, recordatorios, repuestos) o
  // «Ver todas» (personas, tareas, alertas, esperas). Se dibuja sólo cuando el bloque llega a su tope.
  verTodos: 'Ver todos' | 'Ver todas'
}

export const BLOQUES_BANDEJA = [
  {
    clave: 'recordatorios',
    titulo: 'Recordatorios de hoy',
    vacio: 'Sin recordatorios para hoy. Aparecen acá los que vencen en el día.',
    permisos: ['leads.ver'],
    verTodos: 'Ver todos',
  },
  {
    clave: 'leads-sin-seguimiento',
    titulo: 'Leads sin seguimiento',
    vacio: 'Ningún lead espera seguimiento. Aparecen acá los que quedan sin contacto.',
    permisos: ['leads.ver'],
    verTodos: 'Ver todos',
  },
  {
    clave: 'turnos-web',
    titulo: 'Turnos de la web sin confirmar',
    vacio: 'Sin turnos pendientes. Aparecen acá cuando alguien pide un asesor desde la web.',
    permisos: ['leads.crear', 'web.cola.gestionar'],
    verTodos: 'Ver todos',
  },
  {
    clave: 'vehiculos-trabados',
    titulo: 'Vehículos trabados',
    vacio: 'Ningún vehículo trabado. Aparecen acá los que no pueden pasar de fase y por qué.',
    permisos: ['logistica.ver'],
    verTodos: 'Ver todos',
  },
  {
    clave: 'documentos-por-aprobar',
    titulo: 'Documentos por aprobar',
    vacio: 'Sin documentos por aprobar. Aparecen acá los que alguien subió y esperan revisión.',
    // Sólo los de vehículos (`bandeja_por_aprobar`): quien sólo aprueba documentos de repuestos no tiene qué ver acá (`docs/PENDIENTES.md`).
    permisos: ['logistica.documentos.aprobar'],
    verTodos: 'Ver todos',
  },
  {
    clave: 'alertas-demora',
    titulo: 'Alertas por demora',
    vacio: 'Sin demoras. Aparecen acá las unidades que llevan más días de lo esperado en su fase.',
    permisos: ['logistica.ver'],
    verTodos: 'Ver todas',
  },
  {
    clave: 'repuestos-por-mover',
    titulo: 'Repuestos por mover',
    vacio: 'Sin repuestos por mover. Aparecen acá los ítems listos para pasar de fase.',
    permisos: ['repuestos.mover'],
    verTodos: 'Ver todos',
  },
  {
    clave: 'esperas-repuestos',
    titulo: 'Esperas que destraban vehículos',
    vacio: 'Ningún vehículo espera repuestos. Aparecen acá los que dependen de un ítem.',
    permisos: ['repuestos.ver'],
    verTodos: 'Ver todas',
  },
  {
    clave: 'tareas',
    titulo: 'Mis tareas',
    vacio: 'Sin tareas pendientes. Aparecen acá las que te asignan y las que te pones.',
    permisos: ['agenda.tareas.recibir'],
    verTodos: 'Ver todas',
  },
  {
    clave: 'equipo-sin-rol',
    titulo: 'Personas sin rol',
    vacio: 'Todas las personas del equipo tienen rol. Aparecen acá las que esperan uno.',
    permisos: ['equipo.usuarios.gestionar'],
    verTodos: 'Ver todas',
  },
] as const satisfies readonly BloqueBandeja[]

export type BloqueDelCatalogo = (typeof BLOQUES_BANDEJA)[number]
export type ClaveDeBloque = BloqueDelCatalogo['clave']

// Cada bloque pide `TOPE_DE_BLOQUE + 1` filas y muestra hasta `TOPE_DE_BLOQUE`: el número que dice es «5» o «más de 5», nunca un total.
export const TOPE_DE_BLOQUE = 5

// Un bloque del catálogo por su clave, si quien mira lo ve (el panel «Ver todos» de los turnos usa su título y su frase de vacío).
export function bloqueVisible(permisos: Permisos, clave: ClaveDeBloque): BloqueDelCatalogo | null {
  return bloquesVisibles(permisos).find((bloque) => bloque.clave === clave) ?? null
}

export function bloquesVisibles(permisos: Permisos): BloqueDelCatalogo[] {
  return BLOQUES_BANDEJA.filter((bloque) => bloque.permisos.some((clave) => puede(permisos, clave)))
}
