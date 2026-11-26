// La plantilla de la tarjeta de la cotización como cuadrícula (la forma 2 de `plantillas_tarjeta.definicion`): tipos y constantes, sin lógica. Vive en el
// núcleo porque la usan dos áreas: `plantilla` (la valida, la convierte desde la forma 1 y arma la vista previa) y `tarjeta` (la lee y la dibuja). Las
// listas cerradas y los topes tienen su copia en la base (`_plantilla_cuadricula_forma()`): si cambian aquí, cambian allá. docs/COTIZADOR.md › «Plantilla de
// tarjeta (PDF)».

export const FORMA_DE_LA_CUADRICULA = 2

// Las variables que puede mostrar una celda: lo de la cotización que no es un nodo de la fórmula.
export const VARIABLES_DE_LA_TARJETA = [
  'empresa_nombre',
  'fecha_larga',
  'numero',
  'titulo',
  'titulo_opcion',
  'asesor_nombre',
  'asesor_iniciales',
  'cliente_nombre',
  'vehiculo_titulo',
  'vehiculo_lote',
  'vehiculo_vin',
  'vence_el',
  'modo_tc',
  'asesor_telefono',
  'asesor_cargo',
] as const
export type VariableDeLaTarjeta = (typeof VARIABLES_DE_LA_TARJETA)[number]

// Lo que una celda muestra de un nodo de la fórmula.
export const MOSTRAR = [
  'monto',
  'etiqueta',
  'descripcion',
  'porcentaje',
  'tc_nombre',
  'tc_valor',
  'plazo',
] as const
export type Mostrar = (typeof MOSTRAR)[number]

// Cuándo una fila no se dibuja: según el nodo de la fila (`no_aplica`, `no_aplica_o_cero`) o según sus condiciones (`condiciones`, con `si`).
export const OCULTAR_SI = ['nunca', 'no_aplica', 'no_aplica_o_cero', 'condiciones'] as const
export type OcultarSi = (typeof OCULTAR_SI)[number]
// Las tres que decide un nodo (`nodo`); «condiciones» la decide su `si`.
export type OcultarPorNodo = Exclude<OcultarSi, 'condiciones'>

// Las condiciones de la tarjeta (glosario: «Condiciones de la tarjeta», «Condición (de la tarjeta)»): qué pregunta cada una, por su clave `es`. `vacio` y `no_vacio`
// miran un dato (`dato`); las demás, un nodo (`nodo`): `cero` y `no_cero`, los numéricos con su número `a`, la variante (`opcion`, con la clave de la opción) y el
// interruptor (`encendido`, `apagado`, sobre un nodo `bandera`).
export const ES_DE_LA_CONDICION = [
  'vacio',
  'no_vacio',
  'cero',
  'no_cero',
  'mayor',
  'menor',
  'igual',
  'opcion',
  'encendido',
  'apagado',
] as const
export type EsDeLaCondicion = (typeof ES_DE_LA_CONDICION)[number]
export const ES_SOBRE_UN_DATO = ['vacio', 'no_vacio'] as const
export const ES_CON_NUMERO = ['mayor', 'menor', 'igual'] as const
// Una lista de respaldo lleva de 2 a 5 datos; unas condiciones, hasta 5 ramas contando el «si no» (que va siempre), y cada rama hasta 3 condiciones unidas con Y.
export const DATOS_DEL_RESPALDO = { minimo: 2, maximo: 5 } as const
export const MAXIMO_DE_RAMAS = 5
export const MAXIMO_DE_CONDICIONES = 3

export const TAMANOS_DE_LETRA = [10, 11, 12, 14, 16, 18, 22, 28] as const
export type TamanoDeLetra = (typeof TAMANOS_DE_LETRA)[number]
export const ALINEAR = ['izquierda', 'centro', 'derecha'] as const
export const ALINEAR_VERTICAL = ['arriba', 'centro', 'abajo'] as const
export const BORDES = ['ninguno', 'fino', 'grueso'] as const
export type Borde = (typeof BORDES)[number]
export const LADOS = ['arriba', 'derecha', 'abajo', 'izquierda'] as const
export type Lado = (typeof LADOS)[number]

// `fondo` y `texto` son una clave del catálogo de colores o `auto` (fondo blanco; texto negro o blanco, el de más contraste).
export const COLOR_AUTOMATICO = 'auto'

