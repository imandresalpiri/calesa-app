import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { puede, requerirSesion } from '@/modules/equipo'
import {
  MOTIVO_SIN_GESTIONAR_EL_ORIGEN,
  PASOS_DE_LA_PUESTA_EN_MARCHA,
  TITULO_DEL_PASO,
} from '@/modules/origenes'
import { FormularioDelOrigenNuevo } from '@/modules/origenes/pantallas/origen-nuevo'
import { PasoAPaso } from '@/modules/origenes/pantallas/puesta-en-marcha'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { ocultoEnElLive } from '../../../_live/guarda'

export const metadata: Metadata = { title: 'Nuevo origen' }

// El paso 1 de la puesta en marcha (glosario), antes de que el origen exista: el paso a paso con sólo «Datos» y el alta. Al crear lleva al paso Campos
// (`…/puesta-en-marcha/campos`). Pide `origenes.gestionar`.
export default function PaginaNuevoOrigen() {
  return (
    <div className="grid min-w-0 gap-6">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Nuevo origen</h1>
      <Suspense fallback={<EsqueletoFormulario bloques={1} campos={4} />}>
        <Alta />
      </Suspense>
    </div>
  )
}

// Los seis pasos, sin enlaces: el origen todavía no existe. «Datos» es el actual.
const PASOS = PASOS_DE_LA_PUESTA_EN_MARCHA.map((clave) => ({
  clave,
  titulo: TITULO_DEL_PASO[clave],
  estado: 'pendiente' as const,
  ruta: null,
  motivo: null,
}))

async function Alta() {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  await connection()
  const sesion = await requerirSesion()
  if (!puede(sesion.permisos, 'origenes.gestionar')) {
    return <EstadoSinPermiso descripcion={MOTIVO_SIN_GESTIONAR_EL_ORIGEN} />
  }
  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-[14rem_minmax(0,1fr)]">
      <PasoAPaso pasos={PASOS} actual="datos" />
      <FormularioDelOrigenNuevo />
    </div>
  )
}
