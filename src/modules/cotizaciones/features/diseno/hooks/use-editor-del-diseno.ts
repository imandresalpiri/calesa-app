'use client'

import { useCallback, useMemo, useState } from 'react'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { TablaDelCatalogoDelOrigen } from '../../../entities/catalogo-de-tablas'
import type { Diseno } from '../../../entities/diseno'
import { nodosPorId } from '../../../entities/diseno/admite-nivel'
import {
  definicionConNodos,
  ponerEtiqueta,
  ponerFormato,
  SIN_CAMBIOS_DE_NODOS,
  type CambiosDeNodos,
} from '../../../entities/diseno/edicion-de-nodos'
import {
  contextoDelEditor,
  type DisenoParaEditar,
  type NivelDelDiseno,
} from '../../../entities/diseno/edicion-del-diseno'
import type { Definicion } from '../../../entities/formula'
import type { Formato } from '../../../entities/nodos'
import { ordenarPorLectura } from '../../../entities/diseno/lugar-en-la-rejilla'
import { operacionesDeLaHoja } from './operaciones-de-la-hoja'
import { useAvisoDeNivel } from './use-aviso-de-nivel'
import { useGuardadoDelDiseno } from './use-guardar-diseno'
import { useRevisionDelDiseno } from './use-revision-del-diseno'

type Args = {
  origenId: string
  leida: DisenoParaEditar
  // El diseño que se edita (el que la pantalla ya sabe que existe).
  disenoLeido: Diseno
  niveles: readonly NivelDelDiseno[]
  // Las claves del catálogo de tonos; nulo si no se pudo leer (el color de una sección no se elige y nada se marca como fuera del catálogo).
  catalogo: readonly string[] | null
  // El catálogo de tablas del origen; nulo si no se pudo leer (no se revisa que la tabla y las columnas de una ayuda existan).
  tablas: readonly TablaDelCatalogoDelOrigen[] | null
}

// Los nombres de las filas y de los niveles (los mensajes del rechazo y del aviso de nivel).
function useNombres(definicion: Definicion, niveles: readonly NivelDelDiseno[]) {
  const nombresDeNodos = useMemo(
    () => new Map(definicion.nodos.map((n) => [n.id, n.etiqueta])),
    [definicion],
  )
  const nombresDeNiveles = useMemo(
    () => new Map(niveles.map((n) => [n.clave, n.nombre])),
    [niveles],
  )
  return { nombresDeNodos, nombresDeNiveles }
}

// El estado del editor de la hoja: el diseño de trabajo y lo editado de las filas (rótulo y formato: son de la fórmula y van en la `definicion` que se guarda);
// lo que `validarDiseno()` rechaza tras cada cambio, con la pieza a la que apunta (queda aplicado y se marca, no apaga «Guardar»); el aviso «se deduce restando»;
// y el guardado.
export function useEditorDelDiseno({
  origenId,
  leida,
  disenoLeido,
  niveles,
  catalogo,
  tablas,
}: Args) {
  const envio = useUnEnvioALaVez()
  const [trabajo, setTrabajo] = useState<Diseno>(disenoLeido)
  const [nodosEditados, setNodosEditados] = useState<CambiosDeNodos>(SIN_CAMBIOS_DE_NODOS)
  const definicion = useMemo(
    () => definicionConNodos(leida.definicion, nodosEditados),
    [leida.definicion, nodosEditados],
  )

  const nodos = useMemo(() => nodosPorId(definicion), [definicion])
  const { nombresDeNodos, nombresDeNiveles } = useNombres(definicion, niveles)
  // Sin catálogo, los tonos que el diseño nombra cuentan como del catálogo: el contexto sigue al diseño de trabajo.
  const disenoDelContexto = catalogo === null ? trabajo : undefined
  const contexto = useMemo(
    () =>
      contextoDelEditor(definicion, niveles, {
        tonos: catalogo,
        diseno: disenoDelContexto,
        tablas,
      }),
    [definicion, niveles, catalogo, disenoDelContexto, tablas],
  )

  const { rechazo, avisos, bloqueo } = useRevisionDelDiseno({
    definicion,
    trabajo,
    contexto,
    nombresDeNodos,
    nombresDeNiveles,
  })

  // Todo cambio deja las piezas en orden de lectura (`ordenarPorLectura()`): el orden del arreglo es el de la hoja apilada y del Tab. Lo que no cambia nada
  // devuelve el mismo diseño.
  const aplicar = useCallback((cambio: (d: Diseno) => Diseno) => {
    setTrabajo((d) => {
      const despues = cambio(d)
      return despues === d ? d : ordenarPorLectura(despues)
    })
  }, [])
  const aviso = useAvisoDeNivel(nombresDeNiveles)

  const guardado = useGuardadoDelDiseno({
    origenId,
    leida,
    disenoLeido,
    trabajo,
    nodos: nodosEditados,
    definicion,
    bloqueo,
    envio,
    alReemplazar: ({ diseno, nodos: repuestos }) => {
      setTrabajo(diseno)
      setNodosEditados(repuestos)
    },
  })

  return {
    trabajo,
    definicion,
    nodos,
    nombresDeNodos,
    nombresDeNiveles,
    rechazo,
    avisos,
    bloqueo,
    guardado,
    aviso,
    // Mientras guarda, nada cambia.
    ocupado: envio.enCurso,
    // Aplica una operación pura sobre el diseño de trabajo (las de ítems, cabecera, tarjeta y aspecto: `use-ediciones-del-diseno.ts`).
    aplicar,
    ponerEtiqueta: (nodo: string, texto: string) => {
      setNodosEditados((c) => ponerEtiqueta(c, nodo, texto))
    },
    ponerFormato: (nodo: string, formato: Formato) => {
      setNodosEditados((c) => ponerFormato(c, nodo, formato))
    },
    ...operacionesDeLaHoja(trabajo, setTrabajo, {
      etiquetas: nombresDeNodos,
      anotar: aviso.anotar,
    }),
  }
}

export type EditorDelDiseno = ReturnType<typeof useEditorDelDiseno>
