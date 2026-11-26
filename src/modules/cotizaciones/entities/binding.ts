import type { FormatoDeXCell } from '@/shared/ui/xcell'
import type { Entradas, IndiceDeHoja } from './entradas'
import type { CeldaDeHoja, ItemDeHoja, MotivoDeCandado, SeccionDeHoja } from './hoja'
import type { Estado } from './motor-contexto'
import { propsDelPisado, type PropsDelPisado } from './binding-pisado'
import { numeroDe } from './binding-resumen'
import { formatoDeCelda, monedaDeFormato } from './formato-de-celda'
import type { RespuestaDeRecalculo } from './recalculo'
import { textoDelFaltante } from './textos-de-faltantes'

export { SE_ELIGE_EN_EL_PANEL, textoDelFaltante } from './textos-de-faltantes'
export {
  secundariosDelResumen,
  totalDelResumen,
  valorDeSubtotal,
  type SecundarioDelResumen,
  type TotalDelResumen,
} from './binding-resumen'

// El binding de la hoja con la XCell (`docs/COTIZADOR.md` › «Binding con la XCell»): de la lectura que abrió la hoja, lo que la persona tipeó y la última respuesta del
// recálculo, las props primitivas de cada celda. Puro: la celda no calcula nada y la hoja sólo traduce. **Los textos son de este archivo y nunca el mensaje de la base**:
// un mensaje del motor puede nombrar un nodo que quien mira no ve.
export type ContextoDeHoja = {
  indice: IndiceDeHoja
  entradas: Entradas
  // Nula mientras no hay una respuesta (la inicial falló, o la variante espera su elección).
  respuesta: RespuestaDeRecalculo | null
  // Los campos del vehículo que quien mira elige en el panel del vehículo (4.14-2c3): la celda sin valor por uno de ellos dice dónde se elige.
  seEligen?: ReadonlySet<string>
  // Los datos del vehículo con que casa una tabla de la ayuda («Tu vehículo»: `valoresParaCasar()` de `vehiculos`, que manda la página). Sin ellos no se marca ninguna fila
  // que case por un dato del vehículo.
  valoresDelVehiculo?: Readonly<Record<string, number | string>>
  // El origen de la hoja: la ayuda lleva a quien configura a sus tablas («Editar en la configuración») y sabe si publicar una tabla le dio una versión nueva.
  origenId?: string
}

export type PropsDeCelda = {
  id: string
  label: string
  format: FormatoDeXCell
  currency: string | undefined
  // Los «Decimales» de cada lado (glosario), del nodo; sin ellos, «Automático». Sólo la vista.
  decimals: number | undefined
  value: number | null
  defaultValue: null | undefined
  suggested: boolean
  overridden: boolean
  // Un candado por lado (4.13-3c): el del principal y el del secundario del par.
  disabledReason: string | undefined
  secondaryDisabledReason: string | undefined
  tone: string | undefined
  error: string | undefined
  secondaryId: string | undefined
  secondaryValue: number | null | undefined
  secondaryFormat: FormatoDeXCell | undefined
  secondaryDecimals: number | undefined
  // El diseño dice que el secundario del par es el monto (`secundario: 'monto'`): el % va primero y grande, «14.94 % $181».
  secondaryProminent: true | undefined
} & PropsDelPisado

export { formatoDeCelda, monedaDeFormato } from './formato-de-celda'

// ---------------------------------------------------------------------------------------------------------------------------------
// Los textos
// ---------------------------------------------------------------------------------------------------------------------------------
export function textoDelCandado(motivo: MotivoDeCandado | null): string {
  switch (motivo?.codigo) {
    case 'se_calcula':
      return 'Se calcula con los demás datos.'
    case 'del_vehiculo':
      return 'Viene del vehículo.'
    case 'nivel':
      return `Lo edita quien tiene el nivel «${motivo.nivel}».`
    case 'no_se_edita':
    case undefined:
      return 'No se edita en esta hoja.'
    default: {
      const _: never = motivo
      return _
    }
  }
}