// Lo que vale una clave ausente de `estilo` (D1: se ahorran bytes).
export const ESTILO_POR_OMISION = {
  fondo: COLOR_AUTOMATICO,
  texto: COLOR_AUTOMATICO,
  negrita: false,
  cursiva: false,
  tamano: 12,
  alinear: 'izquierda',
  alinear_vertical: 'centro',
} as const

// Los topes de la forma 2.
export const MAXIMO_DE_COLUMNAS = 16
export const MAXIMO_DE_FILAS = 120
export const MAXIMO_DE_CELDAS = 1000
export const ANCHO_TOTAL_MAXIMO = 1600
export const ANCHO_DE_COLUMNA = { minimo: 24, maximo: 640 } as const
export const ALTO_DE_FILA = { minimo: 16, maximo: 240 } as const
// Un texto suma a lo sumo 300 caracteres (code points) y un texto con datos, a lo sumo 20 partes entre texto y datos: su copia en `_plantilla_cuadricula_forma()` y
// `_plantilla_cuadricula_partes()`.
export const MAXIMO_DE_CARACTERES_DE_UN_TEXTO = 300
export const MAXIMO_DE_PARTES_DE_UN_TEXTO = 20
// El texto del `jsonb` (`octet_length(definicion::text)`): el doble de la plantilla de V1 más grande, a KiB enteros (docs/DECISIONES.md).
export const TOPE_EN_BYTES_DE_LA_CUADRICULA = 24576

// Los retoques de la tarjeta de una cotización (`cotizaciones.tarjeta_retoques`; docs/COTIZADOR.md › «Retoques de la tarjeta»): el texto de las celdas de texto
// que se cambió y las filas que se ocultaron, por id, sólo para esa cotización. Los nombra el núcleo (la cotización leída) y los usa el área `tarjeta`. Los
// topes, los de la cuadrícula (la copia en `validar_retoques()`).
export type RetoquesDeLaTarjeta = {
  readonly celdas?: Readonly<Record<string, string>>
  readonly filas_ocultas?: readonly string[]
}
export const TOPE_EN_BYTES_DE_LOS_RETOQUES = TOPE_EN_BYTES_DE_LA_CUADRICULA
export const MAXIMO_DE_CARACTERES_DE_UN_RETOQUE = MAXIMO_DE_CARACTERES_DE_UN_TEXTO

// Las columnas que pone la conversión de la forma 1, en su orden, con su ancho en px (690 como máximo: entra en A4 a escala 1, 517,5 de 523 pt útiles).
// El monto, 130: un total de seis cifras a 14 px no se parte en dos renglones.
export const COLUMNAS_DE_LA_CONVERSION = [
  { id: 'grupo', ancho: 100 },
  { id: 'concepto', ancho: 190 },
  { id: 'monto', ancho: 130 },
  { id: 'leyenda', ancho: 170 },
  { id: 'tipo_cambio', ancho: 90 },
  { id: 'plazo', ancho: 90 },
] as const

export type ColumnaDeLaTarjeta = { readonly id: string; readonly ancho: number }

// Lo que muestra «Dato»: una variable de la cotización o algo de un nodo de la fórmula.
export type DatoDeLaCelda =
  | { readonly tipo: 'dato'; readonly variable: string }
  | { readonly tipo: 'dato'; readonly nodo: string; readonly mostrar: Mostrar }

export type CondicionDeLaTarjeta =
  | { readonly es: (typeof ES_SOBRE_UN_DATO)[number]; readonly dato: DatoDeLaCelda }
  | { readonly es: 'cero' | 'no_cero' | 'encendido' | 'apagado'; readonly nodo: string }
  | { readonly es: (typeof ES_CON_NUMERO)[number]; readonly nodo: string; readonly a: number }
  | { readonly es: 'opcion'; readonly nodo: string; readonly opcion: string }

// Un texto fijo.
export type TextoSimple = { readonly tipo: 'texto'; readonly texto: string }

// Una parte de un texto con datos: un texto literal (un string, nunca vacío ni junto a otro) o un dato.
export type ParteDelTexto = string | DatoDeLaCelda

// El texto con datos (glosario): un texto que mezcla texto literal y datos, en partes (de 1 a 20, con al menos un dato). Sin datos se escribe `TextoSimple`.
export type TextoConDatos = { readonly tipo: 'texto'; readonly partes: readonly ParteDelTexto[] }

// Lo que muestra una rama de unas condiciones: un texto, un dato o nada.
export type ContenidoSimple = TextoSimple | DatoDeLaCelda | { readonly tipo: 'vacio' }

// «Si <condiciones, unidas con Y> → <contenido>».
export type RamaDeLaTarjeta = {
  readonly si: readonly CondicionDeLaTarjeta[]
  readonly contenido: ContenidoSimple
}

