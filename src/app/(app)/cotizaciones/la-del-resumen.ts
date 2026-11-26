import type { CotizacionDelListado, LecturaDelServidor } from '@/modules/cotizaciones'

// Las cotizaciones de la página más la del resumen que el servidor leyó aparte (la que abrió la URL o una línea del modal de un grupo), si llegó y no está ya: sobre
// ellas van el «⋯», lo que deja hacer el resumen y los datos de sus diálogos. Sólo tipos: la importa también un Client Component (`listado-con-acciones.tsx`).
export function conLaDelResumen(
  filas: readonly CotizacionDelListado[],
  delServidor: LecturaDelServidor | null,
): readonly CotizacionDelListado[] {
  if (delServidor?.estado !== 'listo') {
    return filas
  }
  const { cotizacion } = delServidor
  return filas.some((fila) => fila.id === cotizacion.id) ? filas : [...filas, cotizacion]
}
