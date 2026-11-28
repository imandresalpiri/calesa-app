import 'server-only'
import { renderToBuffer } from '@react-pdf/renderer'
import type { Medidas } from '../../entities/formatos'
import { geometriaDelPdf } from '../../entities/pdf/geometria-del-pdf'
import { imagenesDelPdf, type PaginaConDatos } from '../../entities/pdf/paginas-con-datos'
import type { PaginaDelPdf, PrimitivaDelPdf } from '../../entities/pdf/primitivas-del-pdf'
import { DocumentoDelArte } from './documento-del-arte'
import {
  imagenParaElPdf,
  leerImagen,
  type ImagenLeida,
  type ImagenParaElPdf,
} from './imagen-para-el-pdf'
import { medidasDeGeist } from './medidas-de-geist'

// Los bytes del PDF de un arte con unos datos: cada página en una hoja del formato, con texto real en Geist. Lo carga la composición con
// `import()` al pedir un PDF: ninguna otra ruta paga react-pdf ni sharp, y nunca llega al navegador. Las imágenes llegan en bytes por su `src`
// (`imagenesDelPdf()` dice cuáles); una que no llegó o que no se lee no se dibuja y cuenta en `faltan`, que la ruta avisa.
export type PedidoDelPdfDelArte = {
  paginas: readonly PaginaConDatos[]
  medidas: Medidas
  imagenes: ReadonlyMap<string, Uint8Array>
  titulo: string
  autor: string
}

export type PdfDelArte = { bytes: Uint8Array<ArrayBuffer>; faltan: number }

type Leida = { bytes: Uint8Array; leida: ImagenLeida }

async function leerLasImagenes(
  imagenes: ReadonlyMap<string, Uint8Array>,
): Promise<Map<string, Leida>> {
  const leidas = await Promise.all(
    [...imagenes].map(async ([src, bytes]) => {
      const leida = await leerImagen(bytes)
      return leida ? ([[src, { bytes, leida }]] as const) : []
    }),
  )
  return new Map(leidas.flat())
}

type DeImagen = Extract<PrimitivaDelPdf, { tipo: 'imagen' }>

// Cada imagen preparada para su primitiva; la misma parte de la misma imagen en el mismo lugar se prepara una vez.
async function prepararLasImagenes(
  paginas: readonly PaginaDelPdf[],
  leidas: ReadonlyMap<string, Leida>,
): Promise<Map<PrimitivaDelPdf, ImagenParaElPdf>> {
  const preparadas = new Map<string, Promise<ImagenParaElPdf | null>>()
  const deImagen = paginas.flatMap((p) =>
    p.primitivas.filter((x): x is DeImagen => x.tipo === 'imagen'),
  )
  const listas = await Promise.all(
    deImagen.map(async (primitiva) => {
      const leida = leidas.get(primitiva.src)
      if (!leida) {
        return []
      }
      const { recorte, lugar } = primitiva
      const clave = JSON.stringify([primitiva.src, recorte, lugar.ancho, lugar.alto])
      let preparada = preparadas.get(clave)
      if (!preparada) {
        preparada = imagenParaElPdf(leida.bytes, leida.leida, recorte, lugar)
        preparadas.set(clave, preparada)
      }
      const imagen = await preparada
      return imagen ? ([[primitiva, imagen]] as const) : []
    }),
  )
  return new Map(listas.flat())
}

// Las imágenes que se piden y no se dibujan: no llegaron, no se leen o no se pudieron preparar (sin repetir).
function lasQueFaltan(
  pedido: PedidoDelPdfDelArte,
  paginas: readonly PaginaDelPdf[],
  preparadas: ReadonlyMap<PrimitivaDelPdf, ImagenParaElPdf>,
  leidas: ReadonlyMap<string, Leida>,
): number {
  const faltan = new Set(imagenesDelPdf(pedido.paginas).filter((src) => !leidas.has(src)))
  for (const primitiva of paginas.flatMap((p) => p.primitivas)) {
    if (primitiva.tipo === 'imagen' && !preparadas.has(primitiva)) {
      faltan.add(primitiva.src)
    }
  }
  return faltan.size
}

export async function pdfDelArte(pedido: PedidoDelPdfDelArte): Promise<PdfDelArte> {
  const [medir, leidas] = await Promise.all([medidasDeGeist(), leerLasImagenes(pedido.imagenes)])
  const naturales = new Map([...leidas].map(([src, l]) => [src, l.leida.medidas]))
  const paginas = pedido.paginas.map(({ pagina, conDatos }) =>
    geometriaDelPdf(pagina, { medidas: pedido.medidas, conDatos, imagenes: naturales, medir }),
  )
  const imagenes = await prepararLasImagenes(paginas, leidas)
  const documento = DocumentoDelArte({
    paginas,
    imagenes,
    titulo: pedido.titulo,
    autor: pedido.autor,
  })
  return {
    bytes: new Uint8Array(await renderToBuffer(documento)),
    faltan: lasQueFaltan(pedido, paginas, imagenes, leidas),
  }
}
