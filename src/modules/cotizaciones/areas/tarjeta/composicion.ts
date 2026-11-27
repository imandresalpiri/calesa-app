// Composición del área `tarjeta` de `cotizaciones` en el servidor (4.15-4). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { RecalculoInicial } from '../../entities/apertura'
import { calculoDeLoGuardado } from '../../entities/calculo-de-la-tarjeta'
import { nombreDelModo } from '../../entities/cabecera-de-la-hoja'
import type { HojaDeUnaGuardada } from '../../entities/hoja-de-una-guardada'
import type { AnchoDeLaImagen } from '../../entities/ruta-de-la-hoja'
import { archivoDelPdf } from '../../entities/tarjeta/archivo-del-pdf'
import {
  lineasDeLaTarjeta,
  type LineasDeLaTarjeta,
} from '../../entities/tarjeta/compartir/lineas-de-la-tarjeta'
import type { ContextoDeLaCotizacion } from '../../entities/tarjeta/contexto-de-la-cotizacion'
import {
  geometriaDeLaTarjeta,
  type Geometria,
} from '../../entities/tarjeta/geometria-de-la-tarjeta'
import { lecturaRetocada } from '../../entities/tarjeta/retoques/aplicar-retoques'
import { getAsesorQueMira } from '../../infra/tarjeta/asesor-que-mira'
import { getAutorDeLaCotizacion } from '../../infra/tarjeta/autor-de-la-cotizacion'
import { getCotizacionVisible } from '../../infra/tarjeta/cotizacion-visible'
import { getHuellaDeLaImagen } from '../../infra/tarjeta/huella-de-la-imagen'
import { setRetoques } from '../../infra/tarjeta/retoques'
import { fotoParaDibujar, logoParaDibujar } from '../../infra/tarjeta/logo-de-la-tarjeta'
import { getTarjeta } from '../../infra/tarjeta/tarjeta'
import { getVehiculoDeLaCotizacion } from '../../infra/tarjeta/vehiculo-de-la-cotizacion'

// El asesor de la tarjeta: quien la mira o la comparte (su nombre, su WhatsApp, su cargo y la ruta de su foto), con `cache()` por request.
export const leerAsesorQueMira = getAsesorQueMira

// El autor de una cotización guardada (quien la creó), para «Creado por» de «Compartir».
export const leerAutorDeLaCotizacion = getAutorDeLaCotizacion

// La huella de la imagen de la tarjeta para quien la pide (`cotizacion_imagen_huella()`): la base de su ETag. Lo que no se ve, `no_encontrado`.
export const leerHuellaDeLaImagen = getHuellaDeLaImagen

// El vehículo de una cotización guardada (por clave primaria, sin la papelera), para las fotos de «Compartir la cotización».
export const leerVehiculoDeLaCotizacion = getVehiculoDeLaCotizacion

// Si quien pide ve una cotización guardada (por clave primaria, sin la papelera; la RLS decide): antes de redactar con el asistente de IA.
export const leerCotizacionVisible = getCotizacionVisible

// Los retoques de la tarjeta de una cotización (`cotizacion_retocar_tarjeta()`, con la sesión de quien retoca): la base pide poder guardarla y la versión.
export const guardarLosRetoques = setRetoques

export type EntradaDelPdf = {
  // Lo que leyó `leerHojaDeUnaGuardada()` con la sesión de quien pide.
  lectura: { hoja: HojaDeUnaGuardada; inicial: RecalculoInicial }
  // Lo de la cotización, ya armado por la ruta (`contextoDeLaPagina()`): la fecha del último guardado en la zona de la empresa, el número, el título, el asesor,
  // el cliente si quien pide lo ve, el vehículo con lote y VIN, el vencimiento y el logo.
  contexto: ContextoDeLaCotizacion
  locale: string
  empresa: string
  topeDelLogo: number
  // La cotización hermana con su contexto (glosario: «Cotizaciones hermanas»): su tarjeta va en otra página del mismo PDF, en el orden de las opciones.
  hermana?: Pick<EntradaDelPdf, 'lectura' | 'contexto'> & { antes: boolean }
}

type EntradaDeLaGeometria = Pick<EntradaDelPdf, 'lectura' | 'contexto' | 'locale'>

