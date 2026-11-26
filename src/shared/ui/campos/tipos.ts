// Lo que el editor de campos necesita saber del módulo que lo usa. El editor es el mismo para el
// layout de un origen y para el de los leads: cada módulo le pasa su configuración (qué banderas
// ofrece, cómo arma lo que viaja) y sus operaciones (las Server Actions por detrás).
import type { ReactNode } from 'react'
import type { Resultado } from '@/shared/lib/errores'
import type { OperacionesDelCatalogo } from '@/shared/ui/catalogo-en-drawer'
import {
  tieneRango,
  type CampoBase,
  type GrupoDeCampos,
  type ImpactoDeCampo,
  type OpcionDeCampo,
  type Rango,
  type ResumenDeImpacto,
  type TipoDeCampo,
  type ValorDefecto,
} from '@/shared/lib/campos'

// Un sí o no del campo que el módulo ofrece (en tarjeta, filtrable, solo la cartera…). `clave` es
// el nombre de la propiedad del campo. Se edita en el panel del campo; `enFila` = encendida, la fila
// lo dice como insignia («Filtrable»).
export type BanderaDeCampo = {
  clave: string
  etiqueta: string
  ayuda: string
  enFila: boolean
}

// La propiedad booleana de un campo del módulo.
export function banderaDe(campo: object, clave: string): boolean {
  return Reflect.get(campo, clave) === true
}

// Lo que el formulario de un campo edita. Las banderas y los textos propios del módulo (la ruta de
// apibara) viajan en mapas: el editor no conoce sus nombres.
export type ValoresDeCampo = {
  etiqueta: string
  clave: string
  tipo: TipoDeCampo
  opciones: OpcionDeCampo[]
  // El grupo de campos elegido; null = sin grupo.
  grupoId: string | null
  activo: boolean
  valorDefecto: ValorDefecto | null
  // El rango de un número o un monto (9-2); null = sin límite.
  minimo: number | null
  maximo: number | null
  banderas: Record<string, boolean>
  textos: Record<string, string>
}

// El rango que viaja desde el formulario: el escrito en un número o un monto; en otro tipo, sin límites (como la base).
export function rangoDelFormulario(valores: ValoresDeCampo): Rango {
  return tieneRango(valores.tipo)
    ? { minimo: valores.minimo, maximo: valores.maximo }
    : { minimo: null, maximo: null }
}

export type ErroresDeCampo = Partial<
  Record<
    'etiqueta' | 'clave' | 'opciones' | 'grupoId' | 'valorDefecto' | 'minimo' | 'maximo',
    string
  >
>

export type DeLaFila = Pick<CampoBase, 'id' | 'etiqueta' | 'actualizadoEn'>

// El catálogo de grupos de campos del layout (docs/GLOSARIO.md › Grupo de campos), leído aparte con su tope: el combo del panel elige uno
// o crea uno nuevo con lo escrito.
export type GruposDelEditor = {
  // En el orden del catálogo, también los inactivos (el que tiene el campo se sigue ofreciendo).
  lista: readonly GrupoDeCampos[]
  hayMas: boolean
  // Sin el permiso, el combo no ofrece «Crear grupo».
  puedeCrear: boolean
  // Crea el grupo (el combo lo elige); un rechazo («Ya existe «X».») lo dice el combo.
  crear: (nombre: string) => Promise<Resultado<GrupoDeCampos>>
  // Lo que hace el drawer «Grupos» (`?panel=grupos`): agregar, renombrar, ordenar, activar y quitar. Sin él, no hay drawer.
  operaciones: OperacionesDelCatalogo | null
}

// Las operaciones: las del `useCampos()` de cada módulo. Toda edición manda la versión que vio.
export type EdicionesDeCampos<Cambios, Nuevo> = {
  // Un rechazo no se avisa con un toast: lo dice el panel, junto a «Crear campo».
  crear: (nuevo: Nuevo) => Promise<Resultado<unknown>>
  // Un conflicto (`PT409`) no se avisa con un toast: lo dice el panel, con «Recargar».
  guardar: (campo: DeLaFila, cambios: Cambios) => Promise<Resultado<unknown>>
  cambiarActivo: (campo: DeLaFila, activo: boolean) => Promise<Resultado<unknown>>
  mover: (campo: DeLaFila, despuesDe: string | null) => Promise<Resultado<unknown>>
  eliminar: (campo: DeLaFila) => Promise<Resultado<unknown>>
  // Cuántos registros tienen valor: se llama antes de un cambio que podría tocarlos. Con `rango`, cuenta también cuántos quedarían
  // fuera del rango propuesto.
  vistaPrevia: (campoId: string, rango?: Partial<Rango>) => Promise<Resultado<ImpactoDeCampo>>
  enCurso: boolean
  errores: { crear: Partial<Record<string, string[]>> | undefined }
}

