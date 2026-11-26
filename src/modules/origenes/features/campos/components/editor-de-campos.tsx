'use client'

import {
  EditorDeCampos as EditorCompartido,
  type CasillasDelEditor,
  type FijosDelEditor,
} from '@/shared/ui/campos'
import type { CatalogoLeido } from '@/shared/lib/catalogo'
import type { CampoDeLayout } from '../../../entities/campo'
import {
  DATOS_COMUNES,
  MENSAJE_TOPE_DE_DATOS_CLAVE,
  TOPE_DE_DATOS_CLAVE,
  datosComunesDe,
  type DatoClave,
} from '../../../entities/datos-clave'
import {
  MOTIVO_DATOS_CLAVE_VACIOS,
  datoDeLlave,
  llaveDeDatoClave,
} from '../../../entities/datos-clave-edicion'
import type { TipoDeOrigen } from '../../../entities/origen'
import { configuracionDeOrigen } from '../configuracion'
import { useCampos } from '../hooks/use-campos'
import { useDatosClave } from '../hooks/use-datos-clave'
import { useGruposDelOrigen } from '../hooks/use-grupos-del-origen'

type Props = {
  origenId: string
  tipoDeOrigen: TipoDeOrigen
  // Todos, también los desactivados, en el orden del layout.
  campos: readonly CampoDeLayout[]
  // El catálogo de grupos de campos del origen, también los inactivos.
  grupos: CatalogoLeido
  puedeGestionar: boolean
  // Los datos clave guardados y la versión del origen con la que se guardan.
  datosClave: readonly DatoClave[]
  versionDelOrigen: string
}

const TEXTOS_DE_LAS_CASILLAS = {
  titulo: 'Datos clave',
  zona: 'los datos clave',
  tope: TOPE_DE_DATOS_CLAVE,
  vacio: MOTIVO_DATOS_CLAVE_VACIOS,
  motivoTope: MENSAJE_TOPE_DE_DATOS_CLAVE,
  insignia: 'Dato clave',
  hacer: 'Hacer dato clave',
  quitar: 'Quitar de los datos clave',
  notaAlDesactivar: 'También sale de los datos clave.',
} as const

// Qué dato es una casilla llena y de dónde sale.
function casillaDe(dato: DatoClave, campos: readonly CampoDeLayout[]) {
  if ('comun' in dato) {
    const comun = DATOS_COMUNES.find((otro) => otro.clave === dato.comun)
    return {
      llave: llaveDeDatoClave(dato),
      etiqueta: comun?.etiqueta ?? dato.comun,
      deDonde: 'Dato común',
    }
  }
  const campo = campos.find((otro) => otro.clave === dato.campo)
  return {
    llave: llaveDeDatoClave(dato),
    etiqueta: campo?.etiqueta ?? dato.campo,
    deDonde: campo?.grupo ? `Campo · ${campo.grupo}` : 'Campo',
  }
}

// «Campos» de un origen: el editor compartido con las casillas de dato clave (los datos comunes del tipo y los campos activos) y las
// banderas, los textos y las operaciones de los vehículos.
export function EditorDeCampos(props: Props) {
  const { origenId, tipoDeOrigen, campos, puedeGestionar, datosClave, versionDelOrigen } = props
  const ediciones = useCampos()
  const datos = useDatosClave({ origenId, datosClave, versionDelOrigen })
  const catalogo = useGruposDelOrigen(origenId, props.grupos, puedeGestionar)
  const actual = campos.find((campo) => campo.principal)
  const principal = actual === undefined ? null : { clave: actual.clave, etiqueta: actual.etiqueta }
  const conDato = (llave: string, hacer: (dato: DatoClave) => void) => {
    const dato = datoDeLlave(llave)
    if (dato !== null) {
      hacer(dato)
    }
  }

  const casillas: CasillasDelEditor = {
    ...TEXTOS_DE_LAS_CASILLAS,
    lista: datos.lista.map((dato) => casillaDe(dato, campos)),
    enCurso: datos.enCurso,
    llaveDeCampo: (campo) => llaveDeDatoClave({ campo: campo.clave }),
    alPoner: (llave, posicion) => {
      conDato(llave, (dato) => {
        datos.poner(dato, posicion)
      })
    },
    alQuitar: (llave) => {
      conDato(llave, datos.quitar)
    },
    alMover: datos.moverA,
  }
  const fijos: FijosDelEditor = {
    titulo: 'Comunes',
    insignia: 'Común',
    filas: datosComunesDe(tipoDeOrigen).map((comun) => ({
      llave: llaveDeDatoClave({ comun: comun.clave }),
      etiqueta: comun.etiqueta,
    })),
  }

  return (
    <EditorCompartido
      campos={campos}
      puedeGestionar={puedeGestionar}
      configuracion={configuracionDeOrigen({ origenId, tipoDeOrigen, principal })}
      ediciones={ediciones}
      grupos={catalogo}
      casillas={casillas}
      fijos={fijos}
    />
  )
}
