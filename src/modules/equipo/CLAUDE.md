# equipo

Autenticación, perfiles, roles y permisos (RBAC puro), invitaciones, bloqueo, baja con limbo de leads, preferencias y perspectiva «ver como».

## Entra y sale

- Entra: sesión de Supabase Auth (email+contraseña, Google), enlaces de correos de Auth, gestión del equipo y roles, la cookie `perspectiva`.
- `index.ts`: sesión (`requerirSesion()`, `getPermisos()`, `puede()`, `sinRol()`), acceso (`canjearAcceso()`, `cerrarSiInactiva()`, `cerrarSesion`…),
  equipo (`leerEquipo(filtro)`: 100 primeras por nombre; `leerPersona`, `leerMatriz`, `leerVistas`…), y para `tablero` `leerPersonasSinRol({ tope })` y `rutaDeLasPersonasSinRol()` (`/configuracion/equipo?estado=sin_rol`: el filtro «Sin rol» de `equipo_lista()`, la misma definición del bloque).
- `index.ts`, el Modo Live (glosario «Ajustes del Live»): `getLive()`, `seOcultaEnElLive()`, `origenVisibleEnElLive()`, `clienteEnElLive()`,
  `barraDelClienteEnElLive()` (la sesión ya lleva lo combinado: `Sesion.live`); y para Configuración › Modo Live (`pantallas/modo-live.ts`:
  `<TarjetasDeLosRoles>` y `<AjustesPorPersona>`) `leerAjustesDeLosRoles()`, `leerPersonasDelLive({ texto, cursor })` y `textoDeLaBusquedaDelLive()`.
- `client.ts`: `usePerspectiva()`, `<RoleBadge>`, `<VistasGuardadas>` (una sección de «Vista y opciones»), `guardarPreferencia`, `recordarLaPestana`. `shell.ts` / `shell.client.ts`: sesión, proveedores y
  `<BannerPerspectiva>`.
- Lo consumen todos. Depende de `empresa`. **Nunca de `origenes`**: la página pasa los orígenes a la matriz y al cuadro «Quién crea y quién ve» por props. Los niveles de acceso de `cotizaciones` entran a la matriz como huecos (`HuecosDeNivelesEnLaMatriz`, `features/roles/components/huecos-de-niveles.ts`): `equipo` no importa `cotizaciones`; los une una render prop en la ruta.

## Archivos clave

- `entities/sesion.ts` — `Sesion` desde `mi_sesion()` (permisos **efectivos**). `entities/preferencias.ts` — última escritura gana, sin versión. Las de una
  lista las lee su página, no `ProveedorPreferencias`: `vehiculos.vista`, `cotizaciones.vista`, `embarques.vista` (tabla o tarjetas) y `cotizaciones.agrupar` (booleano) y
  `leads.embudo_de_la_ficha` (id del embudo que deja a la vista la ficha del lead; `CLAVE_DE_EMBUDO_DE_LA_FICHA` sale por `client.ts`; la lee la página de la ficha),
  cada una con su `check` en `preferencias_usuario` (`supabase/tests/areas/equipo/preferencias-de-cotizaciones.sql`, `preferencia-de-la-vista-de-embarques.sql`, `preferencias-del-embudo-de-la-ficha.sql`). `menu.plegado` (booleano, el menú lateral plegado) sí
  viaja en `ProveedorPreferencias`: `<ProveedorDelMenuPlegado>` aplica el cambio al instante, lo guarda esperando la respuesta y, sin red, reenvía el último valor al volver
  (`useReintentoAlVolver`); `useMenuPlegado()` (`shell.client.ts`) lo lee el menú lateral y deja su copia en la cookie `menu-plegado` para la cáscara (`@/shared/lib/menu-plegado`);
  su `check` en `supabase/tests/areas/equipo/preferencia-del-menu-plegado.sql`. `logistica.ultimo_origen` (`ultimoOrigenDeLogistica`, el uuid del «Último origen»
  de Logística; `CLAVE_DEL_ULTIMO_ORIGEN_DE_LOGISTICA` sale por `client.ts`) no viaja al cliente: lo leen en el servidor las páginas de Logística desde la sesión y lo
  escribe `guardarPreferencia` al elegir un origen; su `check` en `supabase/tests/areas/equipo/preferencia-del-ultimo-origen-de-logistica.sql`.
