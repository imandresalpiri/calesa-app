'use client'

import { useEffect, useRef, useState } from 'react'
import { fallo, type Resultado } from '@/shared/lib/errores'
import { cumpleElMinimo } from '@/shared/lib/filtros'
import {
  NO_SE_CARGARON_LAS_OPCIONES,
  type OpcionesParaElegir,
} from '../../../areas/transporte/composicion.client'
import { normalizarCodigo } from '../../../entities/transporte/borrador-del-embarque'
import { MINIMO_DE_BUSQUEDA_DE_EMBARQUES } from '../../../entities/transporte/filtros-de-embarques'

export type EstadoDeLasOpciones<Fila> =
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | ({ tipo: 'listo' } & OpcionesParaElegir<Fila>)

type Leer<Fila> = (
  origenId: string,
  prefijo: string | null,
) => Promise<Resultado<OpcionesParaElegir<Fila>>>

// Las opciones de un selector que se lee desde el navegador al montarse (los contenedores sin embarque, los embarques del origen): las primeras diez y, con más, se busca por prefijo
// desde 3 letras o dígitos al enviar el campo. Una respuesta vieja no pisa a una más nueva; un error ofrece «Reintentar». Quien lo usa lo monta sólo cuando se ve (su pestaña o su
// campo): `leer` es una función del módulo, la misma en cada render.
export function useOpcionesParaElegir<Fila>(leer: Leer<Fila>, origenId: string) {
  const [estado, setEstado] = useState<EstadoDeLasOpciones<Fila>>({ tipo: 'cargando' })
  const [texto, setTexto] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [pedido, setPedido] = useState<{ prefijo: string | null; vez: number }>({
    prefijo: null,
    vez: 0,
  })
  const ultimo = useRef(0)

  useEffect(() => {
    ultimo.current += 1
    const este = ultimo.current
    void leer(origenId, pedido.prefijo)
      .catch(() => fallo('inesperado', NO_SE_CARGARON_LAS_OPCIONES))
      .then((r) => {
        if (este !== ultimo.current) return
        setEstado(r.ok ? { tipo: 'listo', ...r.data } : { tipo: 'error', mensaje: r.error.mensaje })
      })
  }, [leer, origenId, pedido])

  const pedir = (prefijo: string | null) => {
    setEstado({ tipo: 'cargando' })
    setPedido((antes) => ({ prefijo, vez: antes.vez + 1 }))
  }

  return {
    estado,
    texto,
    aviso,
    escribir: (valor: string) => {
      setTexto(valor)
      setAviso(null)
    },
    buscar: () => {
      const limpio = texto.trim()
      if (limpio !== '' && !cumpleElMinimo(limpio, MINIMO_DE_BUSQUEDA_DE_EMBARQUES)) {
        setAviso(MINIMO_DE_BUSQUEDA_DE_EMBARQUES.aviso)
        return
      }
      // Un booking y un número se guardan sin espacios y en mayúsculas.
      pedir(limpio === '' ? null : normalizarCodigo(limpio))
    },
    reintentar: () => pedir(pedido.prefijo),
  }
}
