// Sólo pruebas: un proveedor del asistente de IA de verdad, un servidor HTTP en 127.0.0.1 que guarda cada pedido y contesta lo que diga
// `contestar` (null: no contesta y el tiempo se agota). Lo usan `proveedor.test.ts` y `http.test.ts`, en el entorno `node`.
import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'

export type PedidoRecibido = {
  metodo: string
  ruta: string
  autorizacion: string
  cuerpo: Record<string, unknown>
}

export type Contestacion = { status: number; cuerpo?: unknown; ubicacion?: string } | null

export const conTexto = (content: string): Contestacion => ({
  status: 200,
  cuerpo: { choices: [{ message: { content } }] },
})

const leerCuerpo = async (req: IncomingMessage) => {
  let texto = ''
  for await (const parte of req) texto += String(parte)
  return texto ? (JSON.parse(texto) as Record<string, unknown>) : {}
}

export async function levantarProveedorFalso() {
  const pedidos: PedidoRecibido[] = []
  const estado = { contestar: (_pedido: PedidoRecibido): Contestacion => conTexto('ok') }
  const servidor = createServer((req, res) => {
    void leerCuerpo(req).then((cuerpo) => {
      const pedido = {
        metodo: req.method ?? '',
        ruta: req.url ?? '',
        autorizacion: req.headers.authorization ?? '',
        cuerpo,
      }
      pedidos.push(pedido)
      const respuesta = estado.contestar(pedido)
      if (!respuesta) return
      res.writeHead(respuesta.status, {
        'content-type': 'application/json',
        ...(respuesta.ubicacion ? { location: respuesta.ubicacion } : {}),
      })
      res.end(respuesta.cuerpo === undefined ? '' : JSON.stringify(respuesta.cuerpo))
    })
  })
  await new Promise<void>((listo) => servidor.listen(0, '127.0.0.1', listo))
  return {
    base: `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`,
    pedidos,
    contestar(conQue: (pedido: PedidoRecibido) => Contestacion) {
      estado.contestar = conQue
    },
    reiniciar() {
      pedidos.length = 0
      estado.contestar = () => conTexto('Texto del servidor falso')
    },
    async cerrar() {
      servidor.closeAllConnections()
      await new Promise((listo) => servidor.close(listo))
    },
  }
}
