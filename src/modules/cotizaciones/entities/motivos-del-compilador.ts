// Por qué no compila un texto (docs/COTIZADOR.md › «Fórmulas como texto»). El código es el contrato con el editor (4.21);
// el mensaje habla con tuteo. Cada error trae su tramo del texto: dónde empieza (UTF-16, como un <textarea>), cuánto mide y su
// línea y columna (desde 1; las líneas se parten en «\n»).
import type { Medidor } from './medidor'

export const CODIGOS_DE_COMPILACION = [
  'texto_vacio',
  'caracter_invalido',
  'coma',
  'separador_fuera_de_funcion',
  'numero_mal_escrito',
  'numero_fuera_de_rango',
  'texto_sin_cerrar',
  'texto_fuera_de_lugar',
  'parentesis_sin_cerrar',
  'parentesis_de_mas',
  'operador_suelto',
  'falta_un_valor',
  'falta_un_operador',
  'porcentaje_sin_numero',
  'comparacion_encadenada',
  'comparar_texto_con_numero',
  'demasiado_profundo',
  'nombre_desconocido',
  'referencia_a1',
  'referencia_hacia_adelante',
  'ciclo',
  'grupo_sin_suma',
  'grupo_con_otros',
  'variante_en_calculo',
  'funcion_desconocida',
  'hoy_no_soportado',
  'cantidad_de_argumentos',
  'argumento_invalido',
  'no_es_condicion',
  'opcion_inexistente',
  'tabla_inexistente',
  'columna_inexistente',
  'tabla_sin_columnas',
  'tabla_sin_tramos',
  'tablas_sin_leer',
  'grupo_vacio',
  'auxiliar_ocupado',
  'demasiados_terminos',
] as const

export type CodigoDeCompilacion = (typeof CODIGOS_DE_COMPILACION)[number]

// Lo que cada mensaje puede nombrar.
export type DatosDeError = {
  texto?: string
  nombre?: string
  cantidad?: number
  esperado?: string
  n?: number
  // Cuántos argumentos lleva una función que no los lleva fijos: al menos `minimo` y, si tiene tope, a lo sumo `maximo`.
  minimo?: number
  maximo?: number
  // La tabla de BUSCARV, cuando el error es de una de sus columnas.
  tabla?: string
}

export type Tramo = { desde: number; largo: number; linea: number; columna: number }

export type ErrorDeCompilacion = {
  codigo: CodigoDeCompilacion
  mensaje: string
  tramo: Tramo
}

export const MAXIMO_DE_PROFUNDIDAD = 64
export const MAXIMO_DE_TERMINOS = 100_000

const q = (s: string | undefined) => `«${s ?? '?'}»`

// «lleva 2 valores», «lleva entre 2 y 3 valores» o «lleva al menos 2 valores»; `esperado` suma la otra forma (MAX de un grupo). Dice «valor», no «argumento».
function cuantosArgumentos(d: DatosDeError): string {
  const nombre = d.nombre ?? '?'
  const cuantos =
    d.minimo === undefined
      ? `${String(d.cantidad ?? 0)} valor${d.cantidad === 1 ? '' : 'es'}`
      : d.maximo === undefined
        ? `al menos ${String(d.minimo)} valores`
        : `entre ${String(d.minimo)} y ${String(d.maximo)} valores`
  const otra = d.esperado === undefined ? '' : `, o ${d.esperado}`
  return `${nombre} lleva ${cuantos}, separados con punto y coma (;)${otra}.`
}

