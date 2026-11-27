import type { Metadata } from 'next'
import { SeccionDelDiseno } from '@/modules/cotizaciones/pantallas/diseno'
import { PublicarEnLaHoja } from '@/modules/cotizaciones/pantallas/formula-publicar'
import { puede } from '@/shared/lib/permisos'
import { NoSeAbre } from '../../no-se-abre'
import { abrirLaFormulaDeLaPestana, formulaPedida } from '../_formula/abrir-formula'
import { MarcoDeLaFormula } from '../_formula/marco-de-la-formula'
import { ocultoEnElLive } from '../../../../../_live/guarda'

export const metadata: Metadata = { title: 'Hoja de la fórmula' }

// Configuración › Orígenes › un origen › Hoja: el editor de la hoja (el diseño) de la fórmula elegida (`?formula=<id>`; sin ella, la de trabajo), bajo la barra
// de la fórmula, con «Publicar…» del área `formula` en la barra (un área no importa otra: los une la página). Con el Modo Live, la hoja en sólo lectura.
export default async function PaginaDeLaHoja({
  params,
  searchParams,
}: PageProps<'/configuracion/origenes/[id]/hoja'>) {
  const oculto = await ocultoEnElLive('origenes.lectura')
  if (oculto) {
    return oculto
  }
  const [{ id }, consulta] = await Promise.all([params, searchParams])
  const abierta = await abrirLaFormulaDeLaPestana(id, 'hoja', formulaPedida(consulta))
  if (abierta.tipo !== 'abierto') {
    return <NoSeAbre abierto={abierta} />
  }
  const { nombre, activo } = abierta.origen
  return (
    <MarcoDeLaFormula abierta={abierta} parte="hoja" consulta={consulta}>
      {abierta.formula ? (
        <>
          <SeccionDelDiseno
            origen={{ id: abierta.origen.id, nombre, activo }}
            formula={abierta.formula}
            puedeCrearNiveles={puede(abierta.sesion.permisos, 'equipo.roles.gestionar')}
            // El catálogo de colores es de la empresa: como `tono_crear()`, sin origen.
            puedeCrearColores={puede(abierta.sesion.permisos, 'cotizaciones.configurar')}
            soloLectura={abierta.soloLectura}
          />
          {/* Con el Modo Live, sin «Publicar…». */}
          {abierta.soloLectura ? null : (
            <PublicarEnLaHoja
              origen={{ id: abierta.origen.id, nombre }}
              formula={abierta.formula}
            />
          )}
        </>
      ) : null}
    </MarcoDeLaFormula>
  )
}