export type TextosDelEditor = {
  // El nombre de la región (un `h2` para el lector de pantalla) y lo que dice sin campos activos.
  titulo: string
  vacioTitulo: string
  vacioDescripcion: string
  // Por qué todo está apagado sin el permiso.
  motivoSinPermiso: string
  // El panel de un campo.
  panelNuevo: string
  panelDescripcionNuevo: string
  panelDescripcionExistente: string
  // Un nombre que choca con otro campo.
  claveDuplicada: string
  // La clave del borrador del formulario (`sessionStorage`).
  borrador: string
}

export type ContextoDelHueco = {
  valores: ValoresDeCampo
  cambiarTexto: (nombre: string, valor: string) => void
  deshabilitado: boolean
}

export type ConfiguracionDeCampos<Campo extends CampoBase, Cambios extends object, Nuevo> = {
  textos: TextosDelEditor
  // En el orden del panel; las de `enFila` también salen en la fila.
  banderas: readonly BanderaDeCampo[]
  // Los tipos que ofrece el selector.
  tipos: readonly TipoDeCampo[]
  // Nombres de los textos propios del módulo (para el borrador del formulario).
  textosLibres: readonly string[]
  valoresIniciales: (campo: Campo | null) => ValoresDeCampo
  claveDe: (etiqueta: string, existentes: readonly string[]) => string
  // `valores.clave` ya es la definitiva.
  paraCrear: (valores: ValoresDeCampo) => Nuevo
  // Sólo lo que la persona cambió respecto de lo guardado.
  cambiosDe: (campo: Campo, valores: ValoresDeCampo) => Cambios
  necesitaVistaPrevia: (campo: Campo, cambios: Cambios) => boolean
  resumenDeImpacto: (campo: Campo, cambios: Cambios, impacto: ImpactoDeCampo) => ResumenDeImpacto
  resumenDeEliminacion: (campo: Campo, impacto: ImpactoDeCampo) => ResumenDeImpacto
  // Un hueco del formulario para lo propio del módulo (el bloque de apibara).
  hueco?: (contexto: ContextoDelHueco) => ReactNode
  // Lo que la fila dice además de «Requerido» y «De fábrica», antes de las banderas encendidas («Principal», un cambio de privacidad
  // que todavía se está aplicando).
  insignias?: (campo: Campo) => readonly string[]
}

// Una casilla llena: un lugar con tope que el módulo ofrece (en un origen, un dato clave). `llave` la nombra en la lista del módulo.
export type CasillaDelEditor = {
  llave: string
  etiqueta: string
  // De dónde sale: «Dato común» o «Campo · <grupo>».
  deDonde: string
}

// Las casillas de dato clave (docs/GLOSARIO.md › Casilla de dato clave): lugares en orden, con tope, que se llenan arrastrando un campo o
// una fila fija, o con «Hacer dato clave» de su «⋯». Sin ellas (los leads), el editor no las dibuja.
export type CasillasDelEditor = {
  // «Datos clave»: el título dice además «(n de 4)», que es el tope, no un conteo.
  titulo: string
  // Cómo se nombran después de «en»: «los datos clave» («Mover «VIN» en los datos clave»).
  zona: string
  tope: number
  // Lo que dice con todas vacías, y por qué no entra otro con el tope lleno.
  vacio: string
  motivoTope: string
  // La insignia de lo que ya está en una casilla, las acciones del «⋯» y lo que se avisa al desactivar un campo que está en una.
  insignia: string
  hacer: string
  quitar: string
  notaAlDesactivar: string
  lista: readonly CasillaDelEditor[]
  // Un cambio en vuelo: hasta que vuelve, nada más se toca.
  enCurso: boolean
  // La llave de un campo en la lista del módulo.
  llaveDeCampo: (campo: CampoBase) => string
  // `posicion`: 0 = primero; uno que ya estaba cambia de lugar.
  alPoner: (llave: string, posicion: number) => void
  alQuitar: (llave: string) => void
  alMover: (desde: number, hasta: number) => void
}

// Filas que no son campos del layout pero pueden ir a una casilla (en un origen, los datos comunes): no se editan ni se ordenan.
export type FijosDelEditor = {
  titulo: string
  insignia: string
  filas: readonly { llave: string; etiqueta: string }[]
}
