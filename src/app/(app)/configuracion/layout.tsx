import { Suspense, type ReactNode } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import { BuscadorDeConfiguracion } from './_navegacion/buscador-de-configuracion'
import { CabeceraDeConfiguracion } from './_navegacion/cabecera-de-configuracion'
import { MarcoSegunLaRuta } from './_navegacion/en-una-seccion'
import { FueraDeLaPaginaDelOrigen } from './_navegacion/fuera-de-la-pagina-del-origen'
import { destinosFueraDeQuienMira, gruposDeQuienMira } from './_navegacion/grupos-de-quien-mira'
import { MenuDeConfiguracion } from './_navegacion/menu-de-configuracion'
import { ICONO_DE_SECCION } from './secciones'

// El marco de toda página de Configuración, el inicio incluido. A la izquierda el menú de Configuración (desde 1024 px y con 44 rem de
// contenedor: con el texto al 200 % el rem crece y el menú pasa al selector sin desbordar), con su buscador arriba (en el inicio, el
// buscador es el de la página); arriba de la página, donde no se ve el menú, el selector de sección y el buscador y, dentro de una sección,
// «‹ Configuración». En la página de un origen no va nada de eso: las migas lo reemplazan y la página usa todo el ancho. Sin ninguna sección que abrir, nada de eso: la página dice «No tienes permiso». Las páginas no esperan a la sesión del
// menú: su `loading.tsx` se ve igual que siempre. Mientras el menú y la cabecera llegan, su lugar queda reservado (la página no salta al llegar).
// En el celular la página deja un respiro abajo: sin él, el «⋯» de la última fila de una lista corta queda bajo la burbuja del chat.
// 10 rem: a 1280 px deja a Equipo el ancho para un correo de 38 letras entero (`equipo-200`); un título largo se parte en dos líneas.
const CLASE_DEL_MENU = 'hidden w-40 shrink-0 lg:@min-[44rem]/configuracion:block'
const RESERVA_DE_LA_CABECERA = 'min-h-[44px] md:min-h-9'
const OCULTA_CON_MENU = 'lg:@min-[44rem]/configuracion:hidden'

export default function LayoutDeConfiguracion({ children }: { children: ReactNode }) {
  return (
    <div className="@container/configuracion flex min-w-0 gap-4">
      <FueraDeLaPaginaDelOrigen>
        <Suspense fallback={<div className={CLASE_DEL_MENU} />}>
          <MenuLateral />
        </Suspense>
      </FueraDeLaPaginaDelOrigen>
      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] content-start gap-4 pb-24 md:pb-0">
        <FueraDeLaPaginaDelOrigen>
          <Suspense
            fallback={
              <MarcoSegunLaRuta
                inicio={RUTAS.inicioDeConfiguracion}
                claseEnElInicio={`${RESERVA_DE_LA_CABECERA} ${OCULTA_CON_MENU}`}
                claseEnUnaSeccion={RESERVA_DE_LA_CABECERA}
              />
            }
          >
            <Cabecera />
          </Suspense>
        </FueraDeLaPaginaDelOrigen>
        {children}
      </div>
    </div>
  )
}

async function MenuLateral() {
  const [grupos, fuera] = await Promise.all([gruposDeQuienMira(), destinosFueraDeQuienMira()])
  if (grupos.length === 0) {
    return null
  }
  return (
    <div className={CLASE_DEL_MENU}>
      <BuscadorDeConfiguracion
        grupos={grupos}
        fuera={fuera}
        variante="menu"
        sinCampoEn={RUTAS.inicioDeConfiguracion}
      >
        <MenuDeConfiguracion grupos={grupos} iconos={ICONO_DE_SECCION} />
      </BuscadorDeConfiguracion>
    </div>
  )
}

async function Cabecera() {
  const [grupos, fuera] = await Promise.all([gruposDeQuienMira(), destinosFueraDeQuienMira()])
  if (grupos.length === 0) {
    return null
  }
  return (
    <MarcoSegunLaRuta
      inicio={RUTAS.inicioDeConfiguracion}
      claseEnElInicio={`grid grid-cols-[minmax(0,1fr)] gap-2 ${OCULTA_CON_MENU}`}
      claseEnUnaSeccion="grid grid-cols-[minmax(0,1fr)] gap-2"
    >
      <CabeceraDeConfiguracion grupos={grupos} fuera={fuera} />
    </MarcoSegunLaRuta>
  )
}
