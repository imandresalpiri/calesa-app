import { MapPinIcon, ShieldCheckIcon, UsersRoundIcon, type LucideIcon } from 'lucide-react'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { destinosDeLaSeccion, type DestinoDelNavegador } from './destinos-de-busqueda'
import { SECCION_DE_COLA_WEB } from './cola-web/seccion'
import { SECCION_DE_EMPRESA } from './empresa/seccion'
import { SECCION_DE_LEADS } from './leads/seccion'
import { SECCION_DE_MODO_LIVE } from './modo-live/seccion'
import { PERMISOS_DE_ORIGENES } from './origenes/acceso'
import { SECCION_DE_WEB } from './web/seccion'

// El registro de Configuración: la única fuente del inicio, del menú de Configuración y del selector de sección del celular. Cada
// sección se abre con cualquiera de sus permisos (ver o gestionar) y pertenece a un grupo; sus sub-secciones son las sub-rutas que
// registra cada página (se suman aquí, con su `page.tsx`). secciones.test.ts falla si una ruta o sub-ruta no tiene su `page.tsx` (o, la
// raíz que sólo redirige, su `route.ts`). La sub-sección índice vive en la ruta de su sección (la que abre la sección); las demás, debajo.
// Los orígenes no son sub-secciones fijas: el menú suma uno por origen que la persona abre (`_navegacion/grupos-de-quien-mira.ts`).

// Los grupos de Configuración, en el orden en que se dibujan. No: «área» (es otra cosa en el glosario).
export const GRUPOS = [
  { clave: 'empresa-y-equipo', titulo: 'Empresa y equipo' },
  { clave: 'ventas', titulo: 'Ventas' },
  { clave: 'web', titulo: 'Web' },
] as const

export type GrupoDeConfiguracion = (typeof GRUPOS)[number]['clave']

export type SubseccionDeConfiguracion = {
  clave: string
  titulo: string
  // Una frase: qué se configura ahí. La dibuja la página con su título (`EncabezadoDeConfiguracion`); no viaja al navegador.
  descripcion: string
  // Lo que la persona escribiría para buscarla además de su título («logo, colores» en Datos de la empresa): el buscador de Configuración
  // las lee, sin distinguir acentos ni mayúsculas.
  palabras?: readonly string[]
  // La de su sección (la índice) o la de su sección, una barra y algo más.
  ruta: string
  permisos: readonly ClavePermiso[]
  // Con motivo, quien no tiene sus permisos la ve apagada en el menú y en el selector, con el motivo; sin él, no la ve.
  motivoSinPermiso?: string
  // El rótulo que agrupa sub-secciones seguidas en el menú (ninguna sección lo usa hoy).
  grupo?: string
}

// Una sub-sección como la ve la persona: abierta, o apagada (sin permiso y con motivo).
export type SubseccionVisible = SubseccionDeConfiguracion & { apagada?: true }

export type SeccionVisible = Omit<SeccionDeConfiguracion, 'subsecciones'> & {
  subsecciones: readonly SubseccionVisible[]
  // Lo que el buscador encuentra de ella y no es una sub-sección (`destinos-de-busqueda.ts`): sólo si tiene alguno.
  destinos?: readonly DestinoDelNavegador[]
}

export type SeccionDeConfiguracion = {
  clave: string
  titulo: string
  // Una frase: qué se configura ahí.
  descripcion: string
  // Lo que la persona escribiría para buscarla además de su título; las de sus sub-secciones, aparte.
  palabras?: readonly string[]
  ruta: string
  Icono: LucideIcon
  permisos: readonly ClavePermiso[]
  grupo: GrupoDeConfiguracion
  subsecciones: readonly SubseccionDeConfiguracion[]
}

export const SECCIONES = [
  SECCION_DE_EMPRESA,
  {
    clave: 'equipo',
    titulo: 'Equipo',
    descripcion: 'Las personas, sus roles, las invitaciones, el bloqueo y la baja.',
    palabras: [
      'personas',
      'usuarios',
      'invitar',
      'invitación',
      'bloquear',
      'baja',
      'correo',
      'miembros',
    ],
    ruta: RUTAS.equipo,
    Icono: UsersRoundIcon,
    permisos: ['equipo.usuarios.ver', 'equipo.usuarios.gestionar'],
    grupo: 'empresa-y-equipo',
    subsecciones: [],
  },
  {
    clave: 'roles',
    titulo: 'Roles y permisos',
    descripcion: 'Qué puede hacer cada rol, por origen y con qué alcance.',
    palabras: ['permisos', 'accesos', 'quién puede', 'matriz', 'concesión'],
    ruta: RUTAS.roles,
    Icono: ShieldCheckIcon,
    permisos: ['equipo.roles.ver', 'equipo.roles.gestionar'],
    grupo: 'empresa-y-equipo',
    subsecciones: [],
  },
  SECCION_DE_MODO_LIVE,
  SECCION_DE_LEADS,
  {
    clave: 'origenes',
    titulo: 'Orígenes',
    descripcion:
      'De dónde vienen los vehículos: sus datos, campos y categorías, su flujo, su fórmula y sus tablas.',
    palabras: [
      'país',
      'subasta',
      'usa',
      'china',
      'campos',
      'categorías',
      'vehículos',
      'tipo',
      'fórmula',
      'flujo',
      'fases',
      'tablas',
      'hoja',
      'tarjeta',
    ],
    ruta: RUTAS.origenes,
    Icono: MapPinIcon,
    permisos: PERMISOS_DE_ORIGENES,
    grupo: 'ventas',
    subsecciones: [],
  },
  SECCION_DE_WEB,
  SECCION_DE_COLA_WEB,
] as const satisfies readonly SeccionDeConfiguracion[]

