'use client'

import {
  TarjetaEditable,
  ValoresDeLaTarjeta,
  type FilaDeValores,
} from '@/shared/ui/tarjetas-de-ajustes'
import type { AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { useFamiliaDelPanel } from '../../configuracion/hooks/use-familia-del-panel'
import { useNumerosRepetidosPorUrl } from '../hooks/use-numeros-repetidos-por-url'
import { ModalDeNumerosRepetidosDiferido, ModalDeTelefonosExtraDiferido } from './diferidos'

function filasDeTelefonos(telefonos: AjustesDeLeads['telefonos']): FilaDeValores[] {
  return [
    { etiqueta: 'Máximo de teléfonos extra', valor: String(telefonos.maximo) },
    { etiqueta: 'Cuentan como el principal', valor: telefonos.comoPrincipal ? 'Sí' : 'No' },
  ]
}

// La tarjeta «Teléfonos extra» de Configuración › Leads: el máximo y si cuentan como el principal; su «⋯» («Editar…») abre el formulario en un modal
// (`?panel=telefonos`). Con la regla encendida, «Números repetidos», también en el «⋯», abre aparte (`?panel=numeros-repetidos`) la lista de los que ya se repetían.
export function TarjetaDeTelefonosExtra({ telefonos }: { telefonos: AjustesDeLeads['telefonos'] }) {
  const familia = useFamiliaDelPanel('telefonos')
  const repetidos = useNumerosRepetidosPorUrl(telefonos.comoPrincipal)
  return (
    <>
      <TarjetaEditable
        titulo="Teléfonos extra"
        motivo={null}
        abrir={familia.abrir}
        extra={
          telefonos.comoPrincipal
            ? [
                {
                  tipo: 'accion',
                  clave: 'repetidos',
                  etiqueta: 'Números repetidos',
                  despuesDeCerrar: true,
                  alElegir: repetidos.abrir,
                },
              ]
            : []
        }
      >
        <ValoresDeLaTarjeta filas={filasDeTelefonos(telefonos)} />
      </TarjetaEditable>
      {familia.montar ? (
        <ModalDeTelefonosExtraDiferido
          abierto={familia.abierto}
          alCerrar={familia.cerrar}
          telefonos={telefonos}
        />
      ) : null}
      {repetidos.montar ? (
        <ModalDeNumerosRepetidosDiferido abierto={repetidos.abierto} alCerrar={repetidos.cerrar} />
      ) : null}
    </>
  )
}
