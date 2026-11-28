import { z } from 'zod'
import { CABECERA_DE_LO_QUE_FALTA } from '@/modules/artes'
import {
  archivoDelPdf,
  contextoDeLaPagina,
  leerHojaDeUnaGuardada,
  pdfDeUnaGuardada,
} from '@/modules/cotizaciones'
import { PESO_MAXIMO_LOGO, leerAjustes } from '@/modules/empresa'
import { requerirSesion } from '@/modules/equipo'
import { urlPublicaONull } from '@/shared/lib/almacen'
import {
  asesorQueMira,
  clienteDe,
  oNulo,
  tituloDeLaTarjeta,
  vehiculoDe,
  vehiculoDeLaTarjeta,
} from '../../datos-de-la-tarjeta'
import { CABECERA_DEL_ARTE, pdfConElArte, type PdfConArte } from './arte-del-pdf'
import { hermanaDelPdf } from './hermana-del-pdf'
import { origenOcultoEnElLive, rutaOcultaEnElLive } from '../../../_live/guarda'

// El PDF de una cotización guardada (4.18-3a, `docs/COTIZADOR.md` › «Plantilla de tarjeta (PDF)»): la tarjeta de **lo guardado** en A4, armada en el servidor con la sesión de
// quien lo pide (la RLS de la hoja guardada y de `cotizacion_tarjeta()` deciden; nunca la secret key). Lo ve quien ve la cotización (P4), sin clave propia.
//
// Con una plantilla de arte de PDF (la de `?plantilla=` o, sin él, la por defecto del origen: `arte-del-pdf.ts`), el arte con los datos reales de
// la guardada en su lugar; sin ella, el PDF de hoy, sin cambios.
//
//   GET /cotizaciones/<id>/pdf[?plantilla=<id>]
//   200 application/pdf (adjunto «cotizacion-<n>.pdf», `X-Pdf-Arte: <plantilla>|de-hoy` y, con arte, `X-Imagenes-Que-Faltan: <n>`)
//   | 307 al ingreso o a cerrar la sesión | 404 text/plain | 500 text/plain
//
// Lo que no existe, está en la papelera o no se ve es el mismo 404 que la página, nunca 403: decirlo confirmaría que existe. Si el arte elegido
// falla, 500: no sale en silencio el PDF de hoy en vez del que se pidió.
const NO_DISPONIBLE = 'Esta cotización ya no está disponible: no existe o ya no tienes acceso.'
const NO_SE_PUDO = 'No se pudo armar el PDF. Vuelve a intentarlo.'
const SIN_GUARDAR = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }

const texto = (cuerpo: string, status: number) =>
  new Response(cuerpo, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SIN_GUARDAR },
  })

type LaGuardada = Extract<Awaited<ReturnType<typeof leerHojaDeUnaGuardada>>, { ok: true }>['data']

// La guardada que pide la URL, si quien mira la ve (con el Modo Live, en un área y un origen que muestra); si no, la respuesta que toca.
async function laGuardadaQueSeVe(
  params: RouteContext<'/cotizaciones/[id]/pdf'>['params'],
): Promise<{ lectura: LaGuardada } | { respuesta: Response }> {
  if (await rutaOcultaEnElLive('cotizaciones')) {
    return { respuesta: texto(NO_DISPONIBLE, 404) }
  }
  const { id } = await params
  if (!z.guid().safeParse(id).success) {
    return { respuesta: texto(NO_DISPONIBLE, 404) }
  }
  const lectura = await leerHojaDeUnaGuardada(id)
  if (!lectura.ok) {
    return {
      respuesta:
        lectura.error.codigo === 'sin_permiso' ? texto(NO_DISPONIBLE, 404) : texto(NO_SE_PUDO, 500),
    }
  }
  if (await origenOcultoEnElLive(lectura.data.hoja.cotizacion.origenId)) {
    return { respuesta: texto(NO_DISPONIBLE, 404) }
  }
  return { lectura: lectura.data }
}

