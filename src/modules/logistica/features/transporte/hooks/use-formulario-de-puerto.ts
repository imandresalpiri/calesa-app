'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import {
  borradorDePuerto,
  BORRADOR_NUEVO_DE_PUERTO,
  cambiosDePuerto,
  normalizarTexto,
  textoDeUso,
  validarPuerto,
  type BorradorDePuerto,
  type PuertoDeCatalogo,
} from '../../../entities/transporte/catalogo'
import { crearPuerto } from '../actions/crear-puerto'
import { guardarPuerto } from '../actions/guardar-puerto'

type Args = {
  // Nulo = «Nuevo puerto». Es la fila vigente de la lista: tras «Recargar» llega con la versión nueva.
  original: PuertoDeCatalogo | null
  // De qué origen es lo que se crea (lo que dice «Para»); nulo: compartido con todos.
  origenDelNuevo: string | null
  abierto: boolean
  alCerrar: () => void
  // Relee la lista: al guardar y, tras un conflicto, para traer la versión de ahora.
  alGuardar: () => void
}

const MENSAJE_DE_VALIDACION = 'Revisa los datos del puerto.'

// El formulario de un puerto (6.08-1): el borrador y su envío con versión (`useEnvioConVersion`). Crea lo propio del origen o lo compartido (`origenDelNuevo` nulo), según «Para», con el id del intento,
// que nace al abrir (cada apertura remonta el modal). Al editar sólo se manda lo que cambió, con la versión de la fila vigente; sin diferencias, cerrar es guardar. Un
// conflicto deja «Recargar», que relee la lista y conserva lo escrito. El rechazo de la base va junto a su campo (su `hint`) o arriba del formulario.
export function useFormularioDePuerto({
  original,
  origenDelNuevo,
  abierto,
  alCerrar,
  alGuardar,
}: Args) {
  const [intento] = useState(() => crypto.randomUUID())
  const inicial = original ? borradorDePuerto(original) : BORRADOR_NUEVO_DE_PUERTO
  const [valores, setValores] = useState<BorradorDePuerto>(inicial)

  const envio = useEnvioConVersion<{ uso: number | null }>({
    abierto,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    version: original?.actualizadoEn ?? null,
    validar: () => {
      const validado = validarPuerto(valores)
      return validado.ok ? null : validado.errores
    },
    pedir: async () => {
      const validado = validarPuerto(valores)
      if (!validado.ok) {
        return { ok: false, error: { codigo: 'validacion', mensaje: MENSAJE_DE_VALIDACION } }
      }
      if (!original) {
        const creado = await enviarAccion(
          crearPuerto({ id: intento, origenId: origenDelNuevo, datos: validado.datos }),
          MENSAJE_DE_VALIDACION,
        )
        return creado.ok ? { ok: true, data: { uso: null } } : creado
      }
      const cambios = cambiosDePuerto(original, validado.datos)
      return cambios === null
        ? { ok: true, data: { uso: null } }
        : enviarAccion(
            guardarPuerto({ id: original.id, actualizadoEn: original.actualizadoEn, cambios }),
            MENSAJE_DE_VALIDACION,
          )
    },
    alGuardar: ({ uso }) => {
      avisarExito(
        uso ? textoDeUso(normalizarTexto(valores.nombre), uso, false) : 'Puerto guardado.',
      )
      alGuardar()
      alCerrar()
    },
    recargar: alGuardar,
  })

  return {
    ...envio,
    valores,
    escribir: (cambios: Partial<BorradorDePuerto>) => {
      setValores((antes) => ({ ...antes, ...cambios }))
      for (const clave of Object.keys(cambios)) {
        envio.quitarMotivo(clave)
      }
    },
  }
}
