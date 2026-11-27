import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONFIG_DEL_ASISTENTE_POR_DEFECTO } from '../../../entities/asistente-ia/config'
import type { UsosDelMes } from '../../../entities/asistente-ia/usos'
import type { Integracion } from '../../../entities/integraciones'
import {
  MOTIVO_ACTIVAR_SIN_CLAVE,
  MOTIVO_SIN_PERMISO_AJUSTES,
  MOTIVO_SIN_SECRETO,
} from '../../../entities/motivos'
import { probarAsistente } from '../actions/probar-asistente'
import { TarjetasDeIntegraciones } from './tarjetas-de-integraciones'

// Las actions y la consulta de uso tocan el servidor: acá no se guarda nada.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../actions/guardar-apibara', () => ({ guardarApibara: vi.fn() }))
vi.mock('../actions/guardar-web-publica', () => ({ guardarWebPublica: vi.fn() }))
vi.mock('../actions/guardar-push-web', () => ({ guardarPushWeb: vi.fn() }))
vi.mock('../actions/guardar-secreto', () => ({ guardarSecreto: vi.fn() }))
vi.mock('../actions/probar-web-publica', () => ({ probarWebPublica: vi.fn() }))
vi.mock('../actions/guardar-asistente', () => ({ guardarAsistente: vi.fn() }))
vi.mock('../actions/probar-asistente', () => ({ probarAsistente: vi.fn() }))
vi.mock('../../../composicion.client', () => ({ consultarUso: vi.fn() }))

const VERSION = '2026-10-12T14:00:00+00:00'
const fila = (clave: Integracion['clave'], resto: Partial<Integracion> = {}): Integracion => ({
  clave,
  activa: false,
  config:
    clave === 'apibara'
      ? { endpoint: 'https://api.apibara.tech', plataformas: ['copart'] }
      : { revalidar_url: null },
  secretoGuardadoEn: null,
  actualizadoEn: VERSION,
  ...resto,
})

// La configuración del asistente como la guarda la base (snake_case).
const CONFIG_GUARDADA = {
  preajuste: 'deepseek',
  url_base: 'https://api.deepseek.com',
  modelo: 'deepseek-chat',
  prompt_base: 'Sé breve.',
  atajos: CONFIG_DEL_ASISTENTE_POR_DEFECTO.atajos.map(({ maxTokens, ...resto }) => ({
    ...resto,
    max_tokens: maxTokens,
  })),
  clave_termina_en: 'abcd',
}
const SIN_USOS: UsosDelMes = { mes: '2026-11-01', personas: [], resto: null }

afterEach(cleanup)

type Opciones = { apibara?: Integracion; asistente?: Integracion; usos?: UsosDelMes | null }

function tarjetas(
  puedeEditar: boolean,
  {
    apibara = fila('apibara'),
    asistente = fila('asistente_ia', { config: CONFIG_GUARDADA }),
    usos = SIN_USOS,
  }: Opciones = {},
) {
  const Con = withNuqsTestingAdapter()
  render(
    <Con>
      <TarjetasDeIntegraciones
        apibara={apibara}
        webPublica={fila('web_publica')}
        pushWeb={fila('push_web')}
        sinClavePublica={false}
        vehiculosQueCambian={null}
        asistente={asistente}
        usosDelAsistente={usos}
        puedeEditar={puedeEditar}
      />
    </Con>,
  )
}

describe('TarjetasDeIntegraciones', () => {
  it('una tarjeta por integración, cada una con su estado', () => {
    tarjetas(true)
    expect(
      within(screen.getByRole('region', { name: 'apibara' })).getByText('Falta la clave', {
        selector: '[data-slot=badge]',
      }),
    ).toBeTruthy()
    expect(
      within(screen.getByRole('region', { name: 'Web pública' })).getByText('Apagada', {
        selector: '[data-slot=badge]',
      }),
    ).toBeTruthy()
    expect(
      within(screen.getByRole('region', { name: 'Avisos push' })).getByText('Apagada', {
        selector: '[data-slot=badge]',
      }),
    ).toBeTruthy()
  })

  it('apibara sin clave no se activa y dice por qué', () => {
    tarjetas(true)
    const tarjeta = screen.getByRole('region', { name: 'apibara' })
    expect(
      within(tarjeta).getByRole('switch', { name: 'Activa' }).getAttribute('data-disabled'),
    ).toBe('')
    expect(within(tarjeta).getByText(MOTIVO_SIN_SECRETO)).toBeTruthy()
    expect(within(tarjeta).getByText('Falta la clave', { selector: 'dd' })).toBeTruthy()
  })

  it('con la clave guardada dice cuándo, sin mostrarla', () => {
    tarjetas(true, {
      apibara: fila('apibara', { secretoGuardadoEn: '2026-10-10T12:00:00+00:00', activa: true }),
    })
    const tarjeta = screen.getByRole('region', { name: 'apibara' })
    expect(within(tarjeta).getByText('Activa', { selector: '[data-slot=badge]' })).toBeTruthy()
    expect(within(tarjeta).getByText(/Guardada el/)).toBeTruthy()
    expect(within(tarjeta).getByText('No se puede ver: sólo reemplazar.')).toBeTruthy()
  })

  it('sin permiso se ve todo, sin «Configurar» y con los interruptores apagados y el motivo', () => {
    tarjetas(false)
    expect(screen.getAllByText(MOTIVO_SIN_PERMISO_AJUSTES).length).toBeGreaterThan(0)
    for (const titulo of ['apibara', 'Web pública', 'Asistente de IA']) {
      const tarjeta = screen.getByRole('region', { name: titulo })
      expect(within(tarjeta).queryByRole('button', { name: /^Configurar/ })).toBeNull()
      expect(
        within(tarjeta).getByRole('button', { name: `Más acciones de ${titulo}` }),
      ).toBeTruthy()
    }
    for (const interruptor of screen.getAllByRole('switch')) {
      expect(interruptor.getAttribute('data-disabled')).toBe('')
    }
  })
})

