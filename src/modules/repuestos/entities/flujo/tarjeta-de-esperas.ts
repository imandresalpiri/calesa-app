// El resumen de la tarjeta «Repuestos» de la página de la unidad en `logistica` (`docs/GLOSARIO.md` › «Tarjeta de la unidad»): lo que espera el vehículo o, si no
// espera nada, qué verá cuando espere y cómo empezar. Su forma es la de `ResumenDeTarjeta` de `logistica` (estructural: `repuestos` no conoce las tarjetas; lo une
// `src/app`). La acción de empezar llega armada (`accionDeEmpezar` del área `proyectos`, nula sin permiso o con el proyecto cerrado): un área no importa otra. Sin I/O.
import {
  encabezadoDeLasEsperas,
  TEXTO_CUANDO_ESPERE,
  TEXTO_SIN_ESPERAS,
  type EsperasDelVehiculo,
} from './esperas'

export type AccionDeLaTarjetaDeEsperas = {
  clave: string
  etiqueta: string
  destino: { tipo: 'drawer' } | { tipo: 'ruta'; href: string }
}

export type ResumenDeLaTarjetaDeEsperas = {
  lineas: string[]
  aviso: null
  acciones: AccionDeLaTarjetaDeEsperas[]
}

export const NO_SE_LEYERON_LAS_ESPERAS = 'No pudimos leer el resumen.'

const VER: AccionDeLaTarjetaDeEsperas = {
  clave: 'ver',
  etiqueta: 'Ver lo que espera',
  destino: { tipo: 'drawer' },
}

/** El resumen: nulas las esperas si no se pudieron leer; `empezar` sólo se ofrece sin esperas, antes de «Ver lo que espera». */
export function resumenDeLasEsperas(pedido: {
  esperas: EsperasDelVehiculo | null
  empezar: AccionDeLaTarjetaDeEsperas | null
}): ResumenDeLaTarjetaDeEsperas {
  const { esperas, empezar } = pedido
  if (esperas === null) return { lineas: [NO_SE_LEYERON_LAS_ESPERAS], aviso: null, acciones: [VER] }
  const [primero] = esperas.items
  if (primero === undefined) {
    return {
      lineas: [TEXTO_SIN_ESPERAS, TEXTO_CUANDO_ESPERE],
      aviso: null,
      acciones: empezar ? [empezar, VER] : [VER],
    }
  }
  return {
    lineas: [
      encabezadoDeLasEsperas(esperas),
      `${primero.descripcion} · Proyecto ${String(primero.proyectoNumero)}`,
    ],
    aviso: null,
    acciones: [VER],
  }
}
