import { IdCardIcon } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import Link from 'next/link'
import { datosO } from '@/shared/lib/errores'
import { rutaDeLaFormula } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { leerPlantillaDelOrigen } from '../../../areas/plantilla/composicion'
import type { FormulaDelOrigen } from '../../../entities/formula-del-origen'
import { idsDelContexto, propsDelEditor } from '../../../entities/plantilla/props-del-editor'
import {
  recortarLaReferencia,
  type ReferenciaDeLaTarjeta,
} from '../../../entities/referencia-de-la-tarjeta'
import type { PropsDelLienzoDeLaPlantilla } from '../../../entities/vista-previa-de-la-plantilla'
import { PestanaDeLaTarjeta } from './pestana-de-la-tarjeta'
import { TarjetaEnElLive } from './tarjeta-en-el-live'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // El origen abierto: la página ya comprobó que la persona tiene `cotizaciones.configurar` en él (este módulo no depende de `origenes`).
  origen: Origen
  // La fórmula del origen que abre la URL: la ruta ya la leyó por id y origen.
  formula: FormulaDelOrigen
  // La cotización de referencia del lienzo: la página la pide sin esperarla (la compone `src/app`, que cruza el listado, la hoja guardada, `leads` y `vehiculos`) y aquí
  // se espera en paralelo con la plantilla. Nunca rechaza: sin cotización o si no se leyó, lo dice.
  referencia: Promise<ReferenciaDeLaTarjeta>
  // El lienzo (el dibujo de la tarjeta): lo llena el área `tarjeta` y este módulo no la importa.
  Lienzo: ComponentType<PropsDelLienzoDeLaPlantilla>
  // `empresa.ajustes.gestionar` de quien mira (lo calcula la página con su sesión): el aviso del logo que no se dibuja abre Empresa.
  puedeCambiarElLogo: boolean
  // Lo que se dibuja si la planilla todavía no tiene una versión publicada, en vez del vacío con «Ir a la planilla» (la puesta en marcha deja seguir).
  sinPlanilla?: ReactNode
  // Con el Modo Live (Configuración de orígenes en «Sólo lectura»): la tarjeta se ve y no se edita.
  soloLectura?: boolean
}

// La pestaña «Tarjeta» de la Fórmula de un origen (Configuración › Orígenes), leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`: el borrador, la
// publicada y la fórmula con la que se validan, y la referencia, a la vez. Al editor sólo llega lo que dibuja (`propsDelEditor()`) y la referencia recortada a sus
// nodos. La base vuelve a decidir (policy `plantillas_tarjeta: leer`). Una lectura de la plantilla que falla sube al `error.tsx` de la ruta, con «Reintentar».
export async function SeccionDeLaPlantilla({
  origen,
  formula,
  referencia,
  Lienzo,
  puedeCambiarElLogo,
  sinPlanilla,
  soloLectura = false,
}: Props) {
  const [lectura, deReferencia] = await Promise.all([
    leerPlantillaDelOrigen(formula.id),
    referencia,
  ])
  const editor = propsDelEditor(datosO(lectura), origen)
  if (editor === null) {
    if (sinPlanilla !== undefined) {
      return sinPlanilla
    }
    return (
      <EstadoVacio
        Icono={IdCardIcon}
        titulo={`Falta publicar la planilla de «${formula.nombre}»: la tarjeta se arma con sus filas.`}
        accion={
          <Link
            href={rutaDeLaFormula(origen.id, formula.id, 'planilla')}
            className={buttonVariants({ className: 'min-h-11 md:min-h-8' })}
          >
            Ir a la planilla
          </Link>
        }
        compacto
      />
    )
  }
  const recortada = recortarLaReferencia(deReferencia, idsDelContexto(editor.contexto))
  if (soloLectura) {
    // Al navegador, sólo lo que dibuja la tarjeta quieta.
    const { inicial, contexto, tonos } = editor
    return (
      <TarjetaEnElLive
        editor={{ inicial, contexto, tonos }}
        referencia={recortada}
        Lienzo={Lienzo}
      />
    )
  }
  return (
    <PestanaDeLaTarjeta
      editor={editor}
      referencia={recortada}
      Lienzo={Lienzo}
      puedeCambiarElLogo={puedeCambiarElLogo}
    />
  )
}