// La geometría de la tarjeta de **lo guardado** de una cotización (`calculoDeLoGuardado()`, como «Vista previa» de esa guardada; nunca lo de hoy), con la lectura
// de la tarjeta de SU versión como quien pide y SUS retoques (los que aplican: `lecturaRetocada()`). El PDF, compartir y la imagen salen de aquí. `sin_permiso`
// si la tarjeta no se ve.
// `dibujar(sinMoneda)` dibuja la geometría de la misma lectura con su moneda o sin ella (la variante del Modo Live), sin volver a leer.
async function dibujoDeUnaGuardada(
  entrada: EntradaDeLaGeometria,
): Promise<Resultado<{ dibujar: (sinMoneda: boolean) => Geometria; hoja: HojaDeUnaGuardada }>> {
  const { hoja, inicial } = entrada.lectura
  const tarjeta = await getTarjeta(hoja.diseno.formula.id)
  if (!tarjeta.ok) {
    return { ok: false, error: tarjeta.error }
  }
  const lectura = lecturaRetocada(tarjeta.data, hoja.cotizacion.tarjetaRetoques).lectura
  const calculo = calculoDeLoGuardado(hoja, inicial.respuesta)
  const dibujar = (sinMoneda: boolean) =>
    geometriaDeLaTarjeta({
      lectura,
      calculo,
      contexto: entrada.contexto,
      monedaBs: hoja.diseno.cabecera.monedaBs,
      locale: entrada.locale,
      ...(sinMoneda ? { sinMoneda } : {}),
    })
  return ok({ dibujar, hoja })
}

async function geometriaDeUnaGuardada(
  entrada: EntradaDeLaGeometria,
  { sinMoneda = false }: { sinMoneda?: boolean } = {},
): Promise<Resultado<{ geometria: Geometria; hoja: HojaDeUnaGuardada }>> {
  const dibujo = await dibujoDeUnaGuardada(entrada)
  return dibujo.ok
    ? ok({ geometria: dibujo.data.dibujar(sinMoneda), hoja: dibujo.data.hoja })
    : dibujo
}

// Las cifras de «Compartir la cotización»: los montos de la tarjeta de lo guardado como líneas de texto (sólo lo que la tarjeta dibuja: el nivel «todos», K4) y el
// nombre del modo con que se guardó; cada monto con su gemelo sin moneda (la misma geometría con `sinMoneda`, de la misma lectura: el Modo Live del panel). Lo pide
// `GET /cotizaciones/[id]/compartir`; el texto lo arma el navegador. `sin_permiso` si la tarjeta no se ve.
export async function paraCompartirDeUnaGuardada(
  entrada: EntradaDeLaGeometria,
): Promise<Resultado<LineasDeLaTarjeta & { modo: string | null }>> {
  const dibujo = await dibujoDeUnaGuardada(entrada)
  if (!dibujo.ok) {
    return dibujo
  }
  const { dibujar, hoja } = dibujo.data
  return ok({
    ...lineasDeLaTarjeta(dibujar(false), dibujar(true)),
    modo: nombreDelModo(hoja.diseno.cabecera, hoja.cotizacion.modoTc),
  })
}

// El logo y la foto del asesor, sólo si alguna de las tarjetas los dibuja, y a la vez, nunca uno tras otro: cada uno espera hasta 2 s. `completas`: llegó lo que
// se esperaba (si uno no llegó, la tarjeta sale sin él y la imagen no se deja guardar en el navegador).
async function imagenesParaDibujar(geometrias: readonly Geometria[], entrada: EntradaDelPdf) {
  const lleva = (tipo: 'logo' | 'foto_del_asesor') =>
    geometrias.some((g) => g.celdas.some((c) => c.contenido.tipo === tipo))
  const conLogo = lleva('logo') ? entrada.contexto.logo : null
  const conFoto = lleva('foto_del_asesor') ? (entrada.contexto.asesor?.foto ?? null) : null
  const [logo, foto] = await Promise.all([
    logoParaDibujar({ logo: conLogo, tope: entrada.topeDelLogo }),
    fotoParaDibujar({ foto: conFoto, tope: entrada.topeDelLogo }),
  ])
  const falto = (pedida: unknown, llegada: unknown) =>
    pedida !== null && pedida !== '' && llegada === null
  return { logo, foto, completas: !falto(conLogo, logo) && !falto(conFoto, foto) }
}