describe('la tarjeta del asistente de IA', () => {
  const asistente = () => screen.getByRole('region', { name: 'Asistente de IA' })

  it('sin clave dice «Falta la clave» y no se activa, con el motivo', () => {
    tarjetas(true)
    expect(
      within(asistente()).getByText('Falta la clave', { selector: '[data-slot=badge]' }),
    ).toBeTruthy()
    expect(
      within(asistente()).getByRole('switch', { name: 'Activa' }).getAttribute('data-disabled'),
    ).toBe('')
    expect(within(asistente()).getByText(MOTIVO_ACTIVAR_SIN_CLAVE)).toBeTruthy()
  })

  it('muestra el proveedor, la clave con sus últimos 4 y los atajos activos', () => {
    tarjetas(true, {
      asistente: fila('asistente_ia', {
        activa: true,
        config: CONFIG_GUARDADA,
        secretoGuardadoEn: '2026-11-26T12:00:00+00:00',
      }),
    })
    const tarjeta = asistente()
    expect(within(tarjeta).getByText('Activa', { selector: '[data-slot=badge]' })).toBeTruthy()
    expect(within(tarjeta).getByText('DeepSeek')).toBeTruthy()
    expect(within(tarjeta).getByText('deepseek-chat')).toBeTruthy()
    expect(within(tarjeta).getByText(/Guardada el .* · termina en ····abcd/)).toBeTruthy()
    expect(within(tarjeta).getByText('Sé breve.')).toBeTruthy()
    expect(
      within(tarjeta).getByText('Para WhatsApp, Para Facebook, Para TikTok y 2 más'),
    ).toBeTruthy()
    expect(within(tarjeta).getByText('Nadie lo usó este mes.')).toBeTruthy()
  })

  it('los usos: hasta 5 personas con su número y «y N más»; sin poder leerlos, lo dice', () => {
    const personas = ['Ana', 'Beto', 'Caro', 'Dani', 'Eva'].map((nombre, i) => ({
      usuarioId: `00000000-0000-4000-8000-00000000000${String(i)}`,
      nombre,
      usos: 10 - i,
    }))
    tarjetas(true, { usos: { mes: '2026-11-01', personas, resto: { n: 95, hayMas: true } } })
    const lista = within(asistente()).getByRole('list', { name: 'Usos de este mes' })
    expect(
      within(lista)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Ana·10', 'Beto·9', 'Caro·8', 'Dani·7', 'Eva·6', 'y 95+ más'])
    cleanup()
    tarjetas(true, { usos: null })
    expect(within(asistente()).getByText('No se pudieron leer los usos.')).toBeTruthy()
  })
})

describe('«Probar conexión» del asistente de IA', () => {
  const asistente = () => screen.getByRole('region', { name: 'Asistente de IA' })

  // Sin saltos: la pista y la respuesta de «Probar conexión» ocupan el mismo lugar, de alto reservado (`min-h-28`). Integraciones no corre en el
  // celular (pedido de la persona) y un spec sin celular no mide cajas (`e2e/soporte/sin-celular.ts`): el lugar se fija acá.
  it('«Probar conexión» responde en el lugar reservado de la pista; sin clave no hay lugar', async () => {
    tarjetas(false, { asistente: fila('asistente_ia', { config: CONFIG_GUARDADA }) })
    expect(within(asistente()).queryByText(/Prueba la conexión desde el/)).toBeNull()
    cleanup()
    vi.mocked(probarAsistente).mockResolvedValue({
      data: { ok: true, data: { modelo: 'deepseek-chat' } },
    } as never)
    tarjetas(true, {
      asistente: fila('asistente_ia', {
        config: CONFIG_GUARDADA,
        secretoGuardadoEn: '2026-11-26T12:00:00+00:00',
      }),
    })
    const lugar = within(asistente()).getByText(/Prueba la conexión desde el/).parentElement
    expect(lugar?.className).toContain('min-h-28')
    const menu = within(asistente()).getByRole('button', {
      name: 'Más acciones de Asistente de IA',
    })
    act(() => {
      fireEvent.pointerDown(menu)
      fireEvent.mouseDown(menu)
      fireEvent.click(menu)
    })
    const probar = await screen.findByRole('menuitem', { name: 'Probar conexión' })
    act(() => {
      fireEvent.click(probar)
    })
    await waitFor(() => {
      expect(within(asistente()).getByText('Respondió el modelo deepseek-chat.')).toBeTruthy()
    })
    expect(lugar?.contains(screen.getByText('Respondió el modelo deepseek-chat.'))).toBe(true)
    expect(within(asistente()).queryByText(/Prueba la conexión desde el/)).toBeNull()
  })
})