- `entities/ultima-pestana.ts` — «Última pestaña del origen» (`origenes.ultima_pestana`, `{ <origenId>: <pestaña> }`, `TOPE_DE_PESTANAS_RECORDADAS` = 30,
  espejo del `check` `preferencias_ultima_pestana_valida`, que valida la forma y no los nombres): **no** viaja en `ProveedorPreferencias`. La lee sólo la entrada
  a `/configuracion/origenes/<id>` (`leerLasPestanasRecordadas(usuarioId)` de `index.ts`, por la PK; si falla, `{}`) y la escribe `recordarLaPestana({ origenId,
parte })` de `client.ts` (lee, funde con `conLaPestana()` y hace upsert; sin revalidar). Prueba: `supabase/tests/areas/equipo/preferencia-de-la-ultima-pestana.sql`.
- `entities/avisos-de-roles.ts` — los avisos de la matriz de Roles (`avisosDelRol()`, `avisosDeLaPagina()`): no se dibujan en línea; `features/roles/hooks/use-avisos-de-roles.ts`
  los lleva a un modal diferido por URL (`?panel=avisos&rol=`, `?panel=avisos-de-la-pagina`) que abren los botones «!» (`boton-de-avisos.tsx`).
- `entities/matriz.ts` — `partesDelGrupo(grupo, { conNiveles })`: parte un grupo en permisos sueltos y los niveles de acceso (los de `cotizaciones.nivel.*`, juntos donde está el primero; sólo `cotizaciones`, `MODULO_DE_LOS_NIVELES`). `?bloque=<módulo>` deja a la vista el bloque (`useBloqueALaVista`, `#bloque-<módulo>`).
- `entities/dominancia.ts` — espejo de `concesion_dominada()` y `rol_dominado()`. `puede()` y el catálogo de claves: `@/shared/lib/permisos`.
- «Quién crea y quién ve» (glosario; `features/roles/components/boton-de-quien-crea.tsx` es el botón del bloque «Cotizaciones» de la matriz y `modal-de-quien-crea.tsx` el modal `?panel=quien-crea-y-quien-ve`, con el cuadro pedido al abrirse por primera vez): el cuadro rol × lugar sobre
  `cotizaciones.crear`, `.ver` y `.privadas.ver`. Las reglas en `entities/cuadro-de-cotizaciones.ts`: `celdaDelCuadro()` (en un origen suma lo de «Todos los
  orígenes», como la base), `cambiosDelCuadro()` (mínimos y en orden: quitar las privadas, cambiar `ver`, dar las privadas; `null` si lo heredado ya da más),
  `opcionesDelCuadro()` y `filaDelCuadro()` (dominancia y sólo lectura), `conSelectorDeLugar()`. Escribe con las actions de la matriz (`otorgar`, `revocar`) en secuencia por `features/roles/hooks/use-cuadro.ts` (la versión en `useVersionesDeRoles`, que comparte con `useMatriz`; PT409 en la primera, `AvisoDeConflicto`; después,
  «Se guardó sólo una parte»). `CambioDeConcesion` vive en `entities/matriz.ts`.
- `entities/vista.ts` — `RUTA_DE_PANTALLA`: un listado nuevo que guarda vistas se suma ahí (hoy leads, vehículos y cotizaciones; la columna `pantalla` es texto, sin migración).
- `infra/invitaciones.ts` — **la excepción del cliente admin**: `conAdminDeAuth()` comprueba `equipo.usuarios.gestionar` y entrega sólo `auth.admin`
  (lo cuida el lint). Crear rol o invitar no es idempotente.

- «Visto» (`features/vistos/`, `entities/vistos.ts`): la preferencia `vistos` (en `ProveedorPreferencias`) y `ControlesDeVistos` (dentro del modal «Preferencias» de `/perfil`: `features/perfil/components/tarjetas-del-perfil.tsx` dibuja las tarjetas Tú y Preferencias con su modal por `?panel=`); las marcas se
  dibujan en `@/shared/ui/lista` (`idDeVisto`, `<SufijoDeVisto>`, `useVistoDeLista`).
  - Marcas: `ultimo`, `visto` y `nuevo` (lo no visto: negrita en la lista; sólo con «Vistos» encendido, la lectura de la página llegada y el id dentro de lo leído; `null` en
    cualquier otro caso: nada se pone en negrita sin saber).
  - Una lectura por pantalla (`useVistos(modulo, consultas)`: ids únicos por tipo, hasta 200, en tandas de 100 a `vistos_de`) y el **último del
    módulo, de cualquiera de sus tipos** (`TIPOS_DEL_MODULO`: la agenda tiene evento y tarea; con dos últimos, un `select` por la PK dice cuál es
    más reciente). Si algo falla, sin marcas.
  - **La E/S (supabase-js) se pide al usarse**: `features/vistos/pedidos-de-vistos.ts` hace `import('../../composicion-vistos.client')`, sólo con
    «Vistos» encendido; la guarda de `diferidos.test.ts` la permite. No son Server Actions: el router las ejecuta de a una.
  - Quién monta las marcas: vehículos y leads, `ProveedorDeMarcasDeVisto` (`client.ts`). **Un módulo ajeno, desde `src/app`** por
    `pantallas/marcas-de-visto` (`MarcasDeVistoDeLaPagina`: ids de la página y, por consulta, el `parametro` de la URL que abre el detalle sobre la
    lista) y, en la página de un registro ya encontrado, `pantallas/visto-de-la-ficha` (`RegistrarVisto`). No por `client.ts`: su barril cuesta ≈ 50 KB.
  - Quién registra: el resumen o panel por URL (`parametro`) o la página con `<RegistrarVisto>`; uno por apertura. Usan las marcas cotizaciones,
    repuestos, agenda, logística, vehículos y leads (lista y kanban).

