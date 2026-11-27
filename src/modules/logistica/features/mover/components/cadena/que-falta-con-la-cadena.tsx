'use client'

import { Button } from '@/shared/ui/button'
import { queMostrarDeLaFase, textoDeLaFaseVista } from '../../../../entities/mover/fase-vista'
import type { UnidadAbierta } from '../../../../entities/nucleo/unidad'
import { useFaseVista } from '../../hooks/use-fase-vista'
import type { useParaMover } from '../../hooks/use-para-mover'
import { QueFaltaDeHoy } from '../que-falta-de-hoy'
import { QueFaltaDeLaFaseDiferido } from './diferidos-de-la-cadena'
import { PasadaDeLaFase } from './pasada-de-la-fase'
import type { useCadenaDeLaPagina } from './proveedor-de-la-cadena'

type Props = {
  unidad: UnidadAbierta
  paraMover: ReturnType<typeof useParaMover>
  cadena: NonNullable<ReturnType<typeof useCadenaDeLaPagina>>
}

// «Qué falta» en la página de la unidad, según la fase que se toca en la cadena (`?fase_vista=`): la actual, lo de hoy; una que falta y es destino directo, sólo ese destino,
// abierto y con «Mover»; una que falta y no es directa, por cuál pasa primero y lo que le va a pedir, sin «Mover»; una pasada, cuándo entró y salió, quién y su nota. Fuera
// de la actual, arriba dice qué fase se mira y «Volver a la actual». Mientras «Qué falta» lee, no se sabe si una fase es directa: se ve lo de hoy con su esqueleto.
export function QueFaltaConLaCadena({ unidad, paraMover, cadena }: Props) {
  const [clave, elegir] = useFaseVista()
  const { lectura } = paraMover
  const destinos = lectura.tipo === 'listo' ? lectura.dato.destinos.map((d) => d.faseId) : []
  const vista = queMostrarDeLaFase(clave, cadena.cadena.nodos, destinos)
  const sinSaber = lectura.tipo !== 'listo' && vista.tipo !== 'pasada'
  if (vista.tipo === 'actual' || sinSaber)
    return <QueFaltaDeHoy unidad={unidad} paraMover={paraMover} />
  const { nodo } = vista
  return (
    <div className="grid gap-3">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
        <p
          className="min-w-0 truncate text-(length:--text-sm) font-medium text-(--color-ink)"
          title={nodo.nombre}
        >
          {textoDeLaFaseVista(nodo.nombre)}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            elegir(null)
          }}
        >
          Volver a la actual
        </Button>
      </div>
      {vista.tipo === 'pasada' ? <PasadaDeLaFase nodo={nodo} /> : null}
      {vista.tipo === 'directa' ? (
        <QueFaltaDeHoy unidad={unidad} paraMover={paraMover} soloDestino={nodo.faseId} />
      ) : null}
      {vista.tipo === 'indirecta' && nodo.faseId !== null ? (
        <QueFaltaDeLaFaseDiferido
          unidad={unidad}
          nodo={{ ...nodo, faseId: nodo.faseId }}
          primero={vista.primero}
          leidos={cadena.requisitosLeidos}
        />
      ) : null}
    </div>
  )
}
