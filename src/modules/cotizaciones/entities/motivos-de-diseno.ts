// Por qué se rechaza un diseño. El código es el contrato con `validar_diseno()` de la base y con el juego de `casos-de-diseno.json`; el
// texto es de cada lado. `donde` es el id de la sección, del nodo, del modo o del grupo donde se rompe: la base lo pone en `hint`.
import { MAXIMO_DE_ITEMS_DEL_DISENO } from './diseno'

export const REGLAS_DE_DISENO = [
  'forma',
  'demasiados_items',
  'modo_duplicado',
  'modo_sin_total_en',
  'modo_bucket_inexistente',
  'modo_bucket_repetido',
  'modo_tipo_de_cambio_inexistente',
  'modo_incompleto',
  'modo_por_defecto_inexistente',
  'modo_visible_inexistente',
  'modo_visible_repetido',
  'modo_por_defecto_oculto',
  'ver_total_bs_por_defecto_no_ofrecido',
  'seccion_duplicada',
  'nivel_inexistente',
  'nivel_retirado',
  'total_repetido',
  'total_en_avanzado',
  'total_con_nivel',
  'pieza_fuera_de_la_rejilla',
  'piezas_se_pisan',
  'nodo_inexistente',
  'celda_no_es_valor',
  'secundario_sin_porcentaje',
  'par_sin_secundario',
  'atajos_no_es_tabla',
  'atajos_no_sobrescribible',
  'variante_no_es_opcion',
  'interruptor_no_es_bandera',
  'interruptor_sin_efecto',
  'subtotal_no_es_calculo',
  'nivel_no_admitido',
  'editar_sin_ver',
  'nodo_repetido',
  'tarjeta_no_es_el_total',
  'tarjeta_secundario_no_es_aparte',
  'atajos_sin_celda',
  'nodo_con_dos_niveles',
  'nodo_sin_seccion',
  'tono_inexistente',
  'ayuda_enlace_no_https',
  'ayuda_tabla_inexistente',
  'ayuda_columna_inexistente',
  'ayuda_llena_no_acepta_valor',
] as const

export type ReglaDeDiseno = (typeof REGLAS_DE_DISENO)[number]

// Lo que cada mensaje puede nombrar. `pieza` dice de qué es el tono que falta (un grupo de la fórmula, la cabecera o una sección).
export type DatosDeRechazoDeDiseno = {
  donde?: string
  ref?: string
  nivel?: string
  campo?: string
  // En la geometría de la rejilla, si la pieza es una sección o la tarjeta del total (las dos nombran la sección); sin ella, un ítem con su nodo.
  pieza?: 'grupo' | 'cabecera' | 'seccion' | 'total'
  // La tabla de la columna que falta (`ayuda_columna_inexistente`).
  tabla?: string
}

export type RechazoDeDiseno = {
  regla: ReglaDeDiseno
  mensaje: string
  donde?: string
  // La ruta del dato en el diseño (sólo `forma`), para el editor.
  campo?: string
}

const q = (s: string | undefined) => `«${s ?? '?'}»`
// De qué pieza habla un rechazo de la rejilla.
const sujetoDeLaRejilla = (d: DatosDeRechazoDeDiseno) =>
  d.pieza === 'total'
    ? 'La tarjeta del total'
    : `${d.pieza === 'seccion' ? 'La sección' : 'La pieza'} ${q(d.donde)}`