const MENSAJES: Record<CodigoDeCompilacion, (d: DatosDeError) => string> = {
  texto_vacio: () => 'Escribe la fórmula: ahora no hay nada que calcular.',
  caracter_invalido: (d) =>
    `No entiendo ${q(d.texto)}. Una fórmula lleva números, celdas, + - * / ( ) %, comparaciones (> < =) y ; entre los valores de una función.`,
  coma: () =>
    'Separa los valores de una función con punto y coma (;), no con coma. Los decimales llevan punto.',
  separador_fuera_de_funcion: () =>
    'El punto y coma (;) sólo separa los valores de una función, como SUMA(C5; C7).',
  numero_mal_escrito: (d) => `${q(d.texto)} no es un número: escríbelo como 12, 0.5 o 1e3.`,
  numero_fuera_de_rango: (d) => `${q(d.texto)} es demasiado grande.`,
  texto_sin_cerrar: () => 'Falta cerrar las comillas.',
  texto_fuera_de_lugar: () =>
    'Un texto entre comillas solo va en BUSCARV o al comparar la variante.',
  parentesis_sin_cerrar: () => 'Falta cerrar un paréntesis.',
  parentesis_de_mas: () => 'Sobra este paréntesis: no cierra ninguno.',
  operador_suelto: (d) =>
    d.texto === '-'
      ? 'Aquí falta un valor. Para restar una celda escribe 0 - C5; el signo menos sólo va pegado a un número (-5).'
      : `El signo ${q(d.texto)} necesita un valor antes y otro después.`,
  falta_un_valor: () => 'Falta un valor aquí: escribe un número o toca una celda.',
  falta_un_operador: () => 'Falta un signo (+ - * /) entre estos dos valores.',
  porcentaje_sin_numero: () => 'El % va pegado a un número, como 4%.',
  comparacion_encadenada: () => 'Separa las comparaciones con Y u O, por ejemplo Y(a<b; b<c).',
  comparar_texto_con_numero: (d) => `No se puede comparar un texto con un número: ${q(d.texto)}.`,
  demasiado_profundo: (d) =>
    `Hay demasiados paréntesis anidados: el máximo es ${String(d.n ?? 0)}.`,
  nombre_desconocido: (d) =>
    `${q(d.nombre)} no es una celda ni una función: toca la celda que quieres usar.`,
  referencia_a1: (d) =>
    `${q(d.nombre)} parece una celda de hoja de cálculo (A1). Aquí se usan los nombres de los nodos.`,
  referencia_hacia_adelante: (d) =>
    `${q(d.nombre)} está más abajo: una fórmula sólo usa filas de arriba.`,
  ciclo: (d) => `${q(d.nombre)} es esta misma fila: una fila no se usa a sí misma.`,
  grupo_sin_suma: (d) =>
    `${q(d.nombre)} es un grupo: para sumarlo escribe SUMA(${d.nombre ?? '?'}).`,
  grupo_con_otros: (d) =>
    `${q(d.nombre)} es un grupo: SUMA lo suma solo. Escribe SUMA(${d.nombre ?? '?'}) y suma lo demás con +.`,
  // `texto`, una de sus opciones para el ejemplo.
  variante_en_calculo: (d) =>
    `${q(d.nombre)} es la variante: no entra en un cálculo. Para preguntar por una opción, escribe ${d.nombre ?? '?'}="${d.texto ?? 'clave'}".`,
  funcion_desconocida: (d) =>
    `${q(d.nombre)} no es una función. Puedes usar SUMA, SI, Y, O, MAX, MIN, BUSCARV, REDONDEAR, PORCENTAJE_DE y DEPRECIAR.`,
  hoy_no_soportado: () =>
    'HOY() todavía no existe: una fórmula no puede depender de la fecha de hoy.',
  cantidad_de_argumentos: cuantosArgumentos,
  argumento_invalido: (d) => `Aquí va ${d.esperado ?? 'otro valor'}.`,
  // `nombre`, la función; `texto`, el ejemplo armado con lo que escribió la persona.
  no_es_condicion: (d) =>
    `${d.nombre ?? 'SI'} necesita una condición, por ejemplo ${d.texto ?? 'remate>1000'}.`,
  opcion_inexistente: (d) => `${q(d.nombre)} no tiene la opción ${q(d.texto)}.`,
  tabla_inexistente: (d) => `La tabla ${q(d.texto)} no existe en este origen.`,
  columna_inexistente: (d) => `La tabla ${q(d.tabla)} no tiene la columna ${q(d.texto)}.`,
  tabla_sin_columnas: (d) => `La tabla ${q(d.texto)} no tiene columnas para buscar.`,
  tabla_sin_tramos: (d) =>
    `Para buscar por tramo, la tabla ${q(d.texto)} necesita las columnas desde y hasta.`,
  tablas_sin_leer: () => 'No pudimos leer las tablas de este origen. Recarga para usar BUSCARV.',
  grupo_vacio: (d) => `El grupo ${q(d.nombre)} no tiene filas antes de esta.`,
  auxiliar_ocupado: (d) =>
    `La fila intermedia ${q(d.nombre)} ya existe: renombra esa fila o escribe la fórmula más corta.`,
  demasiados_terminos: () => 'La fórmula es demasiado grande: usa menos términos.',
}

export const mensajeDe = (codigo: CodigoDeCompilacion, datos: DatosDeError): string =>
  MENSAJES[codigo](datos)

// Dónde empieza cada línea (la primera, en 0). Una pasada.
export function inicioDeLineas(texto: string, m: Medidor): number[] {
  const inicios = [0]
  for (let i = 0; i < texto.length; i += 1) {
    m.visitas += 1
    if (texto.charCodeAt(i) === 10) inicios.push(i + 1)
  }
  return inicios
}

// La línea y la columna (desde 1) de un desplazamiento: búsqueda binaria.
export function tramoDe(
  inicios: readonly number[],
  desde: number,
  hasta: number,
  m: Medidor,
): Tramo {
  let bajo = 0
  let alto = inicios.length - 1
  while (bajo < alto) {
    m.visitas += 1
    const medio = (bajo + alto + 1) >> 1
    if ((inicios[medio] ?? 0) <= desde) bajo = medio
    else alto = medio - 1
  }
  return { desde, largo: hasta - desde, linea: bajo + 1, columna: desde - (inicios[bajo] ?? 0) + 1 }
}
