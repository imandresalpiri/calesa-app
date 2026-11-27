import { z } from 'zod'
import { esquemaDelNombreDeArte } from '../../../entities/nombres'

// Lo que cruza el límite de la biblioteca de imágenes. Las rutas con la forma que exige la base (por el hash del contenido); un SVG es su propia
// miniatura. Lo que el formulario no puede saber (el permiso de subir a la empresa, que el objeto exista) lo dicen la action y la RPC.
const version = z.string().min(1)
const RUTA_DE_IMAGEN = /^imagenes\/[0-9a-f]{64}\.(webp|png|jpg|svg)$/
const RUTA_DE_MINIATURA = /^miniaturas\/[0-9a-f]{64}\.(webp|png|jpg)$/
const MENSAJE_DEL_ARCHIVO = 'El archivo de la imagen no es válido.'
const lado = z.number().int().min(1).max(20000)

export const esquemaCrearImagenDeArte = z
  .object({
    // El del intento: el mismo en cada reintento.
    id: z.guid(),
    nombre: esquemaDelNombreDeArte,
    ruta: z.string().regex(RUTA_DE_IMAGEN, { error: MENSAJE_DEL_ARCHIVO }),
    miniaturaRuta: z.string(),
    tipo: z.enum(['webp', 'png', 'jpg', 'svg']),
    ancho: lado,
    alto: lado,
    ambito: z.enum(['personal', 'empresa']),
  })
  .superRefine((pedido, contexto) => {
    const extension = pedido.ruta.split('.').at(-1)
    const miniatura =
      pedido.tipo === 'svg'
        ? pedido.miniaturaRuta === pedido.ruta
        : RUTA_DE_MINIATURA.test(pedido.miniaturaRuta)
    if (extension !== pedido.tipo || !miniatura) {
      contexto.addIssue({ code: 'custom', path: ['miniaturaRuta'], message: MENSAJE_DEL_ARCHIVO })
    }
  })

export const esquemaRenombrarImagenDeArte = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  nombre: esquemaDelNombreDeArte,
})

export const esquemaQuitarImagenDeArte = z.object({ id: z.guid(), actualizadoEnEsperado: version })

export const esquemaUsosDeLaImagen = z.object({ id: z.guid() })

// «Ver más» de la biblioteca: el cursor opaco que dio la página anterior.
export const esquemaVerMasImagenes = z.object({ cursor: z.string().min(1).max(500) })

export type EntradaCrearImagenDeArte = z.input<typeof esquemaCrearImagenDeArte>
export type EntradaRenombrarImagenDeArte = z.input<typeof esquemaRenombrarImagenDeArte>
