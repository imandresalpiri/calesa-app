// Espera al cuadro siguiente: lo escrito en el texto abierto entra al documento al salir del campo, y se lee después de que React lo dibuje
// (Ctrl+S y «Descargar PDF» con un texto abierto).
export const unCuadro = () =>
  new Promise<void>((listo) => {
    requestAnimationFrame(() => {
      listo()
    })
  })
