import { metadataDeCatalogo, PaginaDeUnCatalogo } from '../pagina-de-un-catalogo'

export const metadata = metadataDeCatalogo('categorias-de-gasto')

export default function PaginaDeCategoriasDeGasto() {
  return <PaginaDeUnCatalogo clave="categorias-de-gasto" />
}