// Un tipo con opcionales (no una unión) para que quien lee `f.nodo` no cambie.
export type FilaDeLaTarjeta = {
  readonly id: string
  readonly alto: number
  readonly ocultar_si: OcultarSi
  // Con `no_aplica` y `no_aplica_o_cero`; ausente con `nunca` y `condiciones`.
  readonly nodo?: string
  // Sólo con `condiciones`: la fila no se dibuja si se cumplen todas (de 1 a 3).
  readonly si?: readonly CondicionDeLaTarjeta[]
}

export type ContenidoDeLaCelda =
  | TextoSimple
  | TextoConDatos
  | DatoDeLaCelda
  | { readonly tipo: 'logo' }
  // La foto de perfil del asesor (quien mira o comparte la tarjeta); sin foto, sus iniciales en un círculo.
  | { readonly tipo: 'foto_del_asesor' }
  | { readonly tipo: 'vacio' }
  // La lista de respaldo (glosario): el primero de sus datos que tiene valor.
  | { readonly tipo: 'respaldo'; readonly datos: readonly DatoDeLaCelda[] }
  // Las condiciones de la tarjeta (glosario): la primera rama cuyas condiciones se cumplen o, si ninguna, el «si no».
  | {
      readonly tipo: 'condiciones'
      readonly ramas: readonly RamaDeLaTarjeta[]
      readonly si_no: ContenidoSimple
    }

export type BordesDeLaCelda = { readonly todos?: Borde } & { readonly [L in Lado]?: Borde }

export type EstiloDeLaCelda = {
  readonly fondo?: string
  readonly texto?: string
  readonly negrita?: boolean
  readonly cursiva?: boolean
  readonly tamano?: TamanoDeLetra
  readonly alinear?: (typeof ALINEAR)[number]
  readonly alinear_vertical?: (typeof ALINEAR_VERTICAL)[number]
  readonly bordes?: BordesDeLaCelda
}

export type CeldaDeLaTarjeta = {
  readonly id: string
  readonly fila: string
  readonly columna: string
  readonly abarca_columnas?: number
  readonly abarca_filas?: number
  readonly contenido: ContenidoDeLaCelda
  readonly estilo?: EstiloDeLaCelda
}

export type PlantillaEnCuadricula = {
  readonly forma: typeof FORMA_DE_LA_CUADRICULA
  readonly columnas: readonly ColumnaDeLaTarjeta[]
  readonly filas: readonly FilaDeLaTarjeta[]
  readonly celdas: readonly CeldaDeLaTarjeta[]
}

// Lo que la tarjeta necesita para dibujar una forma 2, plano (arreglos, sin `Map`: cruza props de una página de servidor a un componente de cliente). Lo arman
// la vista previa de Configuración (con la fórmula reducida y cifras de ejemplo) y la lectura de `cotizacion_tarjeta`; sólo trae lo que la plantilla nombra.
export type LecturaEnCuadricula = {
  readonly definicion: PlantillaEnCuadricula
  readonly nodos: readonly {
    readonly id: string
    readonly etiqueta: string
    readonly descripcion: string | null
    readonly grupo: string | null
    // El `pct` del par, sólo si la plantilla muestra su porcentaje.
    readonly pct: string | null
    // Los «Decimales» del nodo y los del `pct` de su porcentaje (glosario: «Decimales (de una celda)»), sólo si la versión los trae.
    readonly decimales?: number
    readonly decimalesDelPct?: number
  }[]
  readonly grupos: readonly {
    readonly id: string
    readonly etiqueta: string
    readonly plazo: string | null
    readonly bucket: string | null
  }[]
  // El tipo de cambio de cada bucket por omisión y en cada modo: el nombre que se dice y el nodo cuyo valor se muestra.
  readonly tiposDeCambio: {
    readonly buckets: readonly {
      readonly bucket: string
      readonly nombre: string | null
      readonly nodo: string | null
    }[]
    readonly modos: readonly {
      readonly modo: string
      readonly bucket: string
      readonly nombre: string | null
      readonly nodo: string | null
    }[]
  }
  readonly modos: readonly { readonly clave: string; readonly nombre: string }[]
  readonly variante: {
    readonly nodo: string
    readonly opciones: readonly { readonly clave: string; readonly titulo: string }[]
  } | null
  readonly colores: readonly { readonly clave: string; readonly hex: string }[]
  readonly total: { readonly nodo: string | null }
}
