'use client'

import { Badge } from '@/shared/ui/badge'
import { TarjetaEditable } from '@/shared/ui/tarjetas-de-ajustes'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { PANEL_RESTABLECER_EMBUDO, type AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import type { Etapa } from '../../../entities/embudo'
import { useFamiliaDelPanel } from '../../configuracion/hooks/use-familia-del-panel'
import { PuntoDeColor } from '../../etiquetas/components/insignia-de-etiqueta'
import { ModalDePlantillaDelEmbudoDiferido, RestablecerEmbudoDiferido } from './diferidos'

function marcaDe(etapa: Etapa): string | null {
  if (etapa.esInicial) {
    return 'Inicial'
  }
  if (etapa.esGanada) {
    return 'Ganada'
  }
  return etapa.esPerdida ? 'Perdida' : null
}

// Las etapas como un mini-kanban: una columna por etapa, en su orden, con su color y su marca. Parten en filas si no caben (nunca de costado).
function EtapasDelEmbudo({ etapas }: { etapas: readonly Etapa[] }) {
  return (
    <ol className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">
      {etapas.map((etapa, n) => {
        const marca = marcaDe(etapa)
        return (
          <li
            key={`${String(n)}-${etapa.nombre}`}
            className="grid min-w-0 content-start gap-1.5 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface-2) p-2"
          >
            <span className="flex min-w-0 items-start gap-1.5 text-(length:--text-sm) text-(--color-ink)">
              <PuntoDeColor color={etapa.color} className="mt-1 size-2.5 shrink-0" />
              <span className="min-w-0 break-words">{etapa.nombre}</span>
            </span>
            {marca ? (
              <Badge variant="outline" className="justify-self-start">
                {marca}
              </Badge>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

// La tarjeta «Embudo» de Configuración › Leads: la plantilla como columnas; «Editar» abre sus etapas en un modal (`?panel=embudo`) y «Restablecer»,
// del «⋯», pide confirmar (`?panel=restablecer-embudo`). Los dos se piden recién al abrirse.
export function TarjetaDelEmbudo({ embudo }: { embudo: AjustesDeLeads['embudo'] }) {
  const familia = useFamiliaDelPanel('embudo')
  const restablecer = usePanelPorUrl(PANEL_RESTABLECER_EMBUDO)
  const montarRestablecer = useAbiertoAlgunaVez(restablecer.abierto)
  return (
    <>
      <TarjetaEditable
        titulo="Embudo"
        motivo={null}
        abrir={familia.abrir}
        estado={embudo.deFabrica ? <Badge variant="secondary">De fábrica</Badge> : undefined}
        extra={[
          {
            tipo: 'accion',
            clave: 'restablecer',
            etiqueta: 'Restablecer',
            despuesDeCerrar: true,
            deshabilitada: embudo.deFabrica,
            alElegir: () => {
              restablecer.abrir()
            },
          },
          ...(embudo.deFabrica
            ? [
                {
                  tipo: 'nota',
                  clave: 'de-fabrica',
                  texto: 'Ya son las etapas de fábrica.',
                } as const,
              ]
            : []),
        ]}
      >
        <EtapasDelEmbudo etapas={embudo.etapas} />
      </TarjetaEditable>
      {familia.montar ? (
        <ModalDePlantillaDelEmbudoDiferido
          abierto={familia.abierto}
          alCerrar={familia.cerrar}
          embudo={embudo}
        />
      ) : null}
      {montarRestablecer ? <RestablecerEmbudoDiferido embudo={embudo} /> : null}
    </>
  )
}
