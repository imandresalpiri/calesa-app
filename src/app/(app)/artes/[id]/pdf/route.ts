import { z } from 'zod'
import {
  CABECERA_DE_LO_QUE_FALTA,
  esquemaDelPedidoDelPdf,
  leerPlantillaParaEditar,
  MENSAJE_DOCUMENTO_INVALIDO,
  MENSAJE_DOCUMENTO_PESADO,
  MENSAJE_SIN_EL_PDF,
  MENSAJE_SIN_LA_PLANTILLA,
  nombreDelPdf,
  PESO_MAXIMO_DEL_PEDIDO,
  SIN_MEDIO,
  tipoDelFormato,
  validarDocumento,
  type DocumentoDeArte,
  type EjemploElegido,
} from '@/modules/artes'
import { requerirSesion } from '@/modules/equipo'
import { bytesConTope } from '../../../_arte/pdf/bajar-con-tope'
import { vieneDelMismoOrigen } from '../../../_arte/pdf/mismo-origen'
import { armarElPdfDelArte } from '../../../_arte/pdf/pdf-del-arte'
import { rutaOcultaEnElLive } from '../../../_live/guarda'

// El PDF de una plantilla de arte de PDF (Carta o A4) pedido desde el editor: lo que se ve, también sin guardar, con los datos del vehículo de
// ejemplo elegido (o los de ejemplo), cada página en una hoja con texto real. Con la sesión de quien pide (la RLS decide; nunca la secret key):
// la plantilla, el vehículo, la cotización, el lead y las imágenes se vuelven a leer por id; del navegador sólo se usan el documento (validado
// como al guardar) y los ids. Lo elegido no se guarda.
//
//   POST /artes/<id>/pdf   { documento, eleccion: { vehiculoId, cotizacionId, leadId } | null }
//   200 application/pdf (adjunto, `X-Imagenes-Que-Faltan: <n>`) | 307 al ingreso | 403 de otro sitio | 404 | 413 | 422 | 500, en text/plain
//
// POST porque el PDF es lo que se ve, como «Exportar PNG»: un GET de lo guardado obligaba a guardar antes. 404 si la plantilla no se ve, no es de
// PDF, el Modo Live esconde Artes o el vehículo elegido ya no se ve. Una imagen que no llega no es un error: el PDF sale sin ella y la cuenta.
const OTRO_SITIO = 'Pide el PDF desde el editor de artes.'

const texto = (cuerpo: string, status: number) =>
  new Response(cuerpo, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SIN_MEDIO },
  })

type Pedido = { documento: DocumentoDeArte; eleccion: EjemploElegido | null }

const invalido = (mensaje: string) =>
  texto(mensaje, mensaje === MENSAJE_DOCUMENTO_PESADO ? 413 : 422)

function deLosBytes(bytes: Uint8Array): Pedido | Response {
  let crudo: unknown
  try {
    crudo = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return invalido(MENSAJE_DOCUMENTO_INVALIDO)
  }
  const pedido = esquemaDelPedidoDelPdf.safeParse(crudo)
  if (!pedido.success) {
    return invalido(MENSAJE_DOCUMENTO_INVALIDO)
  }
  const documento = validarDocumento(pedido.data.documento)
  return documento.ok
    ? { documento: documento.data, eleccion: pedido.data.eleccion }
    : invalido(documento.error.mensaje)
}

// El cuerpo, sin leer más que su tope: lo que pasa, 413; lo que no es un documento válido, 422.
async function leerElPedido(peticion: Request): Promise<Pedido | Response> {
  if (Number(peticion.headers.get('content-length')) > PESO_MAXIMO_DEL_PEDIDO) {
    return invalido(MENSAJE_DOCUMENTO_PESADO)
  }
  const bytes = peticion.body
    ? await bytesConTope(peticion.body, PESO_MAXIMO_DEL_PEDIDO)
    : new Uint8Array()
  return bytes === null ? invalido(MENSAJE_DOCUMENTO_PESADO) : deLosBytes(bytes)
}

async function laPlantillaDePdf(id: string) {
  const leida = await leerPlantillaParaEditar(id)
  if (!leida.ok) {
    return texto(MENSAJE_SIN_EL_PDF, 500)
  }
  const plantilla = leida.data
  return plantilla === null || tipoDelFormato(plantilla.formato) !== 'pdf'
    ? texto(MENSAJE_SIN_LA_PLANTILLA, 404)
    : plantilla
}

export async function POST(peticion: Request, { params }: RouteContext<'/artes/[id]/pdf'>) {
  // La segunda barrera tras el proxy: sin sesión, al ingreso. Antes de leer nada.
  const sesion = await requerirSesion()
  if (!vieneDelMismoOrigen(peticion.headers)) {
    return texto(OTRO_SITIO, 403)
  }
  const { id } = await params
  if ((await rutaOcultaEnElLive('cotizaciones')) || !z.guid().safeParse(id).success) {
    return texto(MENSAJE_SIN_LA_PLANTILLA, 404)
  }
  const pedido = await leerElPedido(peticion)
  if (pedido instanceof Response) {
    return pedido
  }
  const plantilla = await laPlantillaDePdf(id)
  if (plantilla instanceof Response) {
    return plantilla
  }
  const armado = await armarElPdfDelArte(sesion, { plantilla, ...pedido })
  if (!armado.ok) {
    return armado.error.codigo === 'no_encontrado'
      ? texto(armado.error.mensaje, 404)
      : texto(MENSAJE_SIN_EL_PDF, 500)
  }
  return new Response(armado.data.bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombreDelPdf(plantilla.nombre)}"`,
      [CABECERA_DE_LO_QUE_FALTA]: String(armado.data.faltan),
      ...SIN_MEDIO,
    },
  })
}
