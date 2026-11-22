// Bloque «Turnos de la web sin confirmar» (8.05-1): mis turnos `asignada` y `vencida`, el que vence primero arriba. Lee por la entrada pública de `web`
// (`leerMisTurnos`, sólo los míos aunque quien mira gestione la cola) y dibuja una `<TarjetaTurno>` por turno, con «Contacté» y «Vincular a lead».
// Inicio no es en tiempo real: al volver a la pestaña se relee (`<ActualizarAlVolver>`); la campana llega en la Fase 7. Con tope, «Ver todos» abre el panel con todos mis
// turnos (`?panel=turnos`, de a 20).
import { leerMisTurnos, rutaDelPanelDeTurnos } from '@/modules/web'
import { ActualizarAlVolver, TarjetaTurno } from '@/modules/web/client'
import { TOPE_DE_BLOQUE } from '../../../entities/bandeja'
import { ErrorDeBloque } from '../components/error-de-bloque'
import { VacioDeBloque } from '../components/vacio-de-bloque'
import { VerTodasDelBloque } from '../components/ver-todas-del-bloque'
import type { CuerpoDeBloque } from './tipos'

export const CuerpoTurnosWeb: CuerpoDeBloque = async ({ bloque }) => {
  const lectura = await leerMisTurnos({ tope: TOPE_DE_BLOQUE })
  if (!lectura.ok) {
    return <ErrorDeBloque />
  }
  const { filas, hayMas } = lectura.data
  if (filas.length === 0) {
    return (
      <>
        <VacioDeBloque bloque={bloque} />
        <ActualizarAlVolver />
      </>
    )
  }
  const ahora = new Date().toISOString()
  return (
    <div className="grid gap-2">
      <ul className="grid grid-cols-[minmax(0,1fr)] divide-y divide-(--color-line)">
        {filas.map((turno) => (
          <li key={turno.id}>
            <TarjetaTurno turno={turno} ahora={ahora} />
          </li>
        ))}
      </ul>
      <VerTodasDelBloque bloque={bloque} ruta={rutaDelPanelDeTurnos()} hayMas={hayMas} />
      <ActualizarAlVolver />
    </div>
  )
}
