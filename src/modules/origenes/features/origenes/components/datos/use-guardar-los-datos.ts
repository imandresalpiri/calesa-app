'use client'

import { useState } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import type { OrigenConUso } from '../../../../entities/origen'
import { useOrigenes } from '../../hooks/use-origenes'
import type { ValoresDeOrigen } from '../../hooks/use-valores-de-origen'

// El envío del drawer «Datos»: guarda con la versión que se ve (`actualizadoEnEsperado`), cierra al salir bien y, si no, deja lo tipeado con el error en su
// campo (el nombre repetido), el foco en el primero o el conflicto (`PT409`) para su aviso. Tras «Recargar», la próxima vez manda la versión nueva.
export function useGuardarLosDatos(
  origen: OrigenConUso,
  valores: ValoresDeOrigen,
  alCerrar: () => void,
) {
  const ediciones = useOrigenes()
  const [errorDeNombre, setErrorDeNombre] = useState<string | undefined>(undefined)
  const [conflicto, setConflicto] = useState<string | null>(null)

  async function guardar(elemento: HTMLFormElement) {
    setErrorDeNombre(undefined)
    setConflicto(null)
    const resultado = await ediciones.guardarDatos(
      {
        id: origen.id,
        actualizadoEnEsperado: origen.actualizadoEn,
        nombre: valores.nombre,
        sustantivo: valores.sustantivo,
        genero: valores.genero,
        color: valores.color,
        ...(origen.tipo === 'subasta' ? { plataformas: valores.plataformas } : {}),
      },
      `Origen «${valores.nombre.trim()}» guardado`,
    )
    if (resultado.ok) {
      alCerrar()
      return
    }
    if (resultado.error.codigo === 'conflicto') {
      setConflicto(resultado.error.mensaje)
      return
    }
    if (resultado.error.codigo === 'duplicado') {
      setErrorDeNombre(resultado.error.mensaje)
    }
    enfocarPrimerError(elemento)
  }

  return {
    guardar,
    enCurso: ediciones.enCurso,
    errores: ediciones.errores.guardar,
    errorDeNombre,
    conflicto,
    olvidarErrorDeNombre: () => {
      setErrorDeNombre(undefined)
    },
    olvidarConflicto: () => {
      setConflicto(null)
    },
  }
}