// Por qué una celda vale 0 sin calcularse. Si la bandera que la habilita no llegó (el nivel la esconde), no se nombra: «Está apagada en esta hoja.»
export function textoDelEstado(
  estado: Exclude<Estado, 'activo'>,
  celda: Pick<CeldaDeHoja, 'condicion' | 'soloEn'>,
  indice: IndiceDeHoja,
): string {
  if (estado === 'fuera_de_variante') {
    const opciones = (celda.soloEn ?? []).flatMap((clave) => indice.opciones.get(clave) ?? [])
    return opciones.length > 0 ? `Sólo en ${opciones.join(', ')}.` : 'No aplica a esta variante.'
  }
  const interruptor =
    celda.condicion === null ? undefined : indice.interruptores.get(celda.condicion)
  return interruptor ? `Se habilita con «${interruptor.etiqueta}».` : 'Está apagada en esta hoja.'
}

export const FALTA_UN_DATO = 'Falta un dato para calcular esto.'

// Un faltante por el dato del vehículo (sin valor, o que la tabla no tiene) de una celda cuyo dato se elige en el panel dice dónde se elige.
const seEligeEnElPanel = (celda: CeldaDeHoja, c: ContextoDeHoja): boolean =>
  c.seEligen !== undefined &&
  celda.datoDelVehiculo !== null &&
  celda.datoDelVehiculo.columnas.some(({ campo }) => c.seEligen?.has(campo) === true)

// ---------------------------------------------------------------------------------------------------------------------------------
// Qué se dibuja
// ---------------------------------------------------------------------------------------------------------------------------------
// Una celda de una bandera de efecto «muestra» no se dibuja mientras la bandera está apagada (la garantía). Con la bandera escondida por el nivel no hay
// interruptor que lo diga: la celda se dibuja deshabilitada, no se esconde por una ausencia.
function apagadaPorSuInterruptor(celda: CeldaDeHoja, c: ContextoDeHoja): boolean {
  if (celda.condicion === null) {
    return false
  }
  const interruptor = c.indice.interruptores.get(celda.condicion)
  return interruptor?.efecto === 'muestra' && !c.entradas.banderas.has(celda.condicion)
}

export function itemSeDibuja(item: ItemDeHoja, c: ContextoDeHoja): boolean {
  if (item.tipo === 'celda') {
    return !apagadaPorSuInterruptor(item, c)
  }
  if (item.tipo === 'atajos') {
    // Los atajos van sobre la celda de su nodo, o del porcentaje que ella muestra.
    const celda = c.indice.lados.get(item.nodo)?.celda
    return celda !== undefined && !apagadaPorSuInterruptor(celda, c)
  }
  return true
}

export const seccionSeDibuja = (seccion: SeccionDeHoja, c: ContextoDeHoja): boolean =>
  seccion.items.some((item) => itemSeDibuja(item, c))

// ---------------------------------------------------------------------------------------------------------------------------------
// Una celda
// ---------------------------------------------------------------------------------------------------------------------------------
// Lo tipeado manda sobre lo calculado mientras la respuesta no lo alcanza: la celda no vuelve al número viejo durante la pausa ni cuando el recálculo falla.
function valorDe(id: string, esInput: boolean, c: ContextoDeHoja): number | null {
  const tipeado = esInput ? c.entradas.inputs.get(id) : c.entradas.overrides.get(id)
  return tipeado ?? numeroDe(c.respuesta?.valores.get(id))
}

type CandadosDeCelda = { principal: string | undefined; secundario: string | undefined }

// El candado de cada lado (4.13-3c): el par es una celda con dos lados y cada uno dice el suyo. Una celda apagada lo está entera, con el texto del estado en los dos.
function candadosDe(
  celda: CeldaDeHoja,
  apagada: Exclude<Estado, 'activo'> | null,
  c: ContextoDeHoja,
): CandadosDeCelda {
  if (apagada !== null) {
    const texto = textoDelEstado(apagada, celda, c.indice)
    return { principal: texto, secundario: celda.secundario ? texto : undefined }
  }
  const secundario = celda.secundario
  return {
    principal: celda.editable ? undefined : textoDelCandado(celda.motivo),
    secundario: secundario && !secundario.editable ? textoDelCandado(secundario.motivo) : undefined,
  }
}

function apagadaDe(celda: CeldaDeHoja, c: ContextoDeHoja): Exclude<Estado, 'activo'> | null {
  const estado = c.respuesta?.estados.get(celda.nodo)
  return estado === undefined || estado === 'activo' ? null : estado
}

