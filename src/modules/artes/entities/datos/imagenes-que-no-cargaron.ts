// Lo que falta con un vehículo de ejemplo también es lo que no cargó: una foto o la tarjeta de la cotización cuya ruta respondió con un error (la
// foto se borró, la cotización ya no se ve) quedan vacías en su caja y se suman al aviso sobre el lienzo, después de lo que ya faltaba y sin
// repetir. El logo y las imágenes de la biblioteca no son datos del vehículo: el lienzo las muestra con su respaldo. Puro.
import type { PaginaDeArte } from '../documento'
import type { CapasConDatos, Falta } from './capas-con-datos'

const LA_COTIZACION: Falta = { clave: 'cotizacion', nombre: 'la cotización' }

export function conLasQueNoCargaron(
  pagina: PaginaDeArte,
  conDatos: CapasConDatos,
  fallidas: ReadonlySet<string>,
): readonly Falta[] {
  if (fallidas.size === 0) {
    return conDatos.faltan
  }
  const faltan = new Map(conDatos.faltan.map((falta) => [falta.clave, falta]))
  for (const capa of pagina.capas) {
    const resuelta = conDatos.resueltas.get(capa.id)
    if (resuelta?.tipo !== 'imagen' || !fallidas.has(resuelta.fuente.src)) {
      continue
    }
    const falta =
      capa.tipo === 'foto'
        ? { clave: `foto.${String(capa.indice)}`, nombre: `la foto ${String(capa.indice + 1)}` }
        : capa.tipo === 'tarjeta'
          ? LA_COTIZACION
          : null
    if (falta && !faltan.has(falta.clave)) {
      faltan.set(falta.clave, falta)
    }
  }
  return faltan.size === conDatos.faltan.length ? conDatos.faltan : [...faltan.values()]
}
