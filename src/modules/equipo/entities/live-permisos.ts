// Con el Live encendido, los permisos que dibujan las pantallas se recortan a lo que dejan ver sus ajustes, como con «Ver como»: el menú,
// «Nuevo», el alta de lead, el chat, las secciones de Configuración y los enlaces se apagan solos. Es una red de seguridad: cada página
// además se guarda con `ocultoEnElLive()`. Las Server Actions, la RLS y las RPC siguen usando los permisos reales.
import {
  moduloDe,
  type ClavePermiso,
  type Concesion,
  type ModuloPermiso,
  type Permisos,
} from '@/shared/lib/permisos'
import type { AjustesDelLive } from './live'

// Los que se reparten por origen cuando el Live muestra sólo algunos.
function vaPorOrigen(clave: ClavePermiso): boolean {
  const modulo = moduloDe(clave)
  return modulo === 'vehiculos' || modulo === 'cotizaciones' || clave === 'logistica.ver'
}

type Regla = (clave: ClavePermiso, ajustes: AjustesDelLive) => boolean

const NUNCA: Regla = () => false

// Por módulo, qué concesiones quedan. Equipo, empresa, orígenes, flujos, agenda, chat, notificaciones, actividad, web, datos y el Live
// mismo: siempre ocultos.
const REGLAS: Record<ModuloPermiso, Regla> = {
  vehiculos: (_, a) => a.vehiculos,
  cotizaciones: (clave, a) =>
    a.cotizaciones && (clave !== 'cotizaciones.configurar' || a.origenesConfig === 'lectura'),
  // Artes vive con las cotizaciones (`/artes` se oculta con ellas).
  artes: (_, a) => a.cotizaciones,
  leads: (_, a) => a.clientes === 'completo',
  logistica: (clave, a) => clave === 'logistica.ver' && a.logistica === 'cadena',
  repuestos: (clave, a) => clave === 'repuestos.ver' && a.repuestos === 'estadisticas',
  tablero: (_, a) => a.inicio,
  equipo: NUNCA,
  empresa: NUNCA,
  origenes: NUNCA,
  flujos: NUNCA,
  agenda: NUNCA,
  chat: NUNCA,
  notificaciones: NUNCA,
  actividad: NUNCA,
  web: NUNCA,
  datos: NUNCA,
  live: NUNCA,
}

function quedaEnElLive(clave: ClavePermiso, ajustes: AjustesDelLive): boolean {
  return REGLAS[moduloDe(clave)](clave, ajustes)
}

export function permisosDelLive(permisos: Permisos, ajustes: AjustesDelLive): Permisos {
  const origenes = ajustes.origenes
  const recortados: Concesion[] = []
  for (const concesion of permisos) {
    if (!quedaEnElLive(concesion.clave, ajustes)) {
      continue
    }
    if (origenes === 'todos' || !vaPorOrigen(concesion.clave)) {
      recortados.push(concesion)
    } else if (concesion.origenId === null) {
      // «En todos los orígenes»: una por cada origen que el Live deja ver.
      for (const origenId of origenes) {
        recortados.push({ ...concesion, origenId })
      }
    } else if (origenes.includes(concesion.origenId)) {
      recortados.push(concesion)
    }
  }
  return recortados
}