// El ícono de cada sección por su clave: el menú lo dibuja en el servidor (una función no cruza al navegador).
export const ICONO_DE_SECCION: Readonly<Record<string, LucideIcon>> = Object.fromEntries(
  SECCIONES.map((seccion: SeccionDeConfiguracion) => [seccion.clave, seccion.Icono]),
)

function puedeAbrir(permisos: Permisos, claves: readonly ClavePermiso[]): boolean {
  return claves.some((clave) => puede(permisos, clave))
}

// La sección con las sub-secciones que la persona puede abrir y, apagadas, las que no puede pero declaran su motivo.
export function conSubseccionesVisibles(
  seccion: SeccionDeConfiguracion,
  permisos: Permisos,
): SeccionVisible {
  const destinos = destinosDeLaSeccion(seccion.clave, permisos)
  return {
    ...seccion,
    subsecciones: seccion.subsecciones.flatMap((sub): SubseccionVisible[] => {
      if (puedeAbrir(permisos, sub.permisos)) {
        return [sub]
      }
      return sub.motivoSinPermiso === undefined ? [] : [{ ...sub, apagada: true }]
    }),
    ...(destinos.length === 0 ? {} : { destinos }),
  }
}

// La ruta de la primera sub-sección que la persona puede abrir: adonde va la URL de una que no puede. null si no hay ninguna.
export function primeraSubseccionAbierta(
  seccion: SeccionDeConfiguracion,
  permisos: Permisos,
): string | null {
  return seccion.subsecciones.find((sub) => puedeAbrir(permisos, sub.permisos))?.ruta ?? null
}

// Las secciones que la persona puede abrir, cada una con sólo las sub-secciones que también puede abrir.
export function seccionesVisibles(permisos: Permisos): SeccionVisible[] {
  return SECCIONES.filter((seccion: SeccionDeConfiguracion) =>
    puedeAbrir(permisos, seccion.permisos),
  ).map((seccion: SeccionDeConfiguracion) => conSubseccionesVisibles(seccion, permisos))
}

export type GrupoVisible = {
  clave: GrupoDeConfiguracion
  titulo: string
  secciones: SeccionVisible[]
}

// Las secciones que la persona puede abrir, por grupo y en el orden de `GRUPOS`; un grupo sin ninguna no figura.
export function gruposVisibles(permisos: Permisos): GrupoVisible[] {
  const visibles = seccionesVisibles(permisos)
  return GRUPOS.map(({ clave, titulo }) => ({
    clave,
    titulo,
    secciones: visibles.filter((seccion) => seccion.grupo === clave),
  })).filter((grupo) => grupo.secciones.length > 0)
}

// Lo que el menú y el selector mandan al navegador: sólo lo que dibujan (sin el icono, que es una función, ni los permisos). Viaja en
// el HTML de cada página de Configuración.
export type SubseccionDelNavegador = {
  clave: string
  titulo: string
  ruta: string
  // El prefijo con que se marca en el menú, si no es su ruta: un origen abre su pestaña Datos y se marca en todas (`/configuracion/origenes/<id>`).
  marca?: string
  motivo?: string
  grupo?: string
  palabras?: readonly string[]
}

export type GrupoDelNavegador = {
  clave: string
  titulo: string
  secciones: {
    clave: string
    titulo: string
    ruta: string
    // Sólo si la sección las declara.
    palabras?: readonly string[]
    // `motivo`, sólo en la apagada; `grupo` y `palabras`, sólo si la sub-sección los declara.
    subsecciones: SubseccionDelNavegador[]
    // Lo que el buscador encuentra y el menú no dibuja (`destinos-de-busqueda.ts`), sólo si la sección lo tiene.
    destinos?: readonly DestinoDelNavegador[]
  }[]
}

export function paraElNavegador(grupos: readonly GrupoVisible[]): GrupoDelNavegador[] {
  return grupos.map((grupo) => ({
    clave: grupo.clave,
    titulo: grupo.titulo,
    secciones: grupo.secciones.map((seccion) => ({
      clave: seccion.clave,
      titulo: seccion.titulo,
      ruta: seccion.ruta,
      ...(seccion.palabras === undefined ? {} : { palabras: seccion.palabras }),
      ...(seccion.destinos === undefined ? {} : { destinos: seccion.destinos }),
      subsecciones: seccion.subsecciones.map((sub) => ({
        clave: sub.clave,
        titulo: sub.titulo,
        ruta: sub.ruta,
        ...(sub.apagada && sub.motivoSinPermiso !== undefined
          ? { motivo: sub.motivoSinPermiso }
          : {}),
        ...(sub.grupo === undefined ? {} : { grupo: sub.grupo }),
        ...(sub.palabras === undefined ? {} : { palabras: sub.palabras }),
      })),
    })),
  }))
}
