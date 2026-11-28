'use client'

import { useMemo } from 'react'
import { useLive } from '@/shared/ui/live'
import { capasConDatos } from '../../../entities/datos/capas-con-datos'
import { conLasQueNoCargaron } from '../../../entities/datos/imagenes-que-no-cargaron'
import { juntarLoQueFalta } from '../../../entities/datos/lo-que-falta'
import type { DatosDelArte } from '../../../entities/datos/tipos'
import { valoresDelArte } from '../../../entities/datos/valores-del-arte'
import { variablesDelArte, type CatalogoDelArte } from '../../../entities/datos/variables-del-arte'
import { FOTO_DE_LA_MINIATURA } from '../../../entities/editor/fuente-de-la-capa'
import type { DatosEnElEditor, EditorDeArte, PropsDelEditorDeArtes } from '../tipos'
import { useImagenesQueFallaron } from './use-imagen-del-lienzo'
import { useVehiculoDeEjemplo, type VehiculoDeEjemploDelEditor } from './use-vehiculo-de-ejemplo'

const SIN_FALTAS: DatosEnElEditor['faltan'] = []

// Con un vehículo real y los clientes apagados en el Modo Live, ningún nombre de lead llega al lienzo (los de ejemplo no son de nadie).
function conElLive(datos: DatosDelArte, sinClientes: boolean): DatosDelArte {
  return sinClientes && !datos.deEjemplo && datos.lead !== null ? { ...datos, lead: null } : datos
}

// El vehículo de ejemplo del editor (`useVehiculoDeEjemplo`) y el catálogo del origen: van antes del documento, que los usa para la
// miniatura (sólo con los datos de ejemplo) y para no guardar con una variable desconocida.
export function useEjemploDelEditor(props: PropsDelEditorDeArtes) {
  const { origen, fijos, motivoDelEjemplo, personaId, plantilla } = props
  const catalogo = useMemo(
    () => variablesDelArte({ tipo: origen.tipo, campos: origen.campos }),
    [origen.tipo, origen.campos],
  )
  const ejemplo = useVehiculoDeEjemplo({
    personaId,
    plantillaId: plantilla.id,
    origen,
    fijos,
    motivo: motivoDelEjemplo,
  })
  return { catalogo, ejemplo }
}

type Args = {
  props: PropsDelEditorDeArtes
  editor: EditorDeArte
  catalogo: CatalogoDelArte
  ejemplo: VehiculoDeEjemploDelEditor
  desconocidas: readonly string[]
}

// Los datos con que se ve la plantilla de arte (docs/GLOSARIO.md › «Elemento con datos»): los del vehículo de ejemplo, el Modo Live (los
// montos sin moneda; con los clientes apagados, sin el lead real), la página elegida resuelta (`capasConDatos`) y lo que falta en todo el
// documento (también lo que no cargó; las otras páginas, con la foto de su miniatura). Se reparte por props: el lienzo (react-konva), los
// paneles, la tira de páginas y el inspector.
export function useDatosDelEditor({ props, editor, catalogo, ejemplo, desconocidas }: Args) {
  const { origen, logos } = props
  const { live } = useLive()
  const sinClientes = live && props.liveDelCliente === 'apagado'
  const datos = useMemo(() => conElLive(ejemplo.datos, sinClientes), [ejemplo.datos, sinClientes])
  const valores = useMemo(
    () => valoresDelArte(datos, { sinMoneda: live, catalogo }),
    [datos, live, catalogo],
  )
  const { pagina, paginas } = editor
  const conDatos = useMemo(
    () => capasConDatos(pagina, valores, { logos, datos, sinMoneda: live, catalogo }),
    [pagina, valores, logos, datos, live, catalogo],
  )
  const fallidas = useImagenesQueFallaron()
  const faltan = useMemo(() => {
    if (datos.deEjemplo) {
      return SIN_FALTAS
    }
    const enMiniatura = {
      ...{ logos, datos, sinMoneda: live, catalogo },
      anchoDeLaFoto: FOTO_DE_LA_MINIATURA,
    }
    return juntarLoQueFalta(
      paginas.map((p) =>
        conLasQueNoCargaron(
          p,
          p === pagina ? conDatos : capasConDatos(p, valores, enMiniatura),
          fallidas,
        ),
      ),
    )
  }, [datos, paginas, pagina, conDatos, fallidas, valores, logos, live, catalogo])
  const enElEditor: DatosEnElEditor = useMemo(
    () => ({ origen, catalogo, datos, valores, sinMoneda: live, conDatos, faltan, desconocidas }),
    [origen, catalogo, datos, valores, live, conDatos, faltan, desconocidas],
  )
  return { datos: enElEditor, sinClientes }
}
