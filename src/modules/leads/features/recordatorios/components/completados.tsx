'use client'

import { useEffect, useEffectEvent, useId } from 'react'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { Button } from '@/shared/ui/button'
import { useALaVista } from '@/shared/ui/use-a-la-vista'
import type { Recordatorios } from '../hooks/use-recordatorios'
import { EsqueletoDeRecordatorios } from './esqueleto-de-recordatorios'
import { ListaDeRecordatorios } from './lista-de-recordatorios'

type Props = {
  ahora: string
  zona: string
  recordatorios: Recordatorios
  alEditar: (id: string) => void
}

// «Completados», una sección a la vista y sin número (contarlos crecería con el total): no lee nada hasta acercarse a la vista
// (`useALaVista`), y después se pagina como los pendientes. Sólo aparece si hay alguno.
export function Completados({ ahora, zona, recordatorios, alEditar }: Props) {
  const { completados: estado, listas } = recordatorios
  const id = useId()
  const [observar, cerca] = useALaVista<HTMLElement>()
  const leer = useEffectEvent(() => {
    recordatorios.abrirCompletados()
  })
  useEffect(() => {
    if (cerca) leer()
  }, [cerca])
  if (!listas.hayCompletados) {
    return null
  }
  return (
    <section ref={observar} aria-labelledby={id} className="grid min-w-0 gap-2 pt-2">
      <h3 id={id} className="text-(length:--text-sm) font-semibold text-(--color-ink)">
        Completados
      </h3>
      {estado === 'error' ? (
        <div role="alert" className="flex flex-wrap items-center gap-2">
          <p className="text-(length:--text-sm) text-(--color-ink)">
            No se pudieron cargar los completados.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={recordatorios.abrirCompletados}
          >
            Reintentar
          </Button>
        </div>
      ) : listas.completados === null ? (
        <EsqueletoDeRecordatorios etiqueta="Cargando los completados" />
      ) : listas.completados.lista.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          Ningún recordatorio completado sobre este lead.
        </p>
      ) : (
        <ListaDeRecordatorios
          lista={listas.completados.lista}
          hayMas={listas.completados.hayMas}
          ahora={ahora}
          zona={zona}
          recordatorios={recordatorios}
          alEditar={alEditar}
          verMas={recordatorios.verMasCompletados}
          cargandoMas={recordatorios.cargandoMas === 'completados'}
          textoDelTope={`Mostrando los ${String(TOPE_DE_LO_CARGADO)} completados más recientes.`}
        />
      )}
    </section>
  )
}
