// Lo que el modal de un gasto o un pago lee del envío (`useEnvioDeGasto`, `useEnvioDePago`) para su contrato `FormularioDelModal`: los avisos, la red, el conflicto con su
// «Recargar» y, sin las opciones del formulario, el envío apagado.
type Envio = {
  aviso: string | null
  conflicto: string | null
  enCurso: boolean
  enLinea: boolean
  esperandoConexion: boolean
  recargar: () => void
  recargando: boolean
}

export function estadoDelEnvio(envio: Envio, sinOpciones: boolean, enviar: () => Promise<boolean>) {
  return {
    aviso: envio.aviso,
    conflicto: envio.conflicto,
    enCurso: envio.enCurso,
    enLinea: envio.enLinea,
    esperandoConexion: envio.esperandoConexion,
    sinPoderEnviar: sinOpciones,
    reintentar: () => void enviar(),
    recargar: envio.recargar,
    recargando: envio.recargando,
  }
}
