'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import {
  borradorDeCategoria,
  BORRADOR_NUEVO_DE_CATEGORIA,
  cambiosDeCategoria,
  textoDeUsoDeCategoria,
  validarCategoria,
  type BorradorDeCategoria,
  type CategoriaDeGasto,
} from '../../../entities/dinero/categoria'
import { crearCategoria } from '../actions/crear-categoria'
import { guardarCategoria } from '../actions/guardar-categoria'

type Args = {
  // Nulo = «Nueva categoría». Es la fila vigente de la lista: tras «Recargar» llega con la versión nueva.
  original: CategoriaDeGasto | null
  // De qué origen es lo que se crea (lo que dice «Para»); nulo: compartido con todos.
  origenDelNuevo: string | null
  abierto: boolean
  alCerrar: () => void
  // Relee la lista: al guardar y, tras un conflicto, para traer la versión de ahora.
  alGuardar: () => void
}

const MENSAJE_DE_VALIDACION = 'Revisa los datos de la categoría.'

// El formulario de una categoría de gasto (6.11-4): el borrador y su envío con versión (`useEnvioConVersion`). Crea lo propio del origen o lo compartido (`origenDelNuevo` nulo), según «Para», con el id
// del intento, que nace al abrir (cada apertura remonta el modal). Al editar sólo se manda lo que cambió, con la versión de la fila vigente; sin diferencias, cerrar es
// guardar. Un conflicto deja «Recargar», que relee la lista y conserva lo escrito. El rechazo de la base va junto a su campo (su `hint`) o arriba del formulario.
export function useFormularioDeCategoria({
  original,
  origenDelNuevo,
  abierto,
  alCerrar,
  alGuardar,
}: Args) {
  const [intento] = useState(() => crypto.randomUUID())
  const inicial = original ? borradorDeCategoria(original) : BORRADOR_NUEVO_DE_CATEGORIA
  const [valores, setValores] = useState<BorradorDeCategoria>(inicial)

  const envio = useEnvioConVersion<{ uso: number | null }>({
    abierto,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    version: original?.actualizadoEn ?? null,
    validar: () => {
      const validado = validarCategoria(valores)
      return validado.ok ? null : validado.errores
    },
    pedir: async () => {
      const validado = validarCategoria(valores)
      if (!validado.ok) {
        return { ok: false, error: { codigo: 'validacion', mensaje: MENSAJE_DE_VALIDACION } }
      }
      if (!original) {
        const creada = await enviarAccion(
          crearCategoria({ id: intento, origenId: origenDelNuevo, datos: validado.datos }),
          MENSAJE_DE_VALIDACION,
        )
        return creada.ok ? { ok: true, data: { uso: null } } : creada
      }
      const cambios = cambiosDeCategoria(original, validado.datos)
      return cambios === null
        ? { ok: true, data: { uso: null } }
        : enviarAccion(
            guardarCategoria({ id: original.id, actualizadoEn: original.actualizadoEn, cambios }),
            MENSAJE_DE_VALIDACION,
          )
    },
    alGuardar: ({ uso }) => {
      avisarExito(uso ? textoDeUsoDeCategoria(valores.nombre.trim(), uso) : 'Categoría guardada.')
      alGuardar()
      alCerrar()
    },
    recargar: alGuardar,
  })

  return {
    ...envio,
    valores,
    escribir: (cambios: Partial<BorradorDeCategoria>) => {
      setValores((antes) => ({ ...antes, ...cambios }))
      for (const clave of Object.keys(cambios)) {
        envio.quitarMotivo(clave)
      }
    },
  }
}
