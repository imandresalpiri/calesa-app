import { z } from 'zod'
import { validarDocumento } from '../../../entities/documento'
import { CLAVES_DE_FORMATO, medidasDelFormato } from '../../../entities/formatos'
import { esquemaDelNombreDeArte } from '../../../entities/nombres'

// Lo que cruza el límite de las plantillas de arte. Los ids con `z.guid()`, el nombre con la regla de la base (1 a 80 letras sin los bordes)
// y la versión esperada como el texto que dio la base: nunca pasa por `Date`. Lo que el formulario no puede saber (el permiso, si la imagen
// existe, el tope de 512 KiB medido como lo mide la base) lo dicen la action y la RPC.
const version = z.string().min(1)
const lado = z.number().int().nullable()
// Un documento de arte que pasa la forma, la versión y el tope de 512 KiB.
const documentoValido = z.unknown().superRefine((crudo, contexto) => {
  const leido = validarDocumento(crudo)
  if (!leido.ok) {
    contexto.addIssue({ code: 'custom', message: leido.error.mensaje })
  }
})

export const esquemaCrearPlantillaDeArte = z
  .object({
    // El del intento: el mismo en cada reintento.
    id: z.guid(),
    nombre: esquemaDelNombreDeArte,
    formato: z.enum(CLAVES_DE_FORMATO),
    origenId: z.guid(),
    // Sólo en «Personalizado»; en los demás formatos, las medidas son las del formato.
    ancho: lado,
    alto: lado,
  })
  .superRefine((pedido, contexto) => {
    const medidas = medidasDelFormato(pedido.formato, {
      ancho: pedido.ancho ?? 0,
      alto: pedido.alto ?? 0,
    })
    if (!medidas.ok) {
      contexto.addIssue({ code: 'custom', path: ['ancho'], message: medidas.error.mensaje })
    }
  })

export const esquemaDuplicarPlantillaDeArte = z.object({
  idNuevo: z.guid(),
  fuente: z.guid(),
  nombre: esquemaDelNombreDeArte,
})

export const esquemaVisibilidadDeLaPlantilla = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  visibilidad: z.enum(['privada', 'empresa']),
})

export const esquemaEliminarPlantillaDeArte = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
})

export const esquemaPonerPorDefecto = z.object({
  origenId: z.guid(),
  tipo: z.enum(['imagen', 'pdf']),
  // Nulo la quita.
  plantillaId: z.guid().nullable(),
  // Nulo: quien mira no tenía una en ese lugar.
  actualizadoEnEsperado: version.nullable(),
})

// Guardar lo que el editor de artes cambió. El documento pasa la forma, la versión y el tope; la miniatura es la ruta ya subida al bucket
// `artes` (nula conserva la que tiene).
export const esquemaGuardarPlantillaDeArte = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  nombre: esquemaDelNombreDeArte,
  documento: documentoValido,
  miniaturaRuta: z
    .string()
    .regex(/^miniaturas\/[0-9a-f]{64}\.(webp|png|jpg)$/)
    .nullable(),
})

// «Duplicar en otro formato»: la copia nace privada de quien duplica, en el origen de la fuente. Desde el editor llega el documento que se ve
// (sin guardar antes); desde la lista, nulo, y la action lee el de la base. Que el formato sea del mismo tipo lo mira la action, contra la fuente.
export const esquemaDuplicarEnOtroFormato = z
  .object({
    idNuevo: z.guid(),
    fuente: z.guid(),
    nombre: esquemaDelNombreDeArte,
    formato: z.enum(CLAVES_DE_FORMATO),
    ancho: lado,
    alto: lado,
    documento: documentoValido.nullable(),
  })
  .superRefine((pedido, contexto) => {
    const medidas = medidasDelFormato(pedido.formato, {
      ancho: pedido.ancho ?? 0,
      alto: pedido.alto ?? 0,
    })
    if (!medidas.ok) {
      contexto.addIssue({ code: 'custom', path: ['ancho'], message: medidas.error.mensaje })
    }
  })

// «Ver más» de la rejilla: los filtros de la URL (ya leídos) y el cursor opaco que dio la página anterior. Quién es «yo» lo dice la sesión.
export const esquemaVerMasPlantillas = z.object({
  pedido: z.object({
    origenId: z.guid().nullable(),
    formato: z.enum(CLAVES_DE_FORMATO).nullable(),
    de: z.enum(['mias', 'empresa']).nullable(),
  }),
  cursor: z.string().min(1).max(500),
})

export type EntradaDeCrearPlantillaDeArte = z.input<typeof esquemaCrearPlantillaDeArte>
export type EntradaDeDuplicarPlantillaDeArte = z.input<typeof esquemaDuplicarPlantillaDeArte>
export type EntradaDeVisibilidadDeLaPlantilla = z.input<typeof esquemaVisibilidadDeLaPlantilla>
export type EntradaDeEliminarPlantillaDeArte = z.input<typeof esquemaEliminarPlantillaDeArte>
export type EntradaDePonerPorDefecto = z.input<typeof esquemaPonerPorDefecto>
export type EntradaDeGuardarPlantillaDeArte = z.input<typeof esquemaGuardarPlantillaDeArte>
export type EntradaDeDuplicarEnOtroFormato = z.input<typeof esquemaDuplicarEnOtroFormato>
