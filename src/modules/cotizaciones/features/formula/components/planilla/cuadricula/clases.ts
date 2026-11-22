// Las clases de la cuadrícula de la planilla: # y A van pegadas a la izquierda (con fondo propio) al desplazarse de costado, en el celular y con el texto al 200 %.
// El texto de una C (una fórmula, de dónde sale) se recorta con «…» y va entero en su `title` y en la barra. El fondo de la C dice el tipo de celda (la leyenda
// de tipos usa los mismos). Ejemplo deja lugar a la derecha para el «⋯» de la fila.
import type { TipoDeCelda } from '../../../../../entities/formula/tipo-de-celda'

export const COLUMNAS = 5
// 44 px de alto en una pantalla táctil: cada celda se toca (para elegirla o nombrarla en lo que se escribe).
export const CELDA =
  'h-[44px] border-b border-(--color-line) px-2 py-1.5 align-middle md:pointer-fine:h-9'
export const NUMERO = `${CELDA} sticky left-0 z-10 w-10 cursor-grab bg-(--color-surface) text-right font-mono text-(length:--text-xs) font-normal text-(--color-ink-faint) tabular-nums select-none`
export const CONCEPTO = `${CELDA} sticky left-10 z-10 min-w-48 border-r bg-(--color-surface) text-left break-words`
export const PORCENTAJE = `${CELDA} w-28 text-right tabular-nums`
export const VALOR = `${CELDA} w-40 text-right tabular-nums`
export const VALOR_TEXTO = `${CELDA} w-40 text-left`
// Lo de adentro de una C con texto: una línea, recortada.
export const TEXTO_RECORTADO = 'block max-w-56 truncate'
export const EJEMPLO = `${CELDA} relative w-40 pr-12 text-right tabular-nums`
// La celda activa: un contorno por dentro (no mueve nada); la que se escribe, además, sin relleno (la entrada ocupa la celda).
export const ACTIVA = 'outline-2 -outline-offset-2 outline-(--color-primario-ink)'
export const EN_EDICION = 'p-0'

export const FONDO_DEL_TIPO: Record<TipoDeCelda, string> = {
  valor_fijo: 'bg-(--color-celda-fijo)',
  calculo: '',
  lo_escribe_el_asesor: 'bg-(--color-celda-input)',
  dato_del_vehiculo: 'bg-(--color-celda-input)',
  tipo_de_cambio: 'bg-(--color-surface-2)',
  de_una_tabla: 'bg-(--color-surface-2)',
  interruptor: 'bg-(--color-info-soft)',
  variante: 'bg-(--color-info-soft)',
}

// El borde de una celda nombrada en lo que se escribe, del color de su referencia (`--viz-series-1..6`, en ciclo).
export const bordeDeReferencia = (color: number) => ({
  boxShadow: `inset 0 0 0 2px var(--viz-series-${String((color % 6) + 1)})`,
})

export const NOMBRE_DE_LA_COLUMNA = {
  A: 'concepto',
  B: '%',
  C: 'valor',
  D: 'ejemplo',
} as const
