import { connection } from 'next/server'
import { z } from 'zod'
import type { VehiculosDeEjemplo } from '@/modules/artes'
import { requerirSesion } from '@/modules/equipo'
import { buscarVehiculos, condicionesDe, fuenteDelInventario } from '@/modules/vehiculos'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { cumpleElMinimo, LARGO_MAXIMO_DE_TEXTO, type MinimoDeBusqueda } from '@/shared/lib/filtros'
import { leerCursor, TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { puede } from '@/shared/lib/permisos'
import { origenOcultoEnElLive, rutaOcultaEnElLive } from '../../../_live/guarda'
import { json, NO_ESTA_EL_VEHICULO, NO_SE_PUDO, texto } from '../_respuestas'

// Los vehículos del origen de la plantilla para elegir el de ejemplo del editor de artes: lo más nuevo primero, de a `TAMANO_DE_VER_MAS`, con
// la búsqueda del inventario (título, marca, modelo, lote o VIN) y su miniatura de 480 px. Con la sesión de quien pide: la RLS decide qué
// vehículos ve (quien ve «propios», por `vehiculos_inventario()`).
//
//   GET /artes/ejemplo/vehiculos?origen=<id>&q=<texto>&cursor=<siguiente>
//   200 application/json (`VehiculosDeEjemplo`) | 307 al ingreso | 404 text/plain | 500 text/plain
//
// `q` cuenta con 3 letras o dígitos seguidos (con menos, la lista sin buscar); un cursor que no se lee, o hacia atrás, pide la primera página.
// Un origen que no es un id, que quien pide no ve o que el Modo Live esconde: 404.
const MINIMO: MinimoDeBusqueda = {
  letras: 3,
  numerosLibres: false,
  aviso: 'Escribe al menos 3 letras o números.',
}

const esquema = z.object({
  origen: z.guid(),
  q: z.string().optional(),
  cursor: z.string().optional(),
})

export async function GET(peticion: Request) {
  await connection()
  const sesion = await requerirSesion()
  if (await rutaOcultaEnElLive('cotizaciones')) {
    return texto(NO_ESTA_EL_VEHICULO, 404)
  }
  const consulta = esquema.safeParse(
    Object.fromEntries(new URL(peticion.url).searchParams.entries()),
  )
  if (!consulta.success) {
    return texto(NO_ESTA_EL_VEHICULO, 404)
  }
  const { origen, q = '', cursor: textoDelCursor } = consulta.data
  if (!puede(sesion.permisos, 'vehiculos.ver', origen) || (await origenOcultoEnElLive(origen))) {
    return texto(NO_ESTA_EL_VEHICULO, 404)
  }
  const busqueda = q.trim().slice(0, LARGO_MAXIMO_DE_TEXTO)
  const cursor = leerCursor(textoDelCursor)
  const leida = await buscarVehiculos({
    fuente: fuenteDelInventario(sesion.permisos, origen),
    origenId: origen,
    condiciones: condicionesDe([], {
      busqueda: cumpleElMinimo(busqueda, MINIMO) ? busqueda : '',
      porClave: {},
    }),
    cursor: cursor?.sentido === 'siguiente' ? cursor : null,
    tamano: TAMANO_DE_VER_MAS,
  })
  if (!leida.ok) {
    return texto(NO_SE_PUDO, 500)
  }
  const respuesta: VehiculosDeEjemplo = {
    filas: leida.data.filas.map((vehiculo) => ({
      id: vehiculo.id,
      titulo: vehiculo.titulo,
      anio: vehiculo.anio,
      lote: vehiculo.lote,
      miniatura: urlPublicaONull('vehiculos', vehiculo.portadaRuta),
    })),
    siguiente: leida.data.siguiente,
  }
  return json(respuesta)
}
