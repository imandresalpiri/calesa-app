import { metadataDeCatalogo, PaginaDeUnCatalogo } from '../pagina-de-un-catalogo'

export const metadata = metadataDeCatalogo('puertos')

export default function PaginaDePuertos() {
  return <PaginaDeUnCatalogo clave="puertos" />
}