// El aviso de una celda activa, sólo de lo que se edita en ella (P6 del 4.13-3c): el faltante de un lado que se edita, o «falta un dato» si el principal se edita, vale null y no es
// donde nació el hueco. Un lado con candado dice su motivo y no «falta un dato»; el total dice si algo falta.
function errorDe(
  celda: CeldaDeHoja,
  value: number | null,
  candados: CandadosDeCelda,
  c: ContextoDeHoja,
): string | undefined {
  if (c.respuesta === null) {
    return undefined
  }
  const principal = candados.principal === undefined
  const secundario = celda.secundario !== null && candados.secundario === undefined
  const propio = c.respuesta.faltantes.find(
    (f) =>
      (principal && f.donde === celda.nodo) || (secundario && f.donde === celda.secundario?.nodo),
  )
  if (propio) {
    return textoDelFaltante(propio.codigo, seEligeEnElPanel(celda, c))
  }
  return principal && value === null ? FALTA_UN_DATO : undefined
}

// Con el monto escrito, el porcentaje de un par lo escribe el par (`sigueAlMonto`): el de la respuesta, no uno tipeado antes.
function valorDelSecundario(celda: CeldaDeHoja, nodo: string, c: ContextoDeHoja): number | null {
  const loEscribeElPar =
    celda.secundario?.sigueAlMonto === true && c.entradas.overrides.has(celda.nodo)
  const tipeado = loEscribeElPar
    ? undefined
    : (c.entradas.overrides.get(nodo) ?? c.entradas.inputs.get(nodo))
  return tipeado ?? numeroDe(c.respuesta?.valores.get(nodo))
}

const tieneValorPorDefecto = (celda: CeldaDeHoja) =>
  celda.tipoDeNodo === 'constante' || celda.tipoDeNodo === 'tipo_cambio'

// Si el lado que nombra el id (de cualquiera de los dos de un par) no se puede editar ahora, por qué. Lo usan los atajos, que van sobre un nodo y no se pulsan si su lado
// está bloqueado: los del porcentaje de Transferencia se pulsan aunque el monto se calcule.
export function bloqueoDeLado(nodo: string, c: ContextoDeHoja): string | undefined {
  const lado = c.indice.lados.get(nodo)
  if (!lado) {
    return undefined
  }
  const candados = candadosDe(lado.celda, apagadaDe(lado.celda, c), c)
  return lado.lado === 'principal' ? candados.principal : candados.secundario
}

export function propsDeCelda(celda: CeldaDeHoja, c: ContextoDeHoja): PropsDeCelda {
  const apagada = apagadaDe(celda, c)
  const secundario = celda.secundario
  const value = valorDe(celda.nodo, celda.tipoDeNodo === 'input', c)
  const candados = candadosDe(celda, apagada, c)
  const overridden =
    c.entradas.overrides.has(celda.nodo) ||
    (secundario !== null && c.entradas.overrides.has(secundario.nodo))
  return {
    id: celda.nodo,
    label: celda.etiqueta,
    format: formatoDeCelda(celda.formato),
    currency: monedaDeFormato(celda.formato),
    decimals: celda.decimales,
    value,
    // Sólo una constante o un tipo de cambio tiene un valor por defecto («Volver al valor por defecto»); un cálculo pisado vuelve «al calculado» (`handEdited`)
    // y lo demás, «al sugerido».
    defaultValue: tieneValorPorDefecto(celda) ? null : undefined,
    suggested:
      apagada === null && !overridden && c.respuesta?.fuentes.get(celda.nodo) === 'sugerido',
    overridden,
    disabledReason: candados.principal,
    secondaryDisabledReason: candados.secundario,
    tone: celda.tono ?? undefined,
    error: errorDe(celda, value, candados, c),
    ...propsDelSecundario(celda, c),
    ...propsDelPisado(celda, c.entradas, c.respuesta),
  }
}

// El secundario del par: su id, su valor, su formato y si se lee primero.
function propsDelSecundario(
  celda: CeldaDeHoja,
  c: ContextoDeHoja,
): Pick<
  PropsDeCelda,
  'secondaryId' | 'secondaryValue' | 'secondaryFormat' | 'secondaryDecimals' | 'secondaryProminent'
> {
  const secundario = celda.secundario
  if (secundario === null) {
    return {
      secondaryId: undefined,
      secondaryValue: undefined,
      secondaryFormat: undefined,
      secondaryDecimals: undefined,
      secondaryProminent: undefined,
    }
  }
  return {
    secondaryId: secundario.nodo,
    secondaryValue: valorDelSecundario(celda, secundario.nodo, c),
    secondaryFormat: formatoDeCelda(secundario.formato),
    secondaryDecimals: secundario.decimales,
    secondaryProminent: secundario.como === 'monto' || undefined,
  }
}