// El PDF del arte, con el nombre del de hoy: lo que ya no se ve, el 404 de siempre; otro fallo, 500.
function respuestaDelArte({ plantillaId, pdf }: PdfConArte, numero: number): Response {
  if (!pdf.ok) {
    return pdf.error.codigo === 'no_encontrado' ? texto(NO_DISPONIBLE, 404) : texto(NO_SE_PUDO, 500)
  }
  return new Response(pdf.data.bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${archivoDelPdf(numero) ?? 'cotizacion.pdf'}"`,
      [CABECERA_DEL_ARTE]: plantillaId,
      [CABECERA_DE_LO_QUE_FALTA]: String(pdf.data.faltan),
      ...SIN_GUARDAR,
    },
  })
}

export async function GET(peticion: Request, { params }: RouteContext<'/cotizaciones/[id]/pdf'>) {
  // La segunda barrera tras el proxy: sin sesión, al ingreso; con la cuenta dada de baja, a cerrar la sesión. Antes de leer nada.
  const sesion = await requerirSesion()
  const leida = await laGuardadaQueSeVe(params)
  if ('respuesta' in leida) {
    return leida.respuesta
  }
  const { lectura } = leida
  const pedida = new URL(peticion.url).searchParams.get('plantilla')
  const conArte = await pdfConElArte(sesion, lectura, pedida)
  return conArte === null
    ? elPdfDeHoy(sesion, lectura)
    : respuestaDelArte(conArte, lectura.hoja.cotizacion.numero)
}

// La tarjeta de lo guardado en A4, con su hermana en otra página.
async function elPdfDeHoy(
  sesion: Awaited<ReturnType<typeof requerirSesion>>,
  lectura: LaGuardada,
): Promise<Response> {
  const { hoja } = lectura
  // Los ajustes por `leerAjustes()`, que falla: un PDF que va al cliente no sale con el locale o la zona de fábrica.
  const [cliente, vehiculo, asesor, ajustes] = await Promise.all([
    oNulo(clienteDe(sesion, hoja.cotizacion.leadId)),
    oNulo(vehiculoDe(hoja.cotizacion.vehiculoId)),
    asesorQueMira(),
    leerAjustes(),
  ])
  if (!ajustes.ok) {
    return texto(NO_SE_PUDO, 500)
  }
  const { nombre, logoRuta, locale, zonaHoraria } = ajustes.data.ajustes
  const url = urlPublicaONull('marca', logoRuta)
  const logo = url === null ? null : { nombre, url }
  const nombreDelCliente = cliente?.nombre ?? null
  // La hermana disponible va en otra página del mismo PDF (glosario: «Cotizaciones hermanas»).
  const hermana = await hermanaDelPdf(hoja, {
    cliente: nombreDelCliente,
    asesor,
    vehiculo,
    empresa: nombre,
    logo,
    zona: zonaHoraria,
  })
  const pdf = await pdfDeUnaGuardada({
    ...(hermana ? { hermana } : {}),
    lectura,
    // El día del último guardado (P3 del 4.18-2) y el del vencimiento, en la zona de la empresa: lo mismo que la vista previa de esa guardada.
    contexto: contextoDeLaPagina(
      {
        // El de la página (sin el de respaldo «Cotización n.º N»); los metadatos del PDF no lo llevan (puede nombrar el vehículo).
        titulo: tituloDeLaTarjeta(hoja.cotizacion, vehiculo),
        cliente: nombreDelCliente,
        vehiculo: vehiculoDeLaTarjeta(vehiculo),
        asesor,
        numero: hoja.cotizacion.numero,
        venceEl: hoja.venceEl,
        guardadaEl: hoja.cotizacion.actualizadoEn,
        empresa: nombre,
        logo,
      },
      { zona: zonaHoraria, hoy: hoja.cotizacion.actualizadoEn },
    ),
    locale,
    empresa: nombre,
    topeDelLogo: PESO_MAXIMO_LOGO,
  })
  if (!pdf.ok) {
    return pdf.error.codigo === 'sin_permiso' ? texto(NO_DISPONIBLE, 404) : texto(NO_SE_PUDO, 500)
  }
  return new Response(pdf.data.bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdf.data.archivo}"`,
      [CABECERA_DEL_ARTE]: 'de-hoy',
      ...SIN_GUARDAR,
    },
  })
}
