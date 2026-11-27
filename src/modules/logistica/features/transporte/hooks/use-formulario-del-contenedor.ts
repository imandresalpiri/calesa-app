'use client'

import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import {
  borradorDelContenedor,
  cambiosDe,
  validarContenedor,
  type BorradorDelContenedor,
} from '../../../entities/transporte/borrador-del-embarque'
import type { ContenedorLeido } from '../../../entities/transporte/embarque'
import type { ContenedorDeLaLista } from '../../../entities/transporte/lista-de-embarques'
import type { EntidadGuardada } from '../../../entities/transporte/repositorio-de-embarques'
import { tituloDelContenedor } from '../../../entities/transporte/textos'
import { crearContenedor } from '../actions/crear-contenedor'
import { guardarContenedor } from '../actions/guardar-contenedor'

export type ModoDelContenedor = 'nuevo' | 'elegir'

type Args = {
  // Nulo = «Agregar contenedor» (al embarque `embarqueId`); con él, «Editar el contenedor».
  original: ContenedorLeido | null
  embarqueId: string | null
  origenId: string
  abierto: boolean
  alCerrar: () => void
}

const MENSAJE_DE_VALIDACION = 'Revisa los datos del contenedor.'

// La clave en la base de cada campo del borrador (la del `hint` de un rechazo).
export const CLAVE_DEL_CONTENEDOR_EN_LA_BASE: Record<keyof BorradorDelContenedor, string> = {
  numero: 'numero',
  tipo: 'tipo',
  sello: 'sello',
  embarque: 'embarque_id',
  notas: 'notas',
}

const datosLeidos = (c: ContenedorLeido) => ({
  numero: c.numero,
  tipo: c.tipo,
  sello: c.sello,
  embarque_id: c.embarque?.id ?? null,
  notas: c.notas,
})

type Pedido = {
  modo: ModoDelContenedor
  elegido: ContenedorDeLaLista | null
  embarqueId: string | null
  valores: BorradorDelContenedor
  original: ContenedorLeido | null
  origenId: string
  intento: string
}

// Lo que se manda según el modo: poner el embarque a uno elegido, crear uno nuevo o guardar lo que cambió.
async function pedirElContenedor({
  modo,
  elegido,
  embarqueId,
  valores,
  original,
  origenId,
  intento,
}: Pedido): Promise<Envio<EntidadGuardada | null>> {
  if (modo === 'elegir' && elegido !== null && embarqueId !== null) {
    return enviarAccion(
      guardarContenedor({
        id: elegido.id,
        origenId,
        actualizadoEnEsperado: elegido.actualizadoEn,
        cambios: { embarque_id: embarqueId },
      }),
      MENSAJE_DE_VALIDACION,
    )
  }
  const validado = validarContenedor(valores)
  if (!validado.ok) {
    return { ok: false, error: { codigo: 'validacion', mensaje: MENSAJE_DE_VALIDACION } }
  }
  if (original === null) {
    return enviarAccion(
      crearContenedor({ id: intento, origenId, datos: validado.datos }),
      MENSAJE_DE_VALIDACION,
    )
  }
  const cambios = cambiosDe(datosLeidos(original), validado.datos)
  return cambios === null
    ? { ok: true, data: null }
    : enviarAccion(
        guardarContenedor({
          id: original.id,
          origenId,
          actualizadoEnEsperado: original.actualizadoEn,
          cambios,
        }),
        MENSAJE_DE_VALIDACION,
      )
}

// El formulario de un contenedor. «Nuevo» lo crea con el id del intento (en el embarque desde el que se agrega); «Elegir uno sin embarque» le pone ese embarque a uno que ya existe,
// con la versión que se leyó al listarlo; editar manda sólo lo que cambió (también su embarque: «Asignar a un embarque»). Un `PT409` deja «Recargar» y conserva lo escrito.
export function useFormularioDelContenedor({
  original,
  embarqueId,
  origenId,
  abierto,
  alCerrar,
}: Args) {
  const [intento] = useState(() => crypto.randomUUID())
  const [inicial] = useState(() =>
    borradorDelContenedor(
      original ? { ...original, embarqueId: original.embarque?.id ?? null } : null,
      embarqueId,
    ),
  )
  const [valores, setValores] = useState<BorradorDelContenedor>(inicial)
  const [modo, setModo] = useState<ModoDelContenedor>('nuevo')
  const [elegido, setElegido] = useState<ContenedorDeLaLista | null>(null)

  const validar = (): Record<string, string> | null => {
    if (modo === 'elegir') return elegido ? null : { elegido: 'Elige un contenedor.' }
    const validado = validarContenedor(valores)
    return validado.ok ? null : validado.errores
  }

  const envio = useEnvioConVersion<EntidadGuardada | null>({
    abierto,
    hayCambios:
      (modo === 'elegir' && elegido !== null) ||
      JSON.stringify(valores) !== JSON.stringify(inicial),
    version: original?.actualizadoEn ?? elegido?.actualizadoEn ?? null,
    validar,
    pedir: () =>
      pedirElContenedor({ modo, elegido, embarqueId, valores, original, origenId, intento }),
    alGuardar: (guardado) => {
      if (guardado !== null) {
        avisarExito(
          original
            ? 'Contenedor guardado.'
            : `${tituloDelContenedor(modo === 'elegir' && elegido ? elegido.numero : valores.numero.toUpperCase())} agregado.`,
        )
      }
      alCerrar()
    },
  })

  return {
    ...envio,
    valores,
    modo,
    elegido,
    cambiarModo: setModo,
    elegir: (c: ContenedorDeLaLista) => {
      setElegido(c)
      envio.quitarMotivo('elegido')
    },
    escribir: (cambios: Partial<BorradorDelContenedor>) => {
      setValores((antes) => ({ ...antes, ...cambios }))
      for (const clave of Object.keys(cambios) as (keyof BorradorDelContenedor)[]) {
        envio.quitarMotivo(CLAVE_DEL_CONTENEDOR_EN_LA_BASE[clave])
      }
    },
  }
}
