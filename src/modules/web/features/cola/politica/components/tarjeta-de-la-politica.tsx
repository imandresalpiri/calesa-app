'use client'

import { cn } from 'cn'
import { esClicPropio } from '@/shared/lib/clic-de-fila'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import { TarjetaDeAjustes, ValoresDeLaTarjeta } from '@/shared/ui/tarjetas-de-ajustes'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_POLITICA } from '../../../../entities/cola/paneles'
import {
  filasDeLaPolitica,
  TITULO_DE_LA_POLITICA,
  type PoliticaDeLaCola,
} from '../../../../entities/cola/politica'
import { REJILLA_DE_TARJETAS } from '../../tablero/components/rejilla-de-tarjetas'
import { ModalDeLaPoliticaDiferido } from './diferidos'

type Props = { politica: PoliticaDeLaCola }

// «Política de la cola»: una tarjeta de ajustes con sus valores a la vista. Sólo lleva su «⋯» («Editar política…»); tocar la tarjeta, fuera del «⋯», abre el mismo
// modal (`?panel=politica`), que se pide recién entonces. Con el teclado, la tarjeta es el botón «Editar Política de la cola» (primero en su cabecera; el foco se
// ve en toda la tarjeta) y el «⋯» va aparte, sin un interactivo dentro de otro. Entra con la versión de la fila para el modal.
export function TarjetaDeLaPolitica({ politica }: Props) {
  const panel = usePanelPorUrl(PANEL_POLITICA)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  const abrir = () => {
    panel.abrir()
  }
  const acciones: AccionDeMenu[] = [
    {
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar política…',
      principal: true,
      despuesDeCerrar: true,
      alElegir: abrir,
    },
  ]
  return (
    <>
      <div className={REJILLA_DE_TARJETAS}>
        <div
          className={cn(
            'cursor-pointer rounded-(--radius-card)',
            // La tarjeta de ajustes se separa de la de abajo con `mb-4` (mampostería): aquí manda el `gap` de la rejilla.
            '[&>section]:mb-0',
            '[&:hover>section]:bg-(--color-surface-2)',
            '[&:has([data-abre-resumen]:focus-visible)>section]:bg-(--color-surface-2) [&:has([data-abre-resumen]:focus-visible)>section]:shadow-(--shadow-focus)',
          )}
          onClick={(evento) => {
            if (!esClicPropio(evento)) {
              abrir()
            }
          }}
        >
          <TarjetaDeAjustes
            titulo={TITULO_DE_LA_POLITICA}
            // El botón de la tarjeta va en la cabecera, antes del «⋯»: en el orden del teclado, la tarjeta y después sus acciones.
            estado={
              <button
                type="button"
                data-abre-resumen=""
                aria-label={`Editar ${TITULO_DE_LA_POLITICA}`}
                className="sr-only"
              />
            }
            acciones={<MasAcciones nombre={TITULO_DE_LA_POLITICA} acciones={acciones} />}
          >
            <ValoresDeLaTarjeta filas={filasDeLaPolitica(politica)} />
          </TarjetaDeAjustes>
        </div>
      </div>
      {montar ? (
        <ModalDeLaPoliticaDiferido
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          politica={politica}
        />
      ) : null}
    </>
  )
}
