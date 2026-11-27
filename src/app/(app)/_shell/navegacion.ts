// La navegación completa de la app (docs/UX.md › Pantallas), con el permiso que exige cada
// entrada. Se declara entera desde ya; lo que todavía no tiene pantalla no se muestra: ningún
// enlace lleva a un 404. `navegacion.test.ts` compara `disponible` con las rutas que existen en
// disco, así que quien agrega una pantalla tiene que prender su entrada (y viceversa).
import {
  ActivityIcon,
  BoxesIcon,
  CalculatorIcon,
  CalendarDaysIcon,
  CarFrontIcon,
  ChartColumnIcon,
  DatabaseIcon,
  HouseIcon,
  MessagesSquareIcon,
  RouteIcon,
  SettingsIcon,
  UserRoundIcon,
  UsersRoundIcon,
  type LucideIcon,
} from 'lucide-react'
import {
  seOcultaEnElLive,
  type AreaDelLive,
  type EstadoDelLive,
} from '@/modules/equipo/shell.client'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'

export type ZonaNav =
  // La barra lateral: hasta 7 entradas de trabajo diario (más Repuestos, sólo con permiso).
  | 'principal'
  // El menú del usuario: lo que se visita de vez en cuando.
  | 'usuario'

export type EntradaNav = {
  clave: string
  titulo: string
  ruta: string
  Icono: LucideIcon
  zona: ZonaNav
  // null = cualquiera con sesión. Si no, alcanza con tener uno (en cualquier origen).
  permisos: readonly ClavePermiso[] | null
  // Existe su `page.tsx`.
  disponible: boolean
  // Con el Modo Live encendido se ve sólo si sus ajustes muestran esta área (`seOcultaEnElLive`).
  enElLive: AreaDelLive
}

export const NAVEGACION = [
  {
    clave: 'inicio',
    titulo: 'Inicio',
    ruta: '/',
    Icono: HouseIcon,
    zona: 'principal',
    permisos: null,
    disponible: true,
    enElLive: 'inicio',
  },
  {
    clave: 'leads',
    titulo: 'Leads',
    ruta: '/leads',
    Icono: UsersRoundIcon,
    zona: 'principal',
    permisos: ['leads.ver'],
    disponible: true,
    enElLive: 'clientes',
  },
  {
    clave: 'vehiculos',
    titulo: 'Vehículos',
    ruta: '/vehiculos',
    Icono: CarFrontIcon,
    zona: 'principal',
    permisos: ['vehiculos.ver'],
    disponible: true,
    enElLive: 'vehiculos',
  },
  {
    clave: 'cotizaciones',
    titulo: 'Cotizaciones',
    ruta: '/cotizaciones',
    Icono: CalculatorIcon,
    zona: 'principal',
    permisos: ['cotizaciones.ver'],
    disponible: true,
    enElLive: 'cotizaciones',
  },
  {
    clave: 'logistica',
    titulo: 'Logística',
    ruta: '/logistica',
    Icono: RouteIcon,
    zona: 'principal',
    permisos: ['logistica.ver'],
    disponible: true,
    enElLive: 'logistica.cadena',
  },
  {
    clave: 'repuestos',
    titulo: 'Repuestos',
    ruta: '/repuestos',
    Icono: BoxesIcon,
    zona: 'principal',
    permisos: ['repuestos.ver'],
    disponible: true,
    enElLive: 'repuestos.estadisticas',
  },
  {
    clave: 'agenda',
    titulo: 'Agenda',
    ruta: '/agenda',
    Icono: CalendarDaysIcon,
    zona: 'principal',
    permisos: null,
    disponible: true,
    enElLive: 'siempre-oculto',
  },
  {
    clave: 'chat',
    titulo: 'Chat',
    ruta: '/chat',
    Icono: MessagesSquareIcon,
    zona: 'principal',
    permisos: ['chat.participar'],
    disponible: true,
    enElLive: 'siempre-oculto',
  },
  {
    clave: 'perfil',
    titulo: 'Mi perfil',
    ruta: '/perfil',
    Icono: UserRoundIcon,
    zona: 'usuario',
    permisos: null,
    disponible: true,
    enElLive: 'siempre-oculto',
  },
  {
    clave: 'tablero',
    titulo: 'Tablero',
    ruta: '/tablero',
    Icono: ChartColumnIcon,
    zona: 'usuario',
    permisos: ['tablero.metricas.ver'],
    disponible: true,
    enElLive: 'tablero',
  },
  {
    clave: 'configuracion',
    titulo: 'Configuración',
    ruta: '/configuracion/inicio',
    Icono: SettingsIcon,
    zona: 'usuario',
    // El hub se abre con el permiso de cualquiera de sus secciones.
    permisos: [
      'equipo.usuarios.ver',
      'equipo.usuarios.gestionar',
      'equipo.roles.ver',
      'equipo.roles.gestionar',
      'live.configurar',
      'empresa.ajustes.gestionar',
      'empresa.tipos_cambio.gestionar',
      'origenes.gestionar',
      'leads.campos.gestionar',
      'leads.configurar',
      'cotizaciones.configurar',
      'flujos.configurar',
      'logistica.catalogos.gestionar',
      'repuestos.configurar',
      'web.ajustes.gestionar',
      'web.contenido.gestionar',
      'web.cola.gestionar',
      'live.configurar',
    ],
    disponible: true,
    enElLive: 'origenes.lectura',
  },
  {
    clave: 'actividad',
    titulo: 'Actividad',
    ruta: '/actividad',
    Icono: ActivityIcon,
    zona: 'usuario',
    permisos: ['actividad.ver'],
    disponible: true,
    enElLive: 'siempre-oculto',
  },
  {
    clave: 'datos',
    titulo: 'Datos',
    ruta: '/datos',
    Icono: DatabaseIcon,
    zona: 'usuario',
    // Cada persona exporta e importa lo suyo; «todo» lo decide la pantalla con `datos.*.todo`.
    permisos: null,
    disponible: true,
    enElLive: 'siempre-oculto',
  },
] as const satisfies readonly EntradaNav[]

// Lo que esta persona ve en una zona: la entrada tiene pantalla, ella tiene el permiso y, con el Modo Live encendido, sus ajustes la muestran.
export function entradasVisibles(
  permisos: Permisos,
  zona: ZonaNav,
  live: EstadoDelLive,
): EntradaNav[] {
  return NAVEGACION.filter(
    (entrada: EntradaNav) =>
      entrada.zona === zona &&
      entrada.disponible &&
      !seOcultaEnElLive(live, entrada.enElLive) &&
      (entrada.permisos === null || entrada.permisos.some((clave) => puede(permisos, clave))),
  )
}

// La entrada a la que pertenece una ruta: `/leads/123` es de Leads; `/` sólo es Inicio.
export function estaEn(rutaActual: string, rutaDeLaEntrada: string): boolean {
  if (rutaDeLaEntrada === '/') {
    return rutaActual === '/'
  }
  return rutaActual === rutaDeLaEntrada || rutaActual.startsWith(`${rutaDeLaEntrada}/`)
}
