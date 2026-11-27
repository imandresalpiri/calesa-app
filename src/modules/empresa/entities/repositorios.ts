// Lo que los casos de uso de `features/` necesitan de afuera, dicho como interfaces. La
// implementación (Supabase) vive en `infra/` y se la entrega `composicion.ts`.
import type { ConteoAcotado } from '@/shared/lib/conteo'
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { AjustesDeCotizacion } from './ajustes-de-cotizacion'
import type { LeyendaDeTiposCambio, ParaCompartir } from './compartir-tipos-cambio'
import type { AjustesEmpresa, CambiosDeAjustes } from './ajustes-empresa'
import type { CamposDeEnlace, Direccion, ListaDeEnlacesDeLaEmpresa } from './enlaces-de-ayuda'
import type { ListaDeLogos, UsosDelLogo } from './logos'
import type { ClaveIntegracion, Integracion } from './integraciones'
import type { UsosDelMes } from './asistente-ia/usos'
import type { ElementoAGuardar, MisEnlacesLeidos } from './mis-enlaces-de-ayuda'
import type { CambioDeValor, Moneda, TipoCambio } from './tipos-cambio'
import type { TipoCambioVigente, UltimoCambio } from './tipos-cambio-vigentes'

// Toda edición manda la versión que tenía en pantalla quien edita; la base responde `conflicto`
// si otra persona lo cambió, y devuelve la versión nueva para seguir editando sin recargar.
type Editado = { actualizadoEn: string }

export type RepositorioEmpresa = {
  guardar: (pedido: {
    cambios: CambiosDeAjustes
    actualizadoEnEsperado: string
  }) => Promise<Resultado<Editado>>
}

// La vigencia de las cotizaciones, con la misma versión de la fila que el formulario de Empresa.
export type RepositorioAjustesDeCotizacion = {
  guardar: (pedido: {
    vigenciaDias: number
    actualizadoEnEsperado: string
  }) => Promise<Resultado<Editado>>
}

export type RepositorioTiposCambio = {
  crear: (nuevo: {
    clave: string
    nombre: string
    monedaDe: string
    monedaA: string
    valor: number
  }) => Promise<Resultado<{ id: string }>>
  // Lo que viene `undefined` no se toca.
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    nombre?: string
    valor?: number
    activo?: boolean
    esDefault?: boolean
    enLaBarra?: boolean
  }) => Promise<Resultado<Editado>>
  crearMoneda: (nueva: {
    codigo: string
    nombre: string
    simbolo: string
    decimales: number
  }) => Promise<Resultado<Editado>>
  guardarMoneda: (pedido: {
    codigo: string
    actualizadoEnEsperado: string
    nombre?: string
    simbolo?: string
    decimales?: number
    activa?: boolean
  }) => Promise<Resultado<Editado>>
}

export type RepositorioIntegraciones = {
  guardar: (pedido: {
    clave: ClaveIntegracion
    actualizadoEnEsperado: string
    activa?: boolean
    config?: Record<string, unknown>
  }) => Promise<Resultado<Editado>>
  // Va a Vault. Nada lo devuelve: sólo queda dicho cuándo se guardó.
  guardarSecreto: (pedido: {
    clave: ClaveIntegracion
    secreto: string
    actualizadoEnEsperado: string
  }) => Promise<Resultado<Editado>>
}

// «Probar» de la web pública: un POST con la dirección y el secreto guardados. Vuelve sólo el
// código de respuesta; el secreto no sale del servidor.
export type ProbadorDeRevalidacion = () => Promise<Resultado<{ codigo: number; conHttps: boolean }>>

// Lo que se le pide al asistente de IA desde el navegador: un atajo o una instrucción libre sobre un texto. La firma (el nombre de quien comparte)
// y `puedeConfigurar` (si el error ofrece ir a Integraciones) los pone el servidor.
export type PedidoAlAsistente = (
  { tipo: 'generar'; atajoId: string } | { tipo: 'reescribir'; instruccion: string }
) & { texto: string; firma: string | null; puedeConfigurar: boolean }

// Redacta con la clave guardada y cuenta un uso de quien pide si el proveedor respondió. La clave no sale del servidor.
export type RedactorDelAsistente = (
  pedido: PedidoAlAsistente,
) => Promise<Resultado<{ texto: string }>>

// «Probar conexión»: un pedido mínimo con la clave guardada. Vuelve el modelo que respondió; no cuenta como uso.
export type ProbadorDelAsistente = () => Promise<Resultado<{ modelo: string }>>

// Los usos del mes: los de todos para quien gestiona la empresa, los propios para los demás (RLS).
export type LectorDeUsosDelAsistente = () => Promise<Resultado<UsosDelMes>>

export type AjustesParaEditar = {
  ajustes: AjustesEmpresa
  // Con vehículos, cotizaciones o gastos cargados la moneda base ya no se cambia.
  conDatosCargados: boolean
}

export type MonedasYTiposCambio = { monedas: Moneda[]; tipos: TipoCambio[] }