- **Modo Live** (glosario «Ajustes del Live», «Ajuste propio»): `entities/live.ts` (los nueve campos, `AJUSTES_POR_DEFECTO_DEL_LIVE`, el esquema y el
  espejo de `_live_ajustes_validos()`), `live-combinar.ts` (`combinarAjustesDelLive()`: por campo, lo propio, si no lo del rol principal, si no lo por
  defecto; con «Ver como», sin lo propio; `estadoDelLive()` con la cookie `modo-live`), `live-permisos.ts` (`permisosDelLive()`: los permisos que
  dibujan las pantallas, recortados como con «Ver como»; la RLS, las RPC y las actions usan los reales) y `live-pantallas.ts` (`AREAS_DEL_LIVE` y lo
  que cada área oculta). Configuración › Modo Live (`features/live/`, `live.configurar`): una tarjeta por rol (`?panel=rol&rol=`, guarda los nueve campos
  enteros; «Volver a lo por defecto» en `?panel=rol-por-defecto&rol=`) y «Ajustes por persona» (`?q=` desde 3 letras, por nombre; sin texto, quienes
  tienen lo propio, de a 20 con «Ver más» desde el navegador, `infra/live.client.ts`, hasta `TOPE_DE_LO_CARGADO`). El modal de la persona guarda sólo
  lo que pisa (`HEREDADO`: «Como su rol (…)»; vacío borra la fila) y «Volver a lo de su rol» va en `?panel=persona-a-su-rol&persona=`. Textos en
  `live-textos.ts`, el formulario en `live-formulario.ts`, las filas de la base en `live-configuracion.ts`.

- La lista del equipo (`features/equipo/components/`): tocar la fila o la tarjeta de una persona abre su acción principal, «Cambiar sus roles» (`alAbrirPersona()`: nada si no hay «⋯», si sale apagada o si la persona está dada de baja); el resto vive sólo en su «⋯». Roles: la cabecera de un rol lleva su «⋯» con «Eliminar el rol…» (destructiva: tocar la cabecera no hace nada).

## Tablas

`perfiles` (el avatar o su fallo **no mueven `actualizado_en`**), `equipo_bajas` (`terminada_en` nulo = en curso), `roles`, `permisos` (catálogo fijo),
`roles_permisos`, `usuarios_roles`, `preferencias_usuario`, `vistas_guardadas`, `visitados`, `vistos` (por RPC `visto_registrar`;
se lee con `vistos_de`; job `vistos-purgar`).
`live_ajustes_roles` y `live_ajustes_personas` (ajustes parciales del Live, jsonb validado por `_live_ajustes_validos()`; se escriben sólo por RPC).
RPC: `mi_sesion(p_perspectiva)`, `permisos_efectivos`, `mis_permisos`, `tiene_permiso`, `alcance_de`, `origenes_con_permiso|alcance`, `rol_dominado`,
`concesion_dominada`, `persona_dominada` (privada), `personas_dominadas(ids)` (≤ 101 ids), `rbac_crear_rol`, `rbac_eliminar_rol`,
`rbac_otorgar`, `rbac_revocar`, `rbac_asignar_rol`, `rbac_quitar_rol`, `equipo_bloquear`, `equipo_dar_de_baja`, `equipo_vista_previa_baja`, `equipo_lista(texto, estado, límite)` (definer; exige
`equipo.usuarios.ver` o `.gestionar`), `equipo_aceptar_invitacion`, `roles_personas()`. Baja por lotes: `_baja_lote*`, `_baja_terminar`,
`_bajas_en_curso()`, `_lead_aplicar_bajas`, job `equipo-bajas` cada minuto.
Modo Live: `live_rol_guardar`, `live_rol_quitar`, `live_persona_guardar` (`{}` borra la fila), `live_persona_quitar` (las cuatro con
`live.configurar` y versión, `PT409`) y `live_personas(texto, cursor, límite)` (definer, ≤ 21, `live.configurar` y «Ver el equipo»; cada persona con su rol principal y sus ajustes);
`mi_sesion()` entrega los del rol y los propios.

