import { RUTAS } from '@/shared/lib/rutas'
import { conParametros, type ParametrosDeLaUrl } from '../con-parametros'

// La configuración de los repuestos vive en Repuestos (`/repuestos/configuracion/<pestaña>`); `/configuracion/repuestos` era una página con dos pestañas
// (`?seccion=catalogos|cotizador`). Esos enlaces siguen funcionando, en un solo salto: `?seccion=cotizador` va a Cotizador y `?seccion=catalogos`, o un `?panel=`
// de los catálogos sin sección, a Catálogos; sin nada, al Flujo (la primera pestaña); cualquier otro valor, a Catálogos (como antes). Los `?panel=` que traiga
// (`nuevo-valor&catalogo=`, `editar-valor&valor=`, `eliminar-valor&valor=`, `tramo`, `caja`) viajan con él. Ningún destino lleva `seccion`:
// no vuelve a redirigir.
export function destinoDeLaUrlVieja(parametros: ParametrosDeLaUrl): string {
  return conParametros(rutaDe(parametros), parametros)
}

function rutaDe(parametros: ParametrosDeLaUrl): string {
  const seccion = parametros['seccion']
  if (seccion === 'cotizador') {
    return RUTAS.cotizadorDeRepuestos
  }
  if (seccion === undefined && parametros['panel'] === undefined) {
    return RUTAS.flujoDeRepuestos
  }
  return RUTAS.catalogosDeRepuestos
}
