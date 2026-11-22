'use client'

import { Badge } from '@/shared/ui/badge'
import { TextoConVariables } from '@/shared/ui/editor-con-variables'
import { TarjetaEditable } from '@/shared/ui/tarjetas-de-ajustes'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_RESTABLECER_PORTAL, type AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { MENSAJE_DE_FABRICA, VARIABLES_DEL_MENSAJE } from '../../../entities/portal-mensaje'
import { useFamiliaDelPanel } from '../../configuracion/hooks/use-familia-del-panel'
import { ModalDelMensajeDelPortalDiferido, RestablecerPortalDiferido } from './diferidos'

type Props = {
  portal: AjustesDeLeads['portal']
  // Los compone `src/app` (este módulo no depende de `empresa` ni de `web`).
  empresa: string
  direccion: string | null
}

// La tarjeta «Mensaje del portal» de Configuración › Leads: el texto con sus variables resaltadas; «Editar» abre el editor en un modal
// (`?panel=portal`) y «Restablecer», del «⋯», pide confirmar (`?panel=restablecer-portal`). Los dos se piden recién al abrirse.
export function TarjetaDelMensajeDelPortal({ portal, empresa, direccion }: Props) {
  const familia = useFamiliaDelPanel('portal')
  const restablecer = usePanelPorUrl(PANEL_RESTABLECER_PORTAL)
  const montarRestablecer = useAbiertoAlgunaVez(restablecer.abierto)
  const deFabrica = portal.mensaje === null
  return (
    <>
      <TarjetaEditable
        titulo="Mensaje del portal"
        motivo={null}
        abrir={familia.abrir}
        estado={deFabrica ? <Badge variant="secondary">De fábrica</Badge> : undefined}
        extra={[
          {
            tipo: 'accion',
            clave: 'restablecer',
            etiqueta: 'Restablecer',
            despuesDeCerrar: true,
            deshabilitada: deFabrica,
            alElegir: () => {
              restablecer.abrir()
            },
          },
          ...(deFabrica
            ? [{ tipo: 'nota', clave: 'de-fabrica', texto: 'Ya es el texto de fábrica.' } as const]
            : []),
        ]}
      >
        <p className="line-clamp-6 text-(length:--text-sm) break-words whitespace-pre-line text-(--color-ink)">
          <TextoConVariables
            texto={portal.mensaje ?? MENSAJE_DE_FABRICA}
            claves={VARIABLES_DEL_MENSAJE}
          />
        </p>
      </TarjetaEditable>
      {familia.montar ? (
        <ModalDelMensajeDelPortalDiferido
          abierto={familia.abierto}
          alCerrar={familia.cerrar}
          portal={portal}
          empresa={empresa}
          direccion={direccion}
        />
      ) : null}
      {montarRestablecer ? <RestablecerPortalDiferido portal={portal} /> : null}
    </>
  )
}
