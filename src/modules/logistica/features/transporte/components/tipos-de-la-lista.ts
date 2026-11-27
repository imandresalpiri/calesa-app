// Lo que la lista de embarques necesita de los catálogos para nombrar naviera y puertos (id y nombre), y lo que comparten sus filas.
export type CatalogosParaNombrar = {
  navieras: readonly { id: string; nombre: string }[]
  puertos: readonly { id: string; nombre: string }[]
}

export type PropsDeLaFila = {
  catalogos: CatalogosParaNombrar
  // El origen de la pestaña: los enlaces a un embarque lo conservan.
  origenId: string
  // `logistica.transporte.editar` en el origen (lo decide `src/app`).
  puedeEditar: boolean
}
