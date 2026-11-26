// Lo que los casos de uso de `features/` necesitan de afuera, dicho como interfaces. La
// implementación (Supabase) vive en `infra/` y se la entrega `composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { GrupoDeCampos, Rango } from '@/shared/lib/campos'
import type { CatalogoLeido, DestinoAlQuitar } from '@/shared/lib/catalogo'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { CambiosDeCampo } from './cambios-de-campo'
import type {
  CampoDeLayout,
  CampoPrincipal,
  OpcionDeCampo,
  TipoDeCampo,
  ValorDefecto,
} from './campo'
import type { DatoClave, DatoClaveResuelto } from './datos-clave'
import type { DatoNuevoDeApibara } from './datos-nuevos-de-apibara'
import type { Categoria } from './categoria'
import type { ImpactoDeCampo } from './impacto'
import type { Genero, OrigenConUso, TipoDeOrigen } from './origen'

// Toda edición manda la versión que tenía en pantalla quien edita; la base responde `conflicto`
// si otra persona lo cambió, y devuelve la versión nueva para seguir editando sin recargar.
type Editado = { actualizadoEn: string }
type Creado = { id: string; actualizadoEn: string }

export type RepositorioOrigenes = {
  crear: (nuevo: {
    clave: string
    nombre: string
    sustantivo: string
    genero: Genero
    tipo: TipoDeOrigen
    color?: string
    apibaraPlataformas?: string[]
  }) => Promise<Resultado<Creado>>
  // Lo que viene `undefined` no se toca. El tipo y la clave no se editan.
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    nombre?: string
    sustantivo?: string
    genero?: Genero
    color?: string
    activo?: boolean
    apibaraPlataformas?: string[]
  }) => Promise<Resultado<Editado>>
  eliminar: (pedido: { id: string; actualizadoEnEsperado: string }) => Promise<Resultado<null>>
  // La lista entera de datos clave, con la versión del origen; devuelve la versión nueva.
  guardarDatosClave: (pedido: {
    origenId: string
    datos: readonly DatoClave[]
    actualizadoEnEsperado: string
  }) => Promise<Resultado<Editado>>
}

export type RepositorioCampos = {
  crear: (nuevo: {
    origenId: string
    clave: string
    etiqueta: string
    tipo: TipoDeCampo
    opciones: OpcionDeCampo[]
    requerido: boolean
    grupoId: string | null
    enTarjeta: boolean
    filtrable: boolean
    publicoWeb: boolean
    claveApibara: string | null
    valorDefecto: ValorDefecto | null
    // Marcarlo desmarca el principal anterior del origen (en la misma llamada).
    principal: boolean
    minimo: number | null
    maximo: number | null
  }) => Promise<Resultado<Creado>>
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    cambios: CambiosDeCampo
  }) => Promise<Resultado<Editado>>
  // «Después de X»; null = primero.
  mover: (pedido: {
    id: string
    despuesDe: string | null
    actualizadoEnEsperado: string
  }) => Promise<Resultado<Editado>>
  eliminar: (pedido: { id: string; actualizadoEnEsperado: string }) => Promise<Resultado<null>>
  // Con `rango`, también cuántos quedarían fuera del rango propuesto.
  impacto: (id: string, rango?: Partial<Rango>) => Promise<Resultado<ImpactoDeCampo>>
  // Un campo por cada dato nuevo que trajo apibara (por su ruta). Devuelve cuántos nacieron.
  agregarDeApibara: (pedido: {
    origenId: string
    rutas: readonly string[]
  }) => Promise<Resultado<{ agregados: number }>>
}

export type RepositorioCategorias = {
  crear: (nueva: {
    origenId: string
    nombre: string
    padreId: string | null
  }) => Promise<Resultado<Creado>>
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    nombre?: string
    activa?: boolean
  }) => Promise<Resultado<Editado>>
  mover: (pedido: {
    id: string
    despuesDe: string | null
    actualizadoEnEsperado: string
  }) => Promise<Resultado<Editado>>
  eliminar: (pedido: { id: string; actualizadoEnEsperado: string }) => Promise<Resultado<null>>
}

export type LayoutDeOrigen = { campos: CampoDeLayout[]; categorias: Categoria[] }

// Todos, también los inactivos: es lo que edita la pantalla.
export type LectorDeOrigenes = () => Promise<Resultado<OrigenConUso[]>>
// `conUso` pide contar vehículos por categoría: sólo quien gestiona orígenes puede.
export type LectorDeLayout = (
  origenId: string,
  opciones: { conUso: boolean },
) => Promise<Resultado<LayoutDeOrigen>>

// Lo que apibara trajo para los vehículos de un origen de subasta y el origen no tiene como campo.
export type LectorDeDatosNuevos = (origenId: string) => Promise<Resultado<DatoNuevoDeApibara[]>>

// Los datos clave de un origen resueltos para la ficha del vehículo: con su etiqueta y de dónde sale cada uno; vacía = los de fábrica.
export type LectorDeDatosClave = (origenId: string) => Promise<Resultado<DatoClaveResuelto[]>>

// El campo principal activo de un origen, o null si no tiene: con qué se nombra a sus vehículos (6.13).
export type LectorDeCampoPrincipal = (origenId: string) => Promise<Resultado<CampoPrincipal | null>>

// El catálogo de grupos de campos de un origen (docs/GLOSARIO.md › Grupo de campos), con su tope.
export type LectorDeGruposDelOrigen = (origenId: string) => Promise<Resultado<CatalogoLeido>>

// Una edición de un grupo del origen, con la versión que se vio (`PT409` si otra persona lo cambió).
type EdicionDeGrupo<Datos> = { origenId: string; id: string; actualizadoEnEsperado: string } & Datos

// Los rechazos de un dato llegan en `porCampo` (`rechazoDelCatalogo()`): `nombre`, `items` (tiene campos) o `destino`.
export type RepositorioDeGruposDelOrigen = {
  // Nace al final del catálogo del origen; un nombre que ya existe ahí con otra escritura es `duplicado` («Ya existe «X».»).
  crear: (origenId: string, nombre: string) => Promise<ResultadoDeAccion<GrupoDeCampos>>
  // Renombrar (cambia el nombre en todos sus campos) o activar y desactivar. Devuelve la versión nueva.
  guardar: (
    pedido: EdicionDeGrupo<{ cambios: { nombre?: string; activo?: boolean } }>,
  ) => Promise<ResultadoDeAccion<string>>
  // El orden de los bloques: después de `despuesDe` (nulo, primero).
  mover: (
    pedido: EdicionDeGrupo<{ despuesDe: string | null }>,
  ) => Promise<ResultadoDeAccion<string>>
  // Sólo sin campos; con `mover`, sus campos van antes al final del destino (un grupo activo del mismo origen o ninguno).
  quitar: (pedido: EdicionDeGrupo<{ destino: DestinoAlQuitar }>) => Promise<ResultadoDeAccion<null>>
}
