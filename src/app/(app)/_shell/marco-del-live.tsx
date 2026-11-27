// El marco del Live (docs/GLOSARIO.md › «Marco del Live»): el borde animado y el distintivo «EN VIVO» que se ven sobre toda la app mientras el Modo Live
// está encendido. Un Server Component sin JS: siempre está en el HTML y es el CSS de `globals.css` el que lo muestra con la clase `live` de <html>
// (`display: none` sin ella), así una recarga con el Live encendido no deja un instante sin marco. No recibe clics, no tapa contenido ni cambia el tamaño de
// nada. El distintivo es decorativo: lo que lee un lector de pantalla del Live es el interruptor de la barra.
export function MarcoDelLive() {
  return (
    <div data-marco-del-live="" aria-hidden>
      <span data-marco-del-live-etiqueta="">
        <span className="punto-en-vivo" />
        EN VIVO
      </span>
    </div>
  )
}
