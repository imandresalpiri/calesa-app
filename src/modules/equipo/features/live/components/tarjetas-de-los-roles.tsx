'use client'

import { textoDelTope } from '@/shared/lib/conteo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { TarjetasDeAjustes } from '@/shared/ui/tarjetas-de-ajustes'
import type { AjustesDeLosRoles, OrigenDelLive } from '../../../entities/live-configuracion'
import { TOPE_DE_ROLES_PARA_ELEGIR } from '../../../entities/rol'
import { usePanelesDeLosRoles } from '../hooks/use-paneles-de-los-roles'
import { ModalDelRolDiferido, VolverALoPorDefectoDiferido } from './diferidos'
import { TarjetaDelRol } from './tarjeta-del-rol'

export type PropsDeLasTarjetasDeLosRoles = {
  roles: AjustesDeLosRoles
  origenes: readonly OrigenDelLive[]
}

// «Por rol» de Configuración › Modo Live: una tarjeta por rol, en el orden de Roles, con su modal (`?panel=rol&rol=`) y «Volver a lo por defecto»
// (`?panel=rol-por-defecto&rol=`), pedidos la primera vez que se abren. Entra quien tiene `live.configurar` (la página lo exige).
export function TarjetasDeLosRoles({ roles, origenes }: PropsDeLasTarjetasDeLosRoles) {
  const paneles = usePanelesDeLosRoles(roles.roles)
  const { editar, porDefecto } = paneles
  return (
    <>
      <TarjetasDeAjustes etiqueta="Modo Live por rol">
        {roles.roles.map((fila) => (
          <TarjetaDelRol
            key={fila.rol.id}
            fila={fila}
            origenes={origenes}
            alEditar={editar.abrir}
            alVolverALoPorDefecto={porDefecto.abrir}
          />
        ))}
      </TarjetasDeAjustes>
      {roles.hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_ROLES_PARA_ELEGIR, {
            orden: 'primeros, en el orden de Roles',
          })}
          camino="Los demás siguen lo por defecto hasta que tengan lo suyo."
        />
      ) : null}
      {editar.montado && editar.elegida ? (
        <ModalDelRolDiferido
          abierto={editar.abierto}
          alCerrar={editar.cerrar}
          rol={editar.elegida}
          origenes={origenes}
        />
      ) : null}
      {porDefecto.montado && porDefecto.elegida ? (
        <VolverALoPorDefectoDiferido
          abierto={porDefecto.abierto}
          alCerrar={porDefecto.cerrar}
          fila={porDefecto.elegida}
        />
      ) : null}
    </>
  )
}
