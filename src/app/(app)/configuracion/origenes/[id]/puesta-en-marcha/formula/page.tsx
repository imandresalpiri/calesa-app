import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { leerLaTarjetaDeLaFormula, origenesParaCopiar } from '@/modules/cotizaciones'
import { EmpezarLaFormula } from '@/modules/cotizaciones/pantallas/formulas-del-origen-empezar'
import { SeccionDeLaFormula } from '@/modules/cotizaciones/pantallas/formula'
import { NuevoColorAlVueloDiferido } from '@/modules/cotizaciones/pantallas/diseno-nuevo-color'
import { TarjetaEnVivoDiferida } from '@/modules/cotizaciones/pantallas/tarjeta-formula'
import { getTiposCambio } from '@/modules/empresa'
import { leerOrigenes } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { NoSeAbre } from '../../no-se-abre'
import { abrirLaPuestaEnMarcha, type PuestaEnMarchaAbierta } from '../abrir'
import { MarcoDelPaso, PasoSinPermiso, conPermiso } from '../marco-del-paso'
import { Seguir } from '../seguir'
import { ocultoEnElLive } from '../../../../../_live/guarda'

export const metadata: Metadata = { title: 'Puesta en marcha: Fórmula' }

// Paso 4: sin fórmula, «Empezar en blanco» o «Copiar la de otro origen» (el modal «Nueva fórmula» con el nombre del origen, que al crear se queda en
// este paso); con la fórmula de trabajo, su planilla como en la pestaña «Planilla». «Seguir» no publica: el borrador ya se guardó.
export default async function PasoFormula({
  params,
}: PageProps<'/configuracion/origenes/[id]/puesta-en-marcha/formula'>) {
  const oculto = await ocultoEnElLive('siempre-oculto')
  if (oculto) {
    return oculto
  }
  const { id } = await params
  return (
    <>
      <h1 className="sr-only">Puesta en marcha: Fórmula</h1>
      <Suspense fallback={<EsqueletoFormulario bloques={2} campos={4} />}>
        <Formula id={id} />
      </Suspense>
    </>
  )
}

type Abierta = Extract<PuestaEnMarchaAbierta, { tipo: 'abierto' }>

async function Empezar({ abierta }: { abierta: Abierta }) {
  const { id, nombre } = abierta.origen
  const origenes = datosO(await leerOrigenes()).map((otro) => ({
    id: otro.id,
    nombre: otro.nombre,
  }))
  return (
    <section aria-labelledby="paso-formula-titulo" className="grid max-w-2xl gap-3">
      <h2
        id="paso-formula-titulo"
        className="text-(length:--text-lg) font-semibold text-(--color-ink)"
      >
        Fórmula
      </h2>
      <EmpezarLaFormula
        origen={{ id, nombre }}
        origenesParaCopiar={origenesParaCopiar(origenes, abierta.sesion.permisos, id)}
      />
    </section>
  )
}

function Planilla({
  abierta,
  formula,
}: {
  abierta: Abierta
  formula: NonNullable<Abierta['formulaDeTrabajo']>
}) {
  const { id, nombre, activo } = abierta.origen
  const origen = { id, nombre, activo }
  return (
    <>
      <SeccionDeLaFormula
        origen={origen}
        formula={formula}
        tarjeta={leerLaTarjetaDeLaFormula(origen, formula.id)}
        TarjetaEnVivo={TarjetaEnVivoDiferida}
        // El catálogo de colores es de la empresa: como `tono_crear()`, sin origen.
        NuevoColor={
          puede(abierta.sesion.permisos, 'cotizaciones.configurar')
            ? NuevoColorAlVueloDiferido
            : null
        }
        tiposDeCambio={getTiposCambio().then((tipos) =>
          tipos.map(({ clave, nombre: elNombre }) => ({ clave, nombre: elNombre })),
        )}
        puedeCambiarTiposDeCambio={puede(abierta.sesion.permisos, 'empresa.tipos_cambio.gestionar')}
      />
      <Seguir origenId={id} paso="formula" estado={abierta.estado} />
    </>
  )
}

async function Formula({ id }: { id: string }) {
  await connection()
  const abierta = await abrirLaPuestaEnMarcha(id)
  if (abierta.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierta} />
  }
  const formula = abierta.formulaDeTrabajo
  return (
    <MarcoDelPaso abierta={abierta} paso="formula">
      {!conPermiso(abierta, 'formula') ? (
        <PasoSinPermiso abierta={abierta} paso="formula" />
      ) : formula === null ? (
        <>
          <Empezar abierta={abierta} />
          <Seguir origenId={id} paso="formula" estado={abierta.estado} />
        </>
      ) : (
        <Planilla abierta={abierta} formula={formula} />
      )}
    </MarcoDelPaso>
  )
}
