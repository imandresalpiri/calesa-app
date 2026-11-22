import { metadataDeCatalogo, PaginaDeUnCatalogo } from '../pagina-de-un-catalogo'

export const metadata = metadataDeCatalogo('navieras')

export default function PaginaDeNavieras() {
  return <PaginaDeUnCatalogo clave="navieras" />
}