## No se rompe

- Permisos = unión de los roles; sin deny ni herencia; el catálogo sólo cambia por migración.
- Dominancia: nadie otorga, edita, asigna ni quita lo que no tiene; nadie bloquea, da de baja ni cambia los roles de quien tiene permisos que él no
  cubre (el rol `dueno` sí, sobre todos). La decide la base en cada RPC, que empieza por `_dominancia_tomar()` (también `nivel_crear`,
  que le suma permisos al rol `dueno`; la baja, compartido), toma el perfil `for update` y los roles `for share`
  (`scripts/carreras/dominancia.mjs`); la UI la muestra antes con el motivo y, si `personas_dominadas()` falla, apaga igual.
- `rbac_guardian()`: al commit queda ≥ 1 persona operativa (activa, sin bloqueo, invitación aceptada) cuyos roles **sumados** dan
  `equipo.roles.gestionar` y `equipo.usuarios.gestionar`; el rol `dueno` conserva todos los permisos de `equipo`. Su mensaje llega tal cual.
- Toda edición de un rol manda `roles.actualizado_en` (`PT409`). Bloquear y dar de baja usan el estado de la cuenta como precondición.
- La perspectiva es sólo UI: `sesion.permisos` = míos ∩ rol elegido; RLS, RPC y `actionClient` usan los reales. Sólo con `equipo.roles.gestionar` real.
- Invitar: `auth.admin.createUser` con `app_metadata.invitado = true`; el rol lo asigna `rbac_asignar_rol` con la sesión de quien invita; si falla, la
  cuenta se borra. Un solo enlace vigente por persona; generarlo exige dominar sus roles.
- Dar de baja manda al limbo los leads sin ningún asesor vigente; vista previa y baja cuentan igual. Bloquear no toca datos.
- **La baja va en dos tiempos:** apaga la cuenta y corre un lote de 5.000; con más queda en curso y el job la termina. Mientras dura,
  `_bajas_en_curso()` entra a la visibilidad de leads. Los lotes usan `skip locked`; compartir o transferir **a** quien se da de baja toma su perfil
  `for share`.
- Cuenta bloqueada o dada de baja nunca se queda adentro: al ingresar, al canjear un enlace y en cada pantalla (`requerirSesion()` → `/auth/cerrar`).
  El ingreso no revela si un correo existe; el texto de un aviso sale del catálogo, no de la URL.
- Vista guardada = parámetros de URL; de quien la guarda (RLS de fila propia), sin RPC ni versión; mismo nombre reemplaza; tope 20 por pantalla.

## Ojo

- `auth_registro_permitido()` corre en trigger sobre `auth.users` **diferido al cierre de la transacción** (un `BEFORE INSERT` rechazaba a las
  invitadas). Con registro cerrado Auth falla sin detalle: la app comprueba `registroDisponible()` antes.
- La invitación vence con `otp_expiry` (1 h local; 24 h en la nube). Si abrió el enlace sin elegir contraseña, Auth sólo deja uno de recuperación.
- `equipo.roles.ver` se hace cumplir sólo en `niveles_con_uso()`; `equipo.usuarios.ver`, en la policy de `equipo_bajas` y en `equipo_lista()`.
- Las policies llaman `(select tiene_permiso('…'))` como InitPlan: no cambies su firma. Si la llamada nombra una columna de la fila corre por fila; por
  origen: `origen_id = any ((select origenes_con_alcance('x', 'todos'))::uuid[])`.
- `_bajas_en_curso()` sólo habla a una cuenta activa o a los jobs (apagada o bloqueada recibe `{}`).
- Una persona bloqueada no lee `perfiles`: su estado sale de `mi_sesion()`. `perfiles.rol` no existe a propósito.
- `DropdownMenuLabel` sólo vale dentro de un grupo. Correos de Auth: `token_hash` (`supabase/templates/`; en la nube, a mano).
