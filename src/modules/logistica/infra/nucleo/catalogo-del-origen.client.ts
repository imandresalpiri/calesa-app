// Lo común de leer un catálogo de logística desde un origen en el navegador (puertos, navieras, categorías de gasto): dos consultas en paralelo, las
// filas propias del origen (`origen_id = <origen>`) y las compartidas (`origen_id is null`), cada una con `tope + 1` y cortada en el tope (`cortarAlTope`;
// `<AvisoDeTope>` por grupo si había más). Los índices `<tabla>_origen_clave_key` sirven a las dos (el origen va primero). Sin recordar nada: la lista se
// relee tras cada escritura.
import { cortarAlTope } from '@/shared/lib/conteo'
import {
  errorDePostgrest,
  fallo,
  ok,
  type ErrorPostgrest,
  type Resultado,
} from '@/shared/lib/errores'
import type { CatalogoDelOrigenLeido, GrupoLeido } from '../../entities/nucleo/catalogo-del-origen'

type Respuesta = { data: unknown; error: ErrorPostgrest | null }

type Pedido<T> = {
  // La consulta de un grupo: la del origen o, con nulo, la de los compartidos. Pide `tope + 1`.
  consulta: (origenId: string | null) => PromiseLike<Respuesta>
  desde: (datos: unknown) => T[] | null
  ordenar: (filas: readonly T[]) => T[]
  tope: number
  mensaje: string
}

function grupo<T>(
  { data, error }: Respuesta,
  { desde, ordenar, tope, mensaje }: Pedido<T>,
): Resultado<GrupoLeido<T>> {
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const lista = desde(data)
  if (lista === null) {
    return fallo('inesperado', mensaje)
  }
  const { filas, hayMas } = cortarAlTope(lista, tope)
  return ok({ filas: ordenar(filas), hayMas })
}

export async function leerCatalogoDelOrigen<T>(
  origenId: string,
  pedido: Pedido<T>,
): Promise<Resultado<CatalogoDelOrigenLeido<T>>> {
  const [propias, compartidas] = await Promise.all([
    pedido.consulta(origenId),
    pedido.consulta(null),
  ])
  const propios = grupo(propias, pedido)
  if (!propios.ok) {
    return propios
  }
  const compartidos = grupo(compartidas, pedido)
  return compartidos.ok ? ok({ propios: propios.data, compartidos: compartidos.data }) : compartidos
}
