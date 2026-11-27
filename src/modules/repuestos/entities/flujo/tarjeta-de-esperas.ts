// El resumen de la tarjeta «Repuestos» de la página de la unidad en `logistica` (`docs/GLOSARIO.md` › «Tarjeta de la unidad»): lo que espera el vehículo o, si no
// espera nada, qué verá cuando espere y cómo empezar. Su forma es la de `ResumenDeTarjeta` de `logistica` (estructural: `repuestos` no conoce las tarjetas; lo une
// `src/app`). Las acciones del vacío piden `repuestos.editar` (llega resuelto como booleano): con un proyecto abierto del vehículo, «Agregar un repuesto»; sin proyecto,
// «Pedir repuestos para este vehículo». Con el proyecto cerrado no se ofrece ninguna: no se le agregan ítems y el vehículo no admite otro proyecto vivo. Sin I/O.
import type { ProyectoDeVehiculo } from '../proyectos/resumen'
import { rutaDeNuevoItem, rutaDeNuevoProyectoConVehiculo } from '../proyectos/rutas'
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

/** La acción de empezar, con el vehículo sin esperas; nula sin permiso o con el proyecto cerrado. */
export function accionDelVacio(pedido: {
  vehiculoId: string
  proyecto: ProyectoDeVehiculo | null
  puedeEditar: boolean
}): AccionDeLaTarjetaDeEsperas | null {
  const { proyecto, puedeEditar } = pedido
  if (!puedeEditar) return null
  if (proyecto === null) {
    const href = rutaDeNuevoProyectoConVehiculo(pedido.vehiculoId)
    return {
      clave: 'pedir',
      etiqueta: 'Pedir repuestos para este vehículo',
      destino: { tipo: 'ruta', href },
    }
  }
  if (proyecto.cerradoEn !== null) return null
  const href = rutaDeNuevoItem(proyecto.id)
  return { clave: 'agregar', etiqueta: 'Agregar un repuesto', destino: { tipo: 'ruta', href } }
}

/** El resumen: nulas las esperas si no se pudieron leer. */
export function resumenDeLasEsperas(pedido: {
  esperas: EsperasDelVehiculo | null
  vehiculoId: string
  proyecto: ProyectoDeVehiculo | null
  puedeEditar: boolean
}): ResumenDeLaTarjetaDeEsperas {
  const { esperas } = pedido
  if (esperas === null) return { lineas: [NO_SE_LEYERON_LAS_ESPERAS], aviso: null, acciones: [VER] }
  const [primero] = esperas.items
  if (primero === undefined) {
    const empezar = accionDelVacio(pedido)
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
