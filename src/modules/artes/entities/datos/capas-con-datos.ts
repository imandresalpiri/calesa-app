// Una página de un arte con unos datos (docs/GLOSARIO.md › «Elemento con datos»): qué dibuja cada capa con datos (el texto resuelto, la imagen
// de dónde sale; también la de la biblioteca, que no depende de los datos), cuáles se esconden porque les falta su dato (la foto N que el vehículo no tiene, la tarjeta sin cotización, el logo sin esa
// variante, el texto al que se le quitaron todas las líneas) y la lista de lo que falta para el aviso sobre el lienzo. Las capas que la persona
// ocultó no cuentan. Puro.
import { PATRON_DE_VARIABLE } from '@/shared/lib/texto-con-variables'
import type { CapaDeArte, DocumentoDeArte, PaginaDeArte } from '../documento'
import {
  fuenteDeLaCapa,
  type ConQueSeDibuja,
  type FuenteDeImagen,
} from '../editor/fuente-de-la-capa'
import { estaOculta } from '../editor/grupos'
import { quedoVacio, resolverTexto, desconocidasDelTexto } from './resolver-texto'
import type { ValoresDelArte } from './valores-del-arte'
import { esDeLaCotizacion, nombreDelDato, type CatalogoDelArte } from './variables-del-arte'

export type CapaResuelta =
  { tipo: 'texto'; texto: string } | { tipo: 'imagen'; fuente: FuenteDeImagen }

// Un dato que falta, como se nombra en el aviso («la foto 3», «el VIN»): `clave` lo identifica sin repetir.
export type Falta = { clave: string; nombre: string }

export type CapasConDatos = {
  resueltas: ReadonlyMap<string, CapaResuelta>
  escondidas: ReadonlySet<string>
  faltan: readonly Falta[]
}

const LA_COTIZACION: Falta = { clave: 'cotizacion', nombre: 'la cotización' }
const LAS_FOTOS: Falta = { clave: 'fotos', nombre: 'las fotos' }
const EL_LOGO: Falta = { clave: 'logo', nombre: 'el logo' }

// Si la capa se llena con los datos: la foto, la tarjeta, el logo y un texto con alguna `{…}` (la marca «Con datos» de «Capas»).
export function tieneDatos(capa: CapaDeArte): boolean {
  if (capa.tipo === 'texto') {
    return capa.texto.search(PATRON_DE_VARIABLE) !== -1
  }
  return capa.tipo === 'foto' || capa.tipo === 'tarjeta' || capa.tipo === 'logo'
}

function faltaDeLaImagen(capa: CapaDeArte, con: ConQueSeDibuja): Falta {
  if (capa.tipo === 'tarjeta') {
    return LA_COTIZACION
  }
  if (capa.tipo === 'foto') {
    const cuantas = con.datos.vehiculo?.fotos.length ?? 0
    return cuantas === 0
      ? LAS_FOTOS
      : { clave: `foto.${String(capa.indice)}`, nombre: `la foto ${String(capa.indice + 1)}` }
  }
  return EL_LOGO
}

function faltasDelTexto(
  vacias: readonly string[],
  catalogo: Pick<CatalogoDelArte, 'campos'>,
  sinCotizacion: boolean,
): Falta[] {
  return vacias.map((clave) =>
    sinCotizacion && esDeLaCotizacion(clave)
      ? LA_COTIZACION
      : { clave, nombre: nombreDelDato(clave, catalogo) },
  )
}

export type ParaResolver = ConQueSeDibuja & { catalogo: CatalogoDelArte }

// Lo de una capa: qué dibuja (o nada), si se esconde y qué le falta.
type DeLaCapa = { resuelta: CapaResuelta | null; escondida: boolean; faltan: Falta[] }

const NADA: DeLaCapa = { resuelta: null, escondida: false, faltan: [] }

function deUnaCapa(
  capa: CapaDeArte,
  valores: ValoresDelArte,
  { catalogo, ...con }: ParaResolver,
): DeLaCapa {
  if (capa.tipo === 'texto') {
    const resuelto = resolverTexto(capa.texto, valores, catalogo)
    const sinCotizacion = !con.datos.deEjemplo && con.datos.cotizacion === null
    return {
      resuelta: { tipo: 'texto', texto: resuelto.texto },
      escondida: quedoVacio(resuelto),
      faltan: faltasDelTexto(resuelto.vacias, catalogo, sinCotizacion),
    }
  }
  if (
    capa.tipo === 'imagen' ||
    capa.tipo === 'foto' ||
    capa.tipo === 'tarjeta' ||
    capa.tipo === 'logo'
  ) {
    const fuente = fuenteDeLaCapa(capa, con)
    return fuente
      ? { resuelta: { tipo: 'imagen', fuente }, escondida: false, faltan: [] }
      : { resuelta: null, escondida: true, faltan: [faltaDeLaImagen(capa, con)] }
  }
  return NADA
}

export function capasConDatos(
  pagina: PaginaDeArte,
  valores: ValoresDelArte,
  para: ParaResolver,
): CapasConDatos {
  const resueltas = new Map<string, CapaResuelta>()
  const escondidas = new Set<string>()
  const faltan = new Map<string, Falta>()
  for (const capa of pagina.capas) {
    // La de la biblioteca no depende de los datos: se resuelve aunque esté oculta (no se esconde ni falta).
    if (capa.tipo !== 'imagen' && (!tieneDatos(capa) || estaOculta(pagina, capa))) {
      continue
    }
    const deLaCapa = deUnaCapa(capa, valores, para)
    if (deLaCapa.resuelta) {
      resueltas.set(capa.id, deLaCapa.resuelta)
    }
    if (deLaCapa.escondida) {
      escondidas.add(capa.id)
    }
    for (const falta of deLaCapa.faltan) {
      faltan.set(falta.clave, faltan.get(falta.clave) ?? falta)
    }
  }
  return { resueltas, escondidas, faltan: [...faltan.values()] }
}

// Las `{…}` que el arte no conoce en todo el documento (sin repetir, en su orden): mientras haya una, la plantilla de arte no se guarda.
export function desconocidasDelDocumento(
  documento: DocumentoDeArte,
  catalogo: Pick<CatalogoDelArte, 'campos'>,
): string[] {
  const todas: string[] = []
  for (const pagina of documento.paginas) {
    for (const capa of pagina.capas) {
      if (capa.tipo !== 'texto') {
        continue
      }
      for (const clave of desconocidasDelTexto(capa.texto, catalogo)) {
        if (!todas.includes(clave)) {
          todas.push(clave)
        }
      }
    }
  }
  return todas
}
