'use client'

import { useState } from 'react'
import { motivosPorCampo } from '@/shared/lib/campos/esquema-de-valor'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import { configuracionDe, MOTIVO_YA_NO_ESTA_EN_LA_RUEDA } from '../../../../entities/cola/rueda'
import type { FilaDelTablero } from '../../../../entities/cola/tablero'
import { configurarEnLaRueda } from '../actions/configurar-en-la-rueda'
import { useAvisoDeLaRueda } from '../hooks/use-aviso-de-la-rueda'
import { esquemaEnLaRueda } from '../schemas/rueda'
import { CamposDeLaRueda, type ValoresDeLaRueda } from './campos-de-la-rueda'

export type PropsDelModalDeEditarEnLaRueda = {
  abierto: boolean
  alCerrar: () => void
  // La persona que se edita, con lo que tiene hoy en la rueda: llega por props al abrir y nunca va en la `key`.
  fila: FilaDelTablero
  // Sigue habilitada en la rueda: si con el modal abierto la quitó otra persona, ya no se guarda y el modal lo dice.
  sigueEnLaRueda: boolean
  // Quien mira puede abrir Roles: el aviso de «su rol no recibe turnos» lleva el enlace.
  puedeVerRoles: boolean
}

const CLAVES = ['maxAbiertas', 'prioridad', 'orden'] as const

function valoresDe(fila: FilaDelTablero): ValoresDeLaRueda {
  const c = configuracionDe(fila)
  return {
    maxAbiertas: c.maxAbiertas === null ? '' : String(c.maxAbiertas),
    prioridad: String(c.prioridad),
    orden: String(c.orden),
  }
}

function numeroDe(texto: string): number {
  return texto.trim() === '' ? Number.NaN : Number(texto)
}

// Lo escrito, como lo espera la action: un cupo vacío hereda la política; un número que no es tal no pasa el esquema y vuelve a su campo.
function entradaDe(usuarioId: string, valores: ValoresDeLaRueda) {
  return {
    usuarioId,
    maxAbiertas: valores.maxAbiertas.trim() === '' ? null : numeroDe(valores.maxAbiertas),
    prioridad: numeroDe(valores.prioridad),
    orden: numeroDe(valores.orden),
  }
}

// «Editar…» de una persona de la rueda (`?panel=editar-en-la-rueda&para=<usuarioId>`): su cupo (vacío hereda el de la política), su prioridad y su orden.
// Cada apertura empieza de lo que tiene hoy. Sin versión: la última escritura gana (8.04-1, D8). Si al guardar su rol no recibe turnos, lo avisa.
export function ModalDeEditarEnLaRueda(props: PropsDelModalDeEditarEnLaRueda) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeLaPersona key={apertura} {...props} />
}

function FormularioDeLaPersona({
  abierto,
  alCerrar,
  fila,
  sigueEnLaRueda,
  puedeVerRoles,
}: PropsDelModalDeEditarEnLaRueda) {
  const original = valoresDe(fila)
  const [valores, setValores] = useState(original)
  const avisarGuardado = useAvisoDeLaRueda(puedeVerRoles)
  const hayCambios = CLAVES.some((clave) => valores[clave] !== original[clave])
  const formulario = useEnvioDeModal({
    abierto,
    hayCambios,
    validar: () => {
      const leido = esquemaEnLaRueda.safeParse(entradaDe(fila.usuarioId, valores))
      return leido.success ? null : motivosPorCampo(leido.error.issues)
    },
    pedir: async () =>
      hayCambios
        ? enviarAccion(
            configurarEnLaRueda(entradaDe(fila.usuarioId, valores)),
            'No se pudo guardar lo de esta persona en la rueda.',
          )
        : { ok: true, data: { enLaRueda: null } },
    alGuardar: (dato) => {
      alCerrar()
      if (hayCambios) {
        avisarGuardado(dato.enLaRueda, fila.nombre)
      }
    },
  })
  return (
    <ModalDeFormulario
      id="editar-en-la-rueda"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Editar a ${fila.nombre} en la rueda`}
      formulario={formulario}
      noDisponible={sigueEnLaRueda ? null : MOTIVO_YA_NO_ESTA_EN_LA_RUEDA}
    >
      <CamposDeLaRueda
        valores={valores}
        errores={formulario.errores}
        alCambiar={(nuevos) => {
          for (const clave of CLAVES) {
            if (nuevos[clave] !== valores[clave]) {
              formulario.quitarMotivo(clave)
            }
          }
          setValores(nuevos)
        }}
      />
    </ModalDeFormulario>
  )
}
