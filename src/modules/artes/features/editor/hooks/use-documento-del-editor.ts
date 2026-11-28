'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { desconocidasDelDocumento } from '../../../entities/datos/capas-con-datos'
import { motivoParaNoGuardar } from '../../../entities/datos/resolver-texto'
import type { CatalogoDelArte } from '../../../entities/datos/variables-del-arte'
import { claveDelBorrador } from '../../../entities/editor/borrador'
import { ladoDeLaMiniatura } from '../../../entities/editor/exportar'
import { tipoDelFormato } from '../../../entities/formatos'
import type { PlantillaDelEditor } from '../../../entities/tipos'
import type { ManejoDeLaMiniatura, ManejoDelLienzo } from '../tipos'
import { useBorradorLocal, type PonerEnElEditor } from './use-borrador-local'
import { useEditorDeArte } from './use-editor-de-arte'
import { useGuardado } from './use-guardado'
import { useInicioDelEditor } from './use-inicio-del-editor'

type Args = {
  plantilla: PlantillaDelEditor
  personaId: string
  soloLectura: boolean
  lienzo: RefObject<ManejoDelLienzo | null>
  // La miniatura de la página 1 en la tira de un PDF: la miniatura de la plantilla de arte sale de ahí cuando el lienzo muestra otra.
  primera: RefObject<ManejoDeLaMiniatura | null>
  // Las variables que el arte llena en el origen de la plantilla: con una que no conoce en algún texto, no se guarda («Corrige {x} para
  // guardar.»).
  catalogo: CatalogoDelArte
  // El lienzo se ve con los datos de ejemplo (sin vehículo elegido): sólo así se arma la miniatura nueva.
  deEjemplo: boolean
}

// Lo que se edita y su destino: con qué arranca (lo guardado o el borrador), el documento con su historial, el nombre, el guardado y el
// borrador local que acompaña a lo que todavía no se guardó. `medidas` (las de la plantilla) también las usa la cámara. La miniatura de la
// lista de Artes es la de la página 1 y se arma sólo con los datos de ejemplo: con un vehículo elegido se guarda sin cambiarla (la plantilla de
// la empresa la ve quien quizás no ve ese vehículo ni su cliente).
export function useDocumentoDelEditor(args: Args) {
  const { plantilla, personaId, soloLectura, lienzo, primera, catalogo, deEjemplo } = args
  const { ancho, alto } = plantilla
  const medidas = useMemo(() => ({ ancho, alto }), [ancho, alto])
  const clave = claveDelBorrador(plantilla.id, personaId)
  const inicio = useInicioDelEditor(plantilla, clave, soloLectura)
  const editor = useEditorDeArte(
    inicio.documento,
    medidas,
    soloLectura,
    tipoDelFormato(plantilla.formato),
  )
  const [nombre, setNombre] = useState(inicio.nombre)
  const { despachar } = editor
  const actual = useMemo(
    () => ({ documento: editor.estado.documento, nombre }),
    [editor.estado.documento, nombre],
  )
  const desconocidas = useMemo(
    () => desconocidasDelDocumento(editor.estado.documento, catalogo),
    [editor.estado.documento, catalogo],
  )
  const motivo = motivoParaNoGuardar(desconocidas)
  const conEjemplo = useRef(deEjemplo)
  const enLaPrimera = useRef(editor.indice === 0)
  useEffect(() => {
    conEjemplo.current = deEjemplo
    enLaPrimera.current = editor.indice === 0
  }, [deEjemplo, editor.indice])
  const miniatura = useCallback(async () => {
    if (!conEjemplo.current) {
      return null
    }
    const desde = enLaPrimera.current ? lienzo.current : (primera.current ?? lienzo.current)
    const hecho = await desde?.imagen({
      pixelRatio: ladoDeLaMiniatura(medidas),
      tipo: 'image/webp',
    })
    return hecho?.blob ?? null
  }, [lienzo, primera, medidas])
  const terminarElTexto = useCallback(() => lienzo.current?.terminarElTexto() ?? false, [lienzo])
  const guardado = useGuardado({
    id: plantilla.id,
    versionInicial: plantilla.actualizadoEn,
    guardadoInicial: { documento: plantilla.documento, nombre: plantilla.nombre },
    actual,
    soloLectura,
    miniatura,
    terminarElTexto,
    motivoParaNoGuardar: motivo,
  })
  const poner: PonerEnElEditor = useCallback(
    (lo, como) => {
      despachar({ tipo: como, documento: lo.documento })
      setNombre(lo.nombre)
    },
    [despachar],
  )
  const borrador = useBorradorLocal({
    clave,
    inicio,
    actual,
    guardado: guardado.guardado,
    version: guardado.version,
    hayCambios: guardado.hayCambios,
    soloLectura,
    alPoner: poner,
  })
  return {
    editor,
    medidas,
    nombre,
    cambiarNombre: setNombre,
    guardado: { ...guardado, motivo },
    borrador,
    desconocidas,
  }
}
