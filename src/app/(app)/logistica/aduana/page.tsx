import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  esquemaDeFiltrosDeAduana,
  leerDeclaraciones,
  PANEL_EDITAR_DECLARACION,
  PANEL_NUEVA_DECLARACION,
  pedidoDeAduana,
} from '@/modules/logistica'
import {
  DrawerDeDeclaracion,
  DrawerDeLaDeclaracion,
  ListadoDeAduana,
} from '@/modules/logistica/pantallas/aduana'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, CLAVE_DE_PANEL, leerFiltros } from '@/shared/lib/filtros'
import { leerCursor } from '@/shared/lib/paginacion'
import { puede } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { EsqueletoDetalle, EsqueletoListado } from '@/shared/ui/esqueletos'
import { abrirLaPestana } from '../abrir-la-pestana'
import { BarraDeLogistica } from '../barra-de-logistica'
import { EsqueletoDeLaBarra } from '../esqueleto-de-la-barra'
import { CLAVE_DE_DECLARACION } from './clave-de-declaracion'
import { DeclaracionAbierta, DeclaracionEnEdicion } from './declaracion-abierta'

export const metadata: Metadata = { title: 'Aduana' }

// Las declaraciones aduaneras del origen elegido que quien mira puede ver (`docs/UX.md` › «Logística»): las que tienen algún vehículo del origen y las que todavía
// no tienen ninguno («Sin vehículos»). Una página por cursor `(creado_en, id)` con sus filtros en la URL (`canal`, `pagada`, `q`). Lo que se ve lo decide la base
// (`declaraciones_listar()` es invocadora y sale vacía o con `42501` sin la clave); acá sólo se arma el pedido y se dibuja. La fila abre el resumen
// (`?declaracion=`). Ningún total exacto: lo que se muestra es la fila.
export default function PaginaDeAduana({ searchParams }: PageProps<'/logistica/aduana'>) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      {/* El h1 va fuera del Suspense: está también cargando y sin permiso (9.12-5, R3). Sin cabecera visible: la ocupa la barra. */}
      <h1 className="sr-only">Aduana</h1>
      <Suspense fallback={<EsqueletoDeLaBarra />}>
        <BarraDeLogistica searchParams={searchParams} pestana="aduana" />
      </Suspense>
      <Suspense fallback={<EsqueletoListado filas={8} columnas={6} />}>
        <Listado searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Listado({
  searchParams,
}: {
  searchParams: PageProps<'/logistica/aduana'>['searchParams']
}) {
  const abierta = await abrirLaPestana(searchParams, 'aduana')
  if (abierta.tipo === 'estado') {
    // Un enlace a una declaración (la actividad, que no sabe su origen) la abre aunque el origen que se resolvió no tenga Aduana: en lectura, y la base decide si la ve.
    const pedida = unParametro((await searchParams)[CLAVE_DE_DECLARACION])
    return (
      <>
        {abierta.estado}
        {pedida ? (
          <DrawerDeLaDeclaracion clave={CLAVE_DE_DECLARACION}>
            <Suspense key={pedida} fallback={<EsqueletoDetalle />}>
              <DeclaracionAbierta id={pedida} puedeGestionar={false} origenId={null} />
            </Suspense>
          </DrawerDeLaDeclaracion>
        ) : null}
      </>
    )
  }
  const { permisos, origen, parametros } = abierta
  const esquema = esquemaDeFiltrosDeAduana()
  const pedido = pedidoDeAduana(leerFiltros(esquema, parametros), {
    origenId: origen.id,
    cursor: leerCursor(unParametro(parametros[CLAVE_DE_CURSOR])),
  })
  const pagina = datosO(await leerDeclaraciones(pedido))
  const declaracion = unParametro(parametros[CLAVE_DE_DECLARACION])
  const panel = unParametro(parametros[CLAVE_DE_PANEL])
  const puedeGestionar = puede(permisos, 'logistica.aduana.gestionar', origen.id)
  // El formulario y el resumen no conviven (D8): el panel de alta o de edición, si hay permiso, tapa al resumen.
  const nueva = puedeGestionar && panel === PANEL_NUEVA_DECLARACION
  const editar = puedeGestionar && panel === PANEL_EDITAR_DECLARACION
  return (
    <>
      <ListadoDeAduana
        pagina={pagina}
        esquema={esquema}
        claveDeDeclaracion={CLAVE_DE_DECLARACION}
        puedeGestionar={puedeGestionar}
      />
      {nueva ? <DrawerDeDeclaracion original={null} /> : null}
      {!nueva && declaracion && editar ? (
        <Suspense
          key={`editar-${declaracion}`}
          fallback={
            <DrawerDeLaDeclaracion clave={CLAVE_DE_DECLARACION}>
              <EsqueletoDetalle />
            </DrawerDeLaDeclaracion>
          }
        >
          <DeclaracionEnEdicion id={declaracion} />
        </Suspense>
      ) : null}
      {!nueva && declaracion && !editar ? (
        <DrawerDeLaDeclaracion clave={CLAVE_DE_DECLARACION}>
          <Suspense key={declaracion} fallback={<EsqueletoDetalle />}>
            <DeclaracionAbierta
              id={declaracion}
              puedeGestionar={puedeGestionar}
              origenId={origen.id}
            />
          </Suspense>
        </DrawerDeLaDeclaracion>
      ) : null}
    </>
  )
}
