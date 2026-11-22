'use client'

import { useRouter } from 'next/navigation'
import { EsquinaDeAcciones, MasAcciones } from '@/shared/ui/lista'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import {
  AVISO_CON_CAMBIOS_DE_FILAS,
  AVISO_CON_CAMBIOS_DE_FILAS_AL_DESACTIVAR,
} from '../../../entities/tablas/estructura'
import type { TablaDeReferencia } from '../../../entities/tablas/lectura'
import {
  PANEL_COLUMNAS_DE_TABLA,
  PANEL_DESACTIVAR_TABLA,
  rutaDeLasTablas,
} from '../../../entities/tablas/rutas'
import { menuDeTablaEnElEditor, menuDeTablaEnLaLista } from './acciones-de-tabla'
import { DesactivarTablaDiferido, PanelDeColumnasDiferido } from './diferidos'

// Un panel de la tabla abierta por la URL: con cambios de filas sin publicar no se abre (se avisa y se limpia la URL); cada apertura aceptada empieza de cero.
function usePanelDeLaTabla(panel: string, motivo: string | null) {
  const url = usePanelPorUrl(panel)
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${panel}:${String(apertura)}` : null,
    motivo,
    url.cerrar,
  )
  const abierto = url.abierto && !rechazada
  return { ...url, abierto, apertura, montado: useAbiertoAlgunaVez(abierto) }
}

// El «⋯» del encabezado del editor, arriba a la derecha: «Columnas» y «Desactivar», apagados con cambios de filas sin publicar. Monta los dos paneles una vez por
// pantalla (también los que llegan desde el «⋯» de la lista, por la URL).
export function AccionesDelEditor({
  tabla,
  origenId,
  cambios,
}: {
  tabla: TablaDeReferencia
  origenId: string | null
  cambios: boolean
}) {
  const columnas = usePanelDeLaTabla(
    PANEL_COLUMNAS_DE_TABLA,
    cambios ? AVISO_CON_CAMBIOS_DE_FILAS : null,
  )
  const desactivar = usePanelDeLaTabla(
    PANEL_DESACTIVAR_TABLA,
    cambios ? AVISO_CON_CAMBIOS_DE_FILAS_AL_DESACTIVAR : null,
  )
  return (
    <>
      <EsquinaDeAcciones>
        <MasAcciones
          nombre={tabla.nombre}
          id={`tabla-${tabla.id}`}
          conBorde
          acciones={menuDeTablaEnElEditor({
            cambios,
            alAbrirColumnas: () => {
              columnas.abrir()
            },
            alDesactivar: () => {
              desactivar.abrir()
            },
          })}
        />
      </EsquinaDeAcciones>
      {columnas.montado ? (
        <PanelDeColumnasDiferido
          key={columnas.apertura}
          abierto={columnas.abierto}
          alCerrar={columnas.cerrar}
          tabla={tabla}
          origenId={origenId}
        />
      ) : null}
      {desactivar.montado ? (
        <DesactivarTablaDiferido
          key={desactivar.apertura}
          abierto={desactivar.abierto}
          alCerrar={desactivar.cerrar}
          tabla={tabla}
          origenId={origenId}
        />
      ) : null}
    </>
  )
}

// El «⋯» de una tabla en la lista: cada línea lleva a la tabla abierta (con su panel), donde se sabe si hay cambios de filas sin publicar.
export function AccionesDeLaTablaEnLaLista({
  tabla,
  origenId,
}: {
  tabla: Pick<TablaDeReferencia, 'id' | 'nombre'>
  origenId: string | null
}) {
  const router = useRouter()
  return (
    <EsquinaDeAcciones>
      <MasAcciones
        nombre={tabla.nombre}
        acciones={menuDeTablaEnLaLista({
          alEditarFilas: () => {
            router.push(rutaDeLasTablas(origenId, tabla.id))
          },
          alAbrirColumnas: () => {
            router.push(rutaDeLasTablas(origenId, tabla.id, PANEL_COLUMNAS_DE_TABLA))
          },
          alDesactivar: () => {
            router.push(rutaDeLasTablas(origenId, tabla.id, PANEL_DESACTIVAR_TABLA))
          },
        })}
      />
    </EsquinaDeAcciones>
  )
}
