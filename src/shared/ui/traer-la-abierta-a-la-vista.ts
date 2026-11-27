// Deja a la vista la pestaña abierta de una barra que se desplaza de costado, moviendo sólo la barra. `scrollIntoView` movía también lo que la
// contiene: la página (con la barra fuera de la vista, se giró el celular o se amplió el texto con la página desplazada, la subía de golpe) o el
// cuerpo de un panel (con algo arriba, como la portada del resumen de una cotización, lo tapaba al abrirlo).
// La abierta es la pestaña elegida (`aria-selected`) o, en una barra de enlaces, la de la página (`aria-current`).
export function traerLaAbiertaALaVista(barra: HTMLElement): void {
  const abierta = barra.querySelector('[aria-selected=true], [aria-current=page]')
  if (!abierta) {
    return
  }
  const pestana = abierta.getBoundingClientRect()
  const caja = barra.getBoundingClientRect()
  if (pestana.left < caja.left) {
    barra.scrollLeft -= caja.left - pestana.left
  } else if (pestana.right > caja.right) {
    barra.scrollLeft += pestana.right - caja.right
  }
}
