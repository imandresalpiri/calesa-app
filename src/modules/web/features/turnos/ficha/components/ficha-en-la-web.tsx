'use client'

import { Badge } from '@/shared/ui/badge'
import { TarjetaEditable, ValoresDeLaTarjeta } from '@/shared/ui/tarjetas-de-ajustes'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { MiFichaEnLaWeb } from '../../../../entities/turnos/ficha'
import { TEXTO_VER_COMO } from '../../../../entities/turnos/rueda'
import { ModalDeFichaDiferido } from './diferidos'

// «Tu ficha en la web» en Mi perfil: lo guardado a la vista (con «Se usa en lo que compartes»: la tarjeta de la cotización lleva estos datos) y «Editar» abre
// su modal (`?panel=ficha`). Mirando otro rol («Ver como») «Editar» queda apagado: escribiría en la cuenta real (D12).
export function FichaEnLaWeb({
  ficha,
  miraOtroRol,
}: {
  ficha: MiFichaEnLaWeb
  miraOtroRol: boolean
}) {
  const { abierto, abrir, cerrar } = usePanelPorUrl('ficha')
  const montar = useAbiertoAlgunaVez(abierto)
  return (
    <>
      <TarjetaEditable
        titulo="Tu ficha en la web"
        motivo={miraOtroRol ? TEXTO_VER_COMO : null}
        abrir={abrir}
        estado={
          <Badge variant={ficha.publicoWeb ? 'default' : 'secondary'}>
            {ficha.publicoWeb ? 'Visible' : 'Oculta'}
          </Badge>
        }
      >
        <ValoresDeLaTarjeta
          filas={[
            { etiqueta: 'WhatsApp', valor: ficha.whatsapp },
            { etiqueta: 'Cargo', valor: ficha.cargo },
            { etiqueta: 'Identificador', valor: ficha.handle },
            {
              etiqueta: 'Especialidades',
              valor: ficha.especialidades.length === 0 ? null : ficha.especialidades.join(', '),
            },
          ]}
        />
        {ficha.presentacion ? (
          <p className="line-clamp-3 text-(length:--text-sm) text-(--color-ink-soft)">
            {ficha.presentacion}
          </p>
        ) : null}
        <p className="text-(length:--text-xs) text-(--color-ink-faint)">
          Se usa en lo que compartes.
        </p>
      </TarjetaEditable>
      {montar ? <ModalDeFichaDiferido ficha={ficha} abierto={abierto} alCerrar={cerrar} /> : null}
    </>
  )
}
