'use client'

import {
  gruposDeLeadsDelEjemplo,
  type EjemploConDatos,
} from '../../../../entities/datos/ejemplo-con-datos'
import { CampoDelEjemplo } from './campo-del-ejemplo'

type Props = {
  elegido: EjemploConDatos | null
  // El Modo Live con los clientes apagados: el nombre de un lead nunca llega al lienzo.
  sinClientes: boolean
  alElegir: (leadId: string | null) => void
}

const OCULTO_EN_EL_LIVE = 'Oculto en Modo Live'
const NINGUNO = ''

function apagadoDe(elegido: EjemploConDatos | null, sinClientes: boolean, hayLeads: boolean) {
  if (!elegido) {
    return 'Elige un vehículo primero'
  }
  if (sinClientes) {
    return OCULTO_EN_EL_LIVE
  }
  if ('motivo' in elegido.vehiculo.leads) {
    return elegido.vehiculo.leads.motivo
  }
  return hayLeads ? null : 'Sin leads relacionados'
}

// El lead de ejemplo (el que llena `{cliente}`), entre los relacionados del vehículo: Vinculado · Interesados · Cotizados, sin repetir, o
// ninguno. Sin leads, sin verlos o con el Live que oculta a los clientes, el campo se apaga y dice por qué.
export function ElegirLead({ elegido, sinClientes, alElegir }: Props) {
  const grupos = elegido ? gruposDeLeadsDelEjemplo(elegido.vehiculo.leads) : []
  const apagado = apagadoDe(elegido, sinClientes, grupos.length > 0)
  return (
    <CampoDelEjemplo
      etiqueta="Lead"
      valor={elegido?.lead?.leadId ?? NINGUNO}
      apagado={apagado}
      alCambiar={(valor) => {
        alElegir(valor === NINGUNO ? null : valor)
      }}
    >
      <option value={NINGUNO}>Ninguno</option>
      {grupos.map((grupo) => (
        <optgroup key={grupo.titulo} label={grupo.titulo}>
          {grupo.leads.map((lead) => (
            <option key={lead.leadId} value={lead.leadId}>
              {lead.nombre}
            </option>
          ))}
        </optgroup>
      ))}
    </CampoDelEjemplo>
  )
}