// El PDF de una cotización guardada (4.18-3a): la geometría de lo guardado en A4. react-pdf se carga sólo aquí, con `import()` (C9). `sin_permiso` si la
// tarjeta no se ve; lo demás que falle, `inesperado`.
export async function pdfDeUnaGuardada(
  entrada: EntradaDelPdf,
): Promise<Resultado<{ bytes: Uint8Array<ArrayBuffer>; archivo: string }>> {
  const armada = await geometriaDeUnaGuardada(entrada)
  if (!armada.ok) {
    return armada
  }
  const { geometria, hoja } = armada.data
  const hermana = entrada.hermana
    ? await geometriaDeUnaGuardada({ ...entrada.hermana, locale: entrada.locale })
    : null
  const deLaHermana =
    hermana?.ok && entrada.hermana
      ? { geometria: hermana.data.geometria, antes: entrada.hermana.antes }
      : null
  const { logo, foto } = await imagenesParaDibujar(
    deLaHermana ? [geometria, deLaHermana.geometria] : [geometria],
    entrada,
  )
  try {
    const { pdfDeLaTarjeta } = await import('../../infra/tarjeta/pdf/pdf-de-la-tarjeta')
    const bytes = await pdfDeLaTarjeta({
      geometria,
      numero: hoja.cotizacion.numero,
      logo,
      foto,
      empresa: entrada.empresa,
      ...(deLaHermana ? { hermana: deLaHermana } : {}),
    })
    return ok({ bytes, archivo: archivoDelPdf(hoja.cotizacion.numero) ?? 'cotizacion.pdf' })
  } catch (error) {
    console.error('[pdf] No se pudo dibujar la tarjeta.', error)
    return fallo('inesperado', 'No se pudo armar el PDF.')
  }
}

// La tarjeta de lo guardado como imagen PNG (`ImageResponse`, al ancho de la tarjeta en px): la misma geometría que el PDF. `next/og` se carga sólo aquí, con
// `import()`, y nunca llega al navegador. La base de `webpDeUnaGuardada()`. `completa`, con el logo y la foto que dibuja. `sin_permiso` si la tarjeta no se ve;
// lo demás, `inesperado`. Con `sinMoneda`, los montos sin su moneda (la imagen que se ve con el Modo Live); el PDF nunca la pide.
export async function imagenDeUnaGuardada(
  entrada: EntradaDelPdf,
  opciones: { sinMoneda?: boolean } = {},
): Promise<
  Resultado<{ bytes: Uint8Array<ArrayBuffer>; ancho: number; alto: number; completa: boolean }>
> {
  const armada = await geometriaDeUnaGuardada(entrada, opciones)
  if (!armada.ok) {
    return armada
  }
  const { geometria } = armada.data
  const { logo, foto, completas } = await imagenesParaDibujar([geometria], entrada)
  try {
    const { pngDeLaTarjeta } = await import('../../infra/tarjeta/imagen/imagen-de-la-tarjeta')
    const bytes = await pngDeLaTarjeta({ geometria, logo, foto })
    return ok({
      bytes,
      ancho: Math.ceil(geometria.ancho),
      alto: Math.ceil(geometria.alto),
      completa: completas,
    })
  } catch (error) {
    console.error('[imagen] No se pudo dibujar la tarjeta.', error)
    return fallo('inesperado', 'No se pudo armar la imagen de la tarjeta.')
  }
}

// La imagen de la tarjeta (`docs/COTIZADOR.md` › «La imagen de la tarjeta»): lo guardado (`imagenDeUnaGuardada()`) en WebP de hasta 1.600 px, o del ancho de la
// miniatura que se pida, achicada del PNG, y si salió `completa`. `sharp` se carga sólo aquí, con `import()`, y nunca llega al navegador. `sinMoneda`: la variante
// del Modo Live (`?sin-moneda=1`).
export async function webpDeUnaGuardada(
  entrada: EntradaDelPdf,
  { ancho, sinMoneda = false }: { ancho: AnchoDeLaImagen | null; sinMoneda?: boolean },
): Promise<Resultado<{ bytes: Uint8Array<ArrayBuffer>; completa: boolean }>> {
  const png = await imagenDeUnaGuardada(entrada, { sinMoneda })
  if (!png.ok) {
    return png
  }
  try {
    const { webpDeLaTarjeta } = await import('../../infra/tarjeta/imagen/webp-de-la-tarjeta')
    const bytes = await webpDeLaTarjeta(png.data.bytes, ancho === null ? {} : { ancho })
    return ok({ bytes, completa: png.data.completa })
  } catch (error) {
    console.error('[imagen] No se pudo pasar la tarjeta a WebP.', error)
    return fallo('inesperado', 'No se pudo armar la imagen.')
  }
}
