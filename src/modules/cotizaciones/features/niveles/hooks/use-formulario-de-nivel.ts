'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import {
  CLAVE_DEL_NOMBRE,
  normalizarNombreDeNivel,
  validarNivel,
  type ListaDeNiveles,
  type NivelDeAcceso,
} from '../../../entities/nivel'
import { useRespuestaDelFormulario } from './use-respuesta-del-formulario'
import type { Niveles } from './use-niveles'

type Args = {
  niveles: Niveles
  // Nulo = «Nuevo nivel».
  original: NivelDeAcceso | null
  alCerrar: () => void
  // Cerrado (se descartó o se fue con «atrás»), lo que esperaba la red no sale.
  abierto: boolean
  // Al crearse uno: su id y la lista que devolvió la base (el editor de la hoja lo deja elegido donde se pidió).
  alCrear?: (id: string, lista: ListaDeNiveles) => void
}

// El estado del modal de un nivel: el nombre, el motivo junto al campo, el envío. El id del intento nace al abrir y se conserva en cada
// reintento (guardar dos veces lo mismo no duplica). Un conflicto espera la versión nueva (la trae «Recargar») y **conserva lo escrito**; sin
// conexión, lo escrito queda y sale solo al volver. Un envío a la vez lo cuida `useNiveles`: devuelve nulo si ya había uno en vuelo.
export function useFormularioDeNivel({ niveles, original, alCerrar, abierto, alCrear }: Args) {
  const router = useRouter()
  const [intento] = useState(() => crypto.randomUUID())
  const [nombre, setNombre] = useState(original?.nombre ?? '')
  const [recargando, recargarPagina] = useTransition()
  const respuesta = useRespuestaDelFormulario(original, alCerrar)
  const { setErrores } = respuesta

  async function enviar(): Promise<boolean> {
    if (respuesta.conflicto !== null) {
      return false
    }
    const validado = validarNivel(nombre, niveles.niveles, original)
    if (!validado.ok) {
      setErrores(validado.motivos)
      return false
    }
    respuesta.setAviso(null)
    if (!original) {
      const envio = await niveles.crear(intento, validado.nombre)
      if (envio?.ok && envio.data.id !== null) alCrear?.(envio.data.id, envio.data.lista)
      return respuesta.aplicar(envio)
    }
    // Sin cambio no hay nada que guardar: se cierra.
    if (validado.nombre === original.nombre) {
      alCerrar()
      return true
    }
    return respuesta.aplicar(await niveles.renombrar(original, validado.nombre))
  }

  const enLinea = useReintentoAlVolver(abierto ? respuesta.pendiente : null, () => enviar())

  return {
    nombre,
    errores: respuesta.errores,
    aviso: respuesta.aviso,
    conflicto: respuesta.conflicto,
    enCurso: niveles.enCurso,
    enLinea,
    esperandoConexion: respuesta.pendiente !== null,
    // Cerrar ahora perdería lo escrito: el modal pregunta antes.
    hayCambios: normalizarNombreDeNivel(nombre) !== (original?.nombre ?? ''),
    recargando,
    escribir: (valor: string) => {
      setNombre(valor)
      setErrores(({ [CLAVE_DEL_NOMBRE]: _resuelto, ...resto }) => resto)
    },
    enviar,
    reintentar: () => {
      void enviar()
    },
    // La versión nueva llega con la lista de la página; lo escrito se conserva.
    recargar: () => {
      recargarPagina(() => {
        router.refresh()
      })
    },
  }
}
