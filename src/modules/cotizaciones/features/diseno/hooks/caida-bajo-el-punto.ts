import {
  EN_LA_VISTA_APILADA,
  type HojaDelTexto,
} from '../../../entities/diseno/anuncios-de-la-rejilla'
import {
  celdaBajo,
  rectanguloDeLaMarca,
  type Punto,
  type Rectangulo,
} from '../../../entities/diseno/geometria-de-la-rejilla'
import { filaSiguiente } from '../../../entities/diseno/lugar-en-la-rejilla'
import type { PiezaDeLaHoja } from '../../../entities/diseno/pieza-de-la-hoja'
import {
  marcaDeLaCaida,
  type Caida,
  type EstadoDeLaMarca,
} from '../../../entities/diseno/soltar-en-la-rejilla'
import { espacioDelId } from './ids-del-lienzo'
import { medirLaRejilla } from './medir-la-rejilla'

// La marca que dibuja el lienzo mientras se arrastra: en qué lugar del arrastre (`en`, el id de su rejilla o de la avanzada), con qué estado y texto, y el
// recuadro que ocuparía la pieza en px de esa rejilla (nulo: toda la avanzada o toda la rejilla que apila).
export type MarcaDibujada = {
  en: string
  estado: EstadoDeLaMarca
  texto: string
  recuadro: Rectangulo | null
}

export type CaidaBajoElPunto = { caida: Caida | 'apilada'; marca: MarcaDibujada }

// Dónde caería `pieza` si se suelta con su punto en `punto` (de la pantalla) sobre el lugar `en`: la celda bajo el punto, medida en el navegador, y la marca
// con lo que pasaría. Nulo si ahí no va (el lienzo no dibuja nada y soltar no cambia nada).
export function caidaBajoElPunto(
  hoja: HojaDelTexto,
  pieza: PiezaDeLaHoja,
  en: string,
  punto: Punto,
): CaidaBajoElPunto | null {
  const espacio = espacioDelId(en)
  if (espacio === null) return null
  if (espacio.espacio === 'avanzada') {
    const m = marcaDeLaCaida(hoja, pieza, espacio)
    return m === null
      ? null
      : { caida: espacio, marca: { en, estado: m.estado, texto: m.texto, recuadro: null } }
  }
  const medida = medirLaRejilla(en)
  if (medida === null) return null
  if (medida.apilada) {
    return {
      caida: 'apilada',
      marca: { en, estado: 'apilada', texto: EN_LA_VISTA_APILADA, recuadro: null },
    }
  }
  // Soltar debajo de todo crea la fila siguiente a la última ocupada; más abajo, nada.
  const filaMaxima = filaSiguiente(
    hoja.diseno,
    espacio.espacio === 'seccion'
      ? { tipo: 'seccion', seccion: espacio.seccion }
      : { tipo: 'principales' },
  )
  const posicion = celdaBajo(medida.alPunto(punto.x, punto.y), medida.geometria, filaMaxima)
  const caida: Caida = { ...espacio, posicion }
  const m = marcaDeLaCaida(hoja, pieza, caida)
  if (m === null) return null
  const recuadro =
    m.lugar === null
      ? null
      : rectanguloDeLaMarca(m.lugar.posicion, m.lugar.tamano, medida.geometria)
  return { caida, marca: { en, estado: m.estado, texto: m.texto, recuadro } }
}
