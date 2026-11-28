import 'server-only'
import { Font } from '@react-pdf/renderer'
import { PESOS_DE_TEXTO } from '../../entities/documento'
import type { PesoDeTexto } from '../../entities/editor/fuentes'
import type { MedirEnGeist } from '../../entities/pdf/geometria-del-pdf'
import { FAMILIA_DEL_ARTE, registrarFuentesDelArte } from './fuentes-del-arte'

// Lo que se usa de una fuente de fontkit (la que react-pdf carga y con la que compone): el ancho de un texto con los mismos rasgos por
// defecto (kerning y ligaduras) con que lo compone react-pdf y lo mide el lienzo. fontkit no trae sus tipos: se mira la forma.
type FuenteMedible = {
  unitsPerEm: number
  layout: (texto: string) => { advanceWidth: number }
}

function esMedible(fuente: unknown): fuente is FuenteMedible {
  return (
    typeof fuente === 'object' &&
    fuente !== null &&
    'unitsPerEm' in fuente &&
    typeof fuente.unitsPerEm === 'number' &&
    'layout' in fuente &&
    typeof fuente.layout === 'function'
  )
}

async function cargar(peso: PesoDeTexto): Promise<FuenteMedible> {
  const fuente = Font.getFont({
    fontFamily: FAMILIA_DEL_ARTE,
    fontWeight: peso,
    fontStyle: 'normal',
  })
  await fuente.load()
  const datos: unknown = fuente.data
  if (!esMedible(datos)) {
    throw new Error(`La Geist ${String(peso)} del PDF no se pudo medir.`)
  }
  return datos
}

// Cómo mide el PDF un texto en Geist: con las mismas fuentes que lo dibujan (react-pdf las carga una vez y las guarda).
export async function medidasDeGeist(): Promise<MedirEnGeist> {
  registrarFuentesDelArte()
  const fuentes = await Promise.all(PESOS_DE_TEXTO.map(cargar))
  const porPeso = new Map(PESOS_DE_TEXTO.map((peso, i) => [peso, fuentes[i]]))
  return (texto, peso, tamano) => {
    const fuente = porPeso.get(peso)
    return fuente ? (fuente.layout(texto).advanceWidth * tamano) / fuente.unitsPerEm : 0
  }
}
