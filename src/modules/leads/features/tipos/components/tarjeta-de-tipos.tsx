'use client'

import { ListaCorta, TarjetaEditable } from '@/shared/ui/tarjetas-de-ajustes'
import {
  alTopeDeTipos,
  NOMBRE_DE_CLASE,
  textoDelTope,
  type ListaDeTipos,
} from '../../../entities/tipo-de-lead'
import {
  accionDeNuevo,
  ACTIVAS_EN_LA_TARJETA,
} from '../../configuracion/components/acciones-de-la-tarjeta'
import { useFamiliaDelPanel } from '../../configuracion/hooks/use-familia-del-panel'
import { usePanelDeTipo } from '../hooks/use-panel-de-tipo'
import { EditorDeTiposDiferido } from './diferidos'

// La tarjeta «Tipos de lead» de Configuración › Leads: los primeros activos con su clase; «Editar» abre la lista en su modal (`?panel=tipos`) y
// «Nuevo tipo», del «⋯», el formulario de uno nuevo. El editor se pide recién al abrir algún panel de la familia.
export function TarjetaDeTipos({ lista }: { lista: ListaDeTipos }) {
  const familia = useFamiliaDelPanel('tipos')
  const panel = usePanelDeTipo()
  return (
    <>
      <TarjetaEditable
        titulo="Tipos de lead"
        motivo={null}
        abrir={familia.abrir}
        extra={accionDeNuevo(
          'Nuevo tipo',
          alTopeDeTipos(lista.tipos, lista.tope) ? textoDelTope(lista.tope) : null,
          panel.abrirNuevo,
        )}
      >
        <ListaCorta
          filas={lista.tipos.map((tipo) => ({
            id: tipo.id,
            nombre: tipo.nombre,
            icono: tipo.icono,
            activo: tipo.activo,
            insignias: [NOMBRE_DE_CLASE[tipo.clase]],
          }))}
          tope={ACTIVAS_EN_LA_TARJETA}
          vacio="Todavía no hay tipos de lead."
        />
      </TarjetaEditable>
      {familia.montar ? <EditorDeTiposDiferido lista={lista} /> : null}
    </>
  )
}