const MENSAJES: Record<ReglaDeDiseno, (d: DatosDeRechazoDeDiseno) => string> = {
  forma: (d) => `El diseño no tiene la forma esperada en ${q(d.campo)}.`,
  demasiados_items: (d) =>
    `La hoja admite hasta ${MAXIMO_DE_ITEMS_DEL_DISENO} ítems y el diseño pasa de ese tope en ${q(d.donde)}: quita alguno.`,
  modo_duplicado: (d) => `Hay dos modos de tipo de cambio con la clave ${q(d.donde)}.`,
  modo_sin_total_en: (d) =>
    `El modo ${q(d.donde)} trae su propio «total_en», y la fórmula no tiene uno: con un modo el total cambiaría de cuenta.`,
  modo_bucket_inexistente: (d) =>
    `El modo ${q(d.donde)} usa el bucket ${q(d.ref)}, que la fórmula no tiene.`,
  modo_bucket_repetido: (d) => `El modo ${q(d.donde)} llena dos veces el bucket ${q(d.ref)}.`,
  modo_tipo_de_cambio_inexistente: (d) =>
    `El modo ${q(d.donde)} nombra ${q(d.ref)}, que no es un tipo de cambio de la fórmula.`,
  modo_incompleto: (d) =>
    `El modo ${q(d.donde)} tiene que llenar todos los buckets de la fórmula y le falta alguno.`,
  modo_por_defecto_inexistente: (d) =>
    `El modo por defecto ${q(d.ref)} no es un modo de la cabecera.`,
  modo_visible_inexistente: (d) =>
    `Las opciones visibles nombran ${q(d.ref)}, que no es un modo de la cabecera.`,
  modo_visible_repetido: (d) => `Las opciones visibles nombran dos veces ${q(d.ref)}.`,
  modo_por_defecto_oculto: (d) =>
    `El modo por defecto ${q(d.ref)} tiene que quedar entre las opciones visibles.`,
  ver_total_bs_por_defecto_no_ofrecido: () =>
    '«Ver total» no puede salir encendido por defecto si la cabecera no lo ofrece.',
  seccion_duplicada: (d) => `Hay dos secciones con el id ${q(d.donde)}.`,
  nivel_inexistente: (d) => `${q(d.donde)} usa el nivel ${q(d.nivel)}, que no existe.`,
  nivel_retirado: (d) =>
    `${q(d.donde)} usa el nivel ${q(d.nivel)}, que está retirado: elige otro para esta celda o sección.`,
  total_repetido: (d) => `La sección ${q(d.donde)} ya tiene la tarjeta del total.`,
  total_en_avanzado: () => 'La tarjeta del total no va en una sección avanzada.',
  total_con_nivel: (d) =>
    `La tarjeta del total la ven todos: la sección ${q(d.donde)} tiene un nivel.`,
  pieza_fuera_de_la_rejilla: (d) =>
    `${sujetoDeLaRejilla(d)} se sale de la rejilla: 12 columnas y 200 filas.`,
  piezas_se_pisan: (d) => `${sujetoDeLaRejilla(d)} se pisa con otra en la rejilla.`,
  nodo_inexistente: (d) => `El diseño nombra ${q(d.donde)}, que no es un nodo de la fórmula.`,
  celda_no_es_valor: (d) =>
    `${q(d.donde)} no se dibuja como celda: la variante va como chips y una bandera como interruptor.`,
  secundario_sin_porcentaje: (d) =>
    `${q(d.donde)} lleva un secundario y no es un porcentaje de otro monto.`,
  par_sin_secundario: (d) =>
    `${q(d.donde)} es un monto con su porcentaje y se sobrescribe: el par es una sola celda con su secundario.`,
  atajos_no_es_tabla: (d) =>
    `Los atajos de ${q(d.donde)} van sobre un nodo de tabla, y ese nodo no lo es.`,
  atajos_no_sobrescribible: (d) =>
    `Los atajos de ${q(d.donde)} eligen una fila y dejan su valor como sugerido: la tabla tiene que poder sobrescribirse.`,
  variante_no_es_opcion: (d) => `${q(d.donde)} no es la variante de la fórmula.`,
  interruptor_no_es_bandera: (d) => `${q(d.donde)} no es una bandera: un interruptor la enciende.`,
  interruptor_sin_efecto: (d) =>
    `La bandera ${q(d.donde)} no condiciona ningún nodo: su interruptor no haría nada.`,
  subtotal_no_es_calculo: (d) => `${q(d.donde)} no es un cálculo: un subtotal se dibuja desde uno.`,
  nivel_no_admitido: (d) =>
    `${q(d.donde)} se muestra a todos: el total, lo que va aparte y la variante no se pueden restringir a un nivel.`,
  editar_sin_ver: (d) =>
    `${q(d.donde)} se ve sólo con un nivel y se edita sin él: lo que no se ve no se edita. Ponle también un nivel de edición.`,
  nodo_repetido: (d) => `${q(d.donde)} aparece dos veces en el diseño.`,
  tarjeta_no_es_el_total: (d) =>
    `La tarjeta nombra ${q(d.donde)}, que no es el total de la fórmula.`,
  tarjeta_secundario_no_es_aparte: (d) =>
    `${q(d.donde)} es un secundario de la tarjeta y no es una salida «aparte».`,
  atajos_sin_celda: (d) =>
    `Los atajos de ${q(d.donde)} necesitan la celda de ese nodo en el diseño.`,
  nodo_con_dos_niveles: (d) =>
    `Los atajos de ${q(d.donde)} y su celda tienen niveles distintos: tienen que ser los mismos.`,
  nodo_sin_seccion: (d) => `${q(d.donde)} no está en ninguna sección del diseño.`,
  tono_inexistente: (d) =>
    d.pieza === 'cabecera'
      ? 'La cabecera usa un color que no está en el catálogo.'
      : `${d.pieza === 'seccion' ? 'La sección' : 'El grupo'} ${q(d.donde)} usa un color que no está en el catálogo.`,
  ayuda_enlace_no_https: (d) =>
    `Un enlace de la ayuda de ${q(d.donde)} tiene que empezar con https:// y no llevar espacios.`,
  ayuda_tabla_inexistente: (d) =>
    `La ayuda de ${q(d.donde)} usa la tabla ${q(d.ref)}, que este origen no tiene o está desactivada.`,
  ayuda_columna_inexistente: (d) =>
    `La ayuda de ${q(d.donde)} muestra la columna ${q(d.ref)}, que la tabla ${q(d.tabla)} ya no tiene.`,
  ayuda_llena_no_acepta_valor: (d) =>
    `En la ayuda de ${q(d.donde)}, la columna ${q(d.ref)} llena una celda que no acepta un valor: elige un dato que se tipea, una constante o un cálculo que se puede pisar.`,
}

export function rechazoDeDiseno(
  regla: ReglaDeDiseno,
  datos: DatosDeRechazoDeDiseno,
): RechazoDeDiseno {
  return {
    regla,
    mensaje: MENSAJES[regla](datos),
    ...(datos.donde === undefined ? {} : { donde: datos.donde }),
    ...(regla === 'forma' && datos.campo !== undefined ? { campo: datos.campo } : {}),
  }
}

export type FalloDeDiseno = { ok: false; error: RechazoDeDiseno }

// Cada rechazo se escribe `return fallo('código', …)`: así se apaga uno al mutar las pruebas.
export const fallo = (regla: ReglaDeDiseno, datos: DatosDeRechazoDeDiseno = {}): FalloDeDiseno => ({
  ok: false,
  error: rechazoDeDiseno(regla, datos),
})
