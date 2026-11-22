'use client'

import { Aviso } from '@/shared/ui/aviso'
import { ListaCorta, TarjetaEditable } from '@/shared/ui/tarjetas-de-ajustes'
import {
  alTopeDeTiposDeSeguimiento,
  sinTiposActivos,
  textoDelTopeDeSeguimientos,
  type ListaDeTiposDeSeguimiento,
} from '../../../entities/tipo-de-seguimiento'
import {
  accionDeNuevo,
  ACTIVAS_EN_LA_TARJETA,
} from '../../configuracion/components/acciones-de-la-tarjeta'
import { useFamiliaDelPanel } from '../../configuracion/hooks/use-familia-del-panel'
import { usePanelDeTipoDeSeguimiento } from '../hooks/use-panel-de-tipo-de-seguimiento'
import { EditorDeTiposDeSeguimientoDiferido } from './diferidos'

// La tarjeta «Tipos de seguimiento» de Configuración › Leads: los primeros activos; «Editar» abre la lista en su modal (`?panel=seguimientos`) y
// «Nuevo tipo», del «⋯», el formulario de uno nuevo. El editor se pide recién al abrir algún panel de la familia.
export function TarjetaDeSeguimientos({ lista }: { lista: ListaDeTiposDeSeguimiento }) {
  const familia = useFamiliaDelPanel('seguimientos')
  const panel = usePanelDeTipoDeSeguimiento()
  return (
    <>
      <TarjetaEditable
        titulo="Tipos de seguimiento"
        motivo={null}
        abrir={familia.abrir}
        extra={accionDeNuevo(
          'Nuevo tipo',
          alTopeDeTiposDeSeguimiento(lista.tipos, lista.tope)
            ? textoDelTopeDeSeguimientos(lista.tope)
            : null,
          panel.abrirNuevo,
        )}
      >
        {lista.tipos.length > 0 && sinTiposActivos(lista.tipos) ? (
          <Aviso tono="aviso">
            Ningún tipo de seguimiento está activo: el alta guarda los leads sin primer seguimiento.
          </Aviso>
        ) : null}
        <ListaCorta
          filas={lista.tipos.map((tipo) => ({
            id: tipo.id,
            nombre: tipo.nombre,
            icono: tipo.icono,
            activo: tipo.activo,
          }))}
          tope={ACTIVAS_EN_LA_TARJETA}
          vacio="Todavía no hay tipos de seguimiento."
        />
      </TarjetaEditable>
      {familia.montar ? <EditorDeTiposDeSeguimientoDiferido lista={lista} /> : null}
    </>
  )
}