export type LectorDeAjustes = () => Promise<Resultado<AjustesParaEditar>>
// Todos, también los inactivos: es lo que edita la pantalla.
export type LectorDeMonedasYTiposCambio = () => Promise<Resultado<MonedasYTiposCambio>>
// Cuándo y quién cambió por última vez el valor de cada tipo de cambio activo, por su id (el de los inactivos no se lee: la tarjeta dice sólo cuándo).
export type LectorDeUltimosCambios = () => Promise<Resultado<Record<string, UltimoCambio>>>
export type LectorDeHistorial = (tipoCambioId: string) => Promise<Resultado<CambioDeValor[]>>
// Los vigentes con su último cambio, para el popover de la barra: hasta TOPE_DEL_POPOVER + 1 (el de más dice que hay otros).
export type LectorDeTiposCambioVigentes = () => Promise<Resultado<TipoCambioVigente[]>>
export type LectorDeIntegraciones = () => Promise<Resultado<Integracion[]>>
// Cuántos vehículos publicados empiezan o dejan de verse al encender o apagar la web pública.
export type LectorDeVehiculosQueCambian = () => Promise<Resultado<ConteoAcotado>>
// La vigencia con la versión de la fila; falla en vez de dar los de fábrica.
export type LectorDeAjustesDeCotizacion = () => Promise<Resultado<AjustesDeCotizacion>>

// La leyenda de los tipos de cambio compartidos, con la misma versión de la fila que el formulario de Empresa.
export type RepositorioLeyendaDeTiposCambio = {
  guardar: (pedido: {
    leyenda: string | null
    actualizadoEnEsperado: string
  }) => Promise<Resultado<Editado>>
}
// Falla en vez de dar una leyenda vacía: se guardaría encima de la verdadera.
export type LectorDeLeyendaDeTiposCambio = () => Promise<Resultado<LeyendaDeTiposCambio>>
// Lo que se comparte, de los tipos elegidos (los activos entre ellos, en el orden pedido) y de la empresa, con la sesión de quien pide.
export type LectorParaCompartir = (ids: readonly string[]) => Promise<Resultado<ParaCompartir>>
// La imagen PNG de lo que se comparte.
export type DibujanteDeImagen = (datos: ParaCompartir) => Promise<Resultado<Uint8Array>>

// Enlaces de ayuda (docs/GLOSARIO.md). Cada escritura de la empresa devuelve la lista entera (hasta el tope + 1); un rechazo de un campo
// lo nombra en `campo` (`titulo`, `url`, `descripcion` o `tope`).
export type FalloDeEnlace = { ok: false; error: ErrorApp; campo?: string }
type RespuestaDeEnlaces = Promise<{ ok: true; data: ListaDeEnlacesDeLaEmpresa } | FalloDeEnlace>

export type RepositorioDeEnlacesDeAyuda = {
  // Con el id del intento: repetirlo no crea otro.
  crear: (pedido: { id: string } & CamposDeEnlace) => RespuestaDeEnlaces
  // Lo que viene `undefined` no se toca.
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    titulo?: string | undefined
    url?: string | undefined
    descripcion?: string | null | undefined
    activo?: boolean | undefined
  }) => RespuestaDeEnlaces
  mover: (pedido: {
    id: string
    actualizadoEnEsperado: string
    direccion: Direccion
  }) => RespuestaDeEnlaces
  // Uno que ya no está no es un error: vuelve la lista.
  quitar: (pedido: { id: string; actualizadoEnEsperado: string }) => RespuestaDeEnlaces
}

// Los de una persona se guardan enteros, con la versión de su lista (nula si nunca guardó). Vuelve lo releído.
export type RepositorioDeMisEnlacesDeAyuda = {
  guardar: (pedido: {
    actualizadoEnEsperado: string | null
    elementos: ElementoAGuardar[]
  }) => Promise<{ ok: true; data: MisEnlacesLeidos } | FalloDeEnlace>
}

// Todos los de la empresa, también los desactivados: es lo que edita Configuración.
export type LectorDeEnlacesDeAyuda = () => Promise<Resultado<ListaDeEnlacesDeLaEmpresa>>
// Lo de quien mira, de una sola lectura (`enlaces_de_ayuda_de_mi()`).
export type LectorDeMisEnlacesDeAyuda = () => Promise<Resultado<MisEnlacesLeidos>>

// Variantes del logo (docs/GLOSARIO.md). Cada escritura devuelve la lista entera (con las dos fijas) y la ruta de la que se sumó o se quitó; un
// rechazo de un campo lo nombra en `campo` (`nombre`, `archivo` o `tope`).
export type RespuestaDeLogos = { lista: ListaDeLogos; ruta: string | null }

export type RepositorioDeLogos = {
  // Con el id del intento: repetirlo no suma otra. La ruta ya está subida al bucket `marca`.
  crear: (pedido: {
    id: string
    nombre: string
    ruta: string
    tipo: string
    ancho: number
    alto: number
  }) => Promise<{ ok: true; data: RespuestaDeLogos } | FalloDeEnlace>
  renombrar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    nombre: string
  }) => Promise<{ ok: true; data: RespuestaDeLogos } | FalloDeEnlace>
  // `ids`: todas las variantes propias, en el orden nuevo.
  ordenar: (pedido: {
    ids: string[]
  }) => Promise<{ ok: true; data: RespuestaDeLogos } | FalloDeEnlace>
  // Una que ya no está no es un error: vuelve la lista y la ruta es nula.
  quitar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<{ ok: true; data: RespuestaDeLogos } | FalloDeEnlace>
  usos: (pedido: { id: string }) => Promise<Resultado<UsosDelLogo>>
}

// Las variantes del logo con «Principal» y «Para fondo oscuro» primero: la lee toda persona activa.
export type LectorDeLogos = () => Promise<Resultado<ListaDeLogos>>
