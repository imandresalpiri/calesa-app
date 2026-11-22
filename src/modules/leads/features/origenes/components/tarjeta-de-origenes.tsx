'use client'

import { Aviso } from '@/shared/ui/aviso'
import { ListaCorta, TarjetaEditable } from '@/shared/ui/tarjetas-de-ajustes'
import {
  alTopeDeOrigenes,
  sinOrigenesActivos,
  TEXTO_DEL_TOPE,
  TEXTO_SIN_ORIGENES_ACTIVOS,
  type OrigenDeLeadConUso,
} from '../../../entities/origen-de-lead'
import {
  accionDeNuevo,
  ACTIVAS_EN_LA_TARJETA,
} from '../../configuracion/components/acciones-de-la-tarjeta'
import { useFamiliaDelPanel } from '../../configuracion/hooks/use-familia-del-panel'
import { usePanelDeOrigen } from '../hooks/use-panel-de-origen'
import { EditorDeOrigenesDiferido } from './diferidos'

// La tarjeta «Orígenes del lead» de Configuración › Leads: los primeros activos a la vista; «Editar» abre la lista en su modal (`?panel=origenes`)
// y «Nuevo origen», del «⋯», el formulario de uno nuevo. El editor se pide recién al abrir algún panel de la familia.
export function TarjetaDeOrigenes({ origenes }: { origenes: readonly OrigenDeLeadConUso[] }) {
  const familia = useFamiliaDelPanel('origenes')
  const panel = usePanelDeOrigen()
  return (
    <>
      <TarjetaEditable
        titulo="Orígenes del lead"
        motivo={null}
        abrir={familia.abrir}
        extra={accionDeNuevo(
          'Nuevo origen',
          alTopeDeOrigenes(origenes) ? TEXTO_DEL_TOPE : null,
          panel.abrirNuevo,
        )}
      >
        {origenes.length > 0 && sinOrigenesActivos(origenes) ? (
          <Aviso tono="aviso">{TEXTO_SIN_ORIGENES_ACTIVOS}</Aviso>
        ) : null}
        <ListaCorta
          filas={origenes.map((origen) => ({
            id: origen.id,
            nombre: origen.nombre,
            icono: origen.icono,
            activo: origen.activo,
            insignias: origen.porDefecto ? ['Por defecto'] : [],
          }))}
          tope={ACTIVAS_EN_LA_TARJETA}
          vacio="Todavía no hay orígenes del lead."
        />
      </TarjetaEditable>
      {familia.montar ? <EditorDeOrigenesDiferido origenes={origenes} /> : null}
    </>
  )
}
