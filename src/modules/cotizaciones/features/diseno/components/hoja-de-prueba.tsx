'use client'

import { useMemo } from 'react'
import { EstiloDeTonos, SimbolosDeXCell } from '@/shared/ui/xcell'
import { seccionSeDibuja, type ContextoDeHoja } from '../../../entities/binding'
import type { HojaDeLaVistaPrevia } from '../../../entities/diseno/hoja-del-diseno'
import { entradasIniciales, indiceDeHoja } from '../../../entities/entradas'
import { hayTotalEnLaHoja } from '../../../entities/hoja'
import type { RespuestaDeRecalculo } from '../../../entities/recalculo'
import { CabeceraDeHoja } from '../../hoja/components/cabecera-de-hoja'
import {
  CONTENEDOR_DE_SECCIONES,
  REJILLA_DE_SECCIONES,
} from '../../hoja/components/clases-de-la-rejilla'
import { ResumenDeHoja } from '../../hoja/components/resumen-de-hoja'
import { SeccionDeHoja } from '../../hoja/components/seccion-de-hoja'
import { ACCIONES_QUIETAS, ESTADO_AL_DIA, nada } from './editor/acciones-quietas'

type Props = { hoja: HojaDeLaVistaPrevia; respuesta: RespuestaDeRecalculo | null }

const plural = (n: number) => (n === 1 ? 'sección va' : 'secciones van')

// La hoja de cotizar con el diseño (la del celular, en sólo lectura): los mismos componentes de la hoja de verdad (cabecera, secciones y resumen), con su misma rejilla y sus mismos cortes por contenedor, sobre cifras
// de prueba. No usa `LugaresDeLaHoja` (arrastra `?ayuda=` y `?panel=` de la URL, que aquí chocarían con la pestaña) ni dibuja las secciones «avanzado»: las nombra aparte.
export function HojaDePrueba({ hoja, respuesta }: Props) {
  const indice = useMemo(
    () => indiceDeHoja(hoja.secciones, hoja.cabecera.modos, hoja.cabecera.modoPorDefecto),
    [hoja.secciones, hoja.cabecera.modos, hoja.cabecera.modoPorDefecto],
  )
  const contexto = useMemo<ContextoDeHoja>(
    () => ({ indice, entradas: entradasIniciales(indice), respuesta }),
    [indice, respuesta],
  )
  const principales = hoja.secciones.filter(
    (s) => s.presentacion === 'principal' && seccionSeDibuja(s, contexto),
  )
  const avanzadas = hoja.secciones.filter((s) => s.presentacion === 'avanzado')
  if (principales.length === 0 && avanzadas.length === 0) {
    return (
      <p className="p-4 text-(length:--text-sm) text-(--color-ink-soft)">
        No hay nada que dibujar.
      </p>
    )
  }
  const modo = hoja.cabecera.modos.find((m) => m.clave === contexto.entradas.modoTc)?.nombre ?? null
  return (
    <div data-hoja-de-prueba="" className="@container/hoja grid min-w-0 gap-4 p-3">
      <SimbolosDeXCell />
      <EstiloDeTonos tonos={hoja.tonos} />
      <div className="flex min-w-0 flex-col gap-4 @4xl/hoja:flex-row @4xl/hoja:items-start">
        <div className="grid min-w-0 flex-1 gap-4">
          <CabeceraDeHoja
            cabecera={hoja.cabecera}
            modoElegido={contexto.entradas.modoTc}
            alElegirModo={nada}
            verTotalBs={false}
            alCambiarVerTotalBs={nada}
          />
          <div data-secciones="" className={CONTENEDOR_DE_SECCIONES}>
            <div className={REJILLA_DE_SECCIONES}>
              {principales.map((seccion) => (
                <SeccionDeHoja
                  key={seccion.id}
                  seccion={seccion}
                  contexto={contexto}
                  acciones={ACCIONES_QUIETAS}
                  enLaRejilla
                />
              ))}
            </div>
          </div>
          {avanzadas.length === 0 ? null : (
            <p data-avanzadas="" className="text-(length:--text-sm) text-(--color-ink-soft)">
              {avanzadas.length} {plural(avanzadas.length)} detrás del botón «Avanzado» de la hoja:{' '}
              {avanzadas.map((s) => s.titulo ?? s.id).join(', ')}.
            </p>
          )}
        </div>
        <ResumenDeHoja
          tarjeta={hoja.tarjetaTotal}
          monedaDelTotalBs={null}
          modo={modo}
          contexto={contexto}
          estado={ESTADO_AL_DIA}
          avisoDelVehiculo={null}
          alReintentar={nada}
          alRecargar={nada}
          guardar={null}
          avisoDeGuardado={null}
          totalEnLaHoja={hayTotalEnLaHoja(hoja)}
        />
      </div>
    </div>
  )
}
