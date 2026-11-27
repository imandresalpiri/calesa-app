# Lecciones

Trampas que ya se pisaron, vueltas regla: qué hacer o evitar y por qué. Se busca con grep antes de escribir una migración, una RPC,
una prueba o una pantalla. Lo que es regla de construcción de siempre está en `.claude/rules/*` (no se repite aquí); las decisiones de
diseño, en `docs/DECISIONES.md`.

**Una lección nueva** entra cuando un bug o una trampa costó tiempo y volvería a pasar: una viñeta en su sección, `- Haz/Evita X: porque Y.`
Si ya no aplica (cambió la herramienta o el código), se quita. Si es un defecto del flujo o del kit, termina en `(kit)`; un hueco de la
semilla, en `(semilla)`: al integrarse, el orquestador las sube solas al kit (`docs/KIT.md` › «El flujo entre el kit y los proyectos»).

## Base de datos: SQL, RLS y permisos

- En plpgsql un nulo apaga una rama en silencio: pregunta permisos con `puede_*()` (nunca `if … in (select …)`) y envuelve en `coalesce(…, false)` lo que sale de `jsonb_typeof` o de una clave que puede faltar.
- En plpgsql un `or` no corta: `d.id is null or s.x = 0` evalúa `s` sin asignar (55000). El «no existe» va en su propio `if … raise` antes de usar el record.
- En un bucle plpgsql asigna `v_arr[i]` a una variable antes de usarlo en una consulta (si no, cada vuelta recibe el arreglo entero) y arma el jsonb con `jsonb_object_agg`, no concatenando.
- Rechaza `NaN` explícito junto a `monto > 0` en toda RPC de dinero: en Postgres `'NaN' > 0` es verdadero y `numeric(18,2)` lo guarda, así que el `check` no basta.
- `db:lint` no admite avisos sin motivo: declara STABLE (no IMMUTABLE) una función que usa `jsonb_build_object` e inicia un `uuid[]` vacío con `array[]::uuid[]`, no con `'{}'`.
- No declares la variable de un `for i in 1 .. n` de plpgsql: el `for` crea la suya. Declarada, `plpgsql_check` la marca sin uso y cada `for` nuevo suma una sombra, así que `db:lint` cae contra la cuenta de `supabase/tests/advisors-con-motivo.json`.
- Al sumar una columna de salida a una función que llena sus OUT con `return query execute` (`cotizaciones_buscar`, `vehiculos_inventario`), sube su cuenta en `supabase/tests/advisors-con-motivo.json`: `plpgsql_check` da un «maybe unmodified» por columna. `pnpm db:lint` sale 0 igual; la cuenta la compara `pnpm db:revisar` (lo mismo que el job Base del CI).
- Un trigger `before insert` corre antes del `with check` de la policy: quien no puede recibe 23514 en vez de 42501. Ordena las defensas sabiéndolo.
- Los triggers BEFORE corren en orden alfabético del nombre: el que depende de otros se nombra para ir último (`trg_lead_z_cliente_desde`).
- Un borrado suave por `update` da 42501 si la policy de leer no admite la fila nueva (aun sin `returning`): borrar así pide una RPC `security definer`.
- Mantén una copia derivada desde el trigger de la fuente si sus filas se reviven por `on conflict do update`: lo que calcula el `before insert` se descarta.
- Excluye de `trg_actualizado_en` y de la auditoría una columna que escribe otro proceso: si no, quien tiene la ficha abierta recibe PT409 y la vitrina se mueve.
- Haz que toda puerta de escritura (guardar, papelera, adjuntos, policies de storage) pida también `ver` y responda como lo inexistente: «editar sin ver» es la grieta que más se repite.
- `tiene_permiso(clave)` sin origen vale si la persona la tiene en cualquier origen: lo que es por origen se pregunta con la variante que recibe el origen.
- Calcula en la RPC el dinero derivado (`monto_base`, tipo de cambio aplicado), nunca con un `update` de tabla con valores del navegador: el navegador no es fuente de dinero.
- Ordena o salta por fecha con `(creado_en, id)`: `now()` es la hora de la transacción y una transacción larga deja un id mayor con una hora menor.
- Haz que un `check` que exige una FK no nula admita el nulo si la FK es `on delete set null`: al purgar lo nombrado la fila cae con 23514.
- Comprueba con un `insert` que una tabla admite filas antes de construir encima: una PK sobre columnas que un `check` obliga a dejar nulas hace imposible la tabla entera.
- Una FK `on delete restrict` da 23001, no 23503: atrapa los dos.
- En una RPC de lote atrapa sólo los códigos esperados (`PT409`, `23514`, `42501`, `22023`) y devuelve el resultado por elemento: un `when others` se traga errores reales.
- Evita `insert … on conflict` en una RPC que se llama siempre: dispara los triggers por sentencia aunque no escriba. Crea la fila única en la migración.
- Ningún ayudante recibe como único argumento una fila de una tabla: PostgREST lo expone como columna calculada.
- Un regex SQL que espeja el léxico de TS va con clases enumeradas (los rangos dependen de la colación) y sin grupos de captura (`regexp_matches(…, 'g')` devolvería el grupo).
- Da y quita privilegios por columna: `update (columnas)`, no `update` de tabla (deja cambiar columnas que la app nunca manda), y un revoke de columna cuando el grant es por columna (uno de tabla se lleva también los que sí se leen).
- Conserva el índice completo de una FK aunque haya uno parcial (`where eliminado_en is null`): el parcial no sirve a la cascada.
- Dale índice a toda columna con ruta de storage que entra en `storage_refcount()`: sin él, cada purga recorre la tabla.
- Un motivo de rechazo que la base guarda nunca copia el valor de la celda: llevaría datos de terceros al informe y a los logs.

## Migraciones

- Cambiar argumentos o tipo de retorno es `drop` + `create` (parámetro nuevo al final, con default si hay llamadas posicionales): `create or replace` deja dos sobrecargas.
- Repite siempre `revoke`/`grant` explícitos (también `anon` en `web.*`), aunque `create or replace` conserve privilegios, y pruébalo con una mutación que conceda a `anon` o PUBLIC.
- Prefiere una función de lectura aparte a cambiar el tipo de retorno de una existente: el `drop` rompe pruebas, infra y la definición que otros recrean.
- Cruza las funciones que redefine tu migración con las de las migraciones nuevas de `main` y de los PR de delante en la cola (con y sin comillas: el volcado escribe `"public"."x"`): git no ve el choque y tu `create or replace`, que corre después, borra lo de la otra. Rehazla desde la definición más nueva.
- Parte un trigger si su `when` nombra `old`: ese `when` no puede ir en un trigger de `insert`.
- Una columna sólo visual (la posición de una caja) en una tabla con `trg_auditar_cambio`, `trg_actualizado_en` y `web_revalidar` lleva su `when` (esas
  columnas sin cambios) en los dos primeros y una lista `update of` en el último: si no, cada arrastre audita, mueve la versión de la fila y revalida la web.
- Al crear un permiso o cambiar su `aplicado_en`, cámbialo también en `supabase/seed.sql` y prueba la migración re-ejecutándola sobre la base sembrada: el seed corre después con `on conflict … do update` y la pisa, y antes del seed la tabla está vacía.
- Valida en la RPC el texto que la nube puede tener con otros valores; un `check` nuevo sobre una tabla con datos nace `not valid` y se valida en otra sentencia sólo si ninguna fila lo rompe (si no, `raise notice`): la migración no debe caer en la nube.
- Piensa qué jobs despierta una migración que rellena una columna (rellenar `fase_desde` dispara alertas de demora): PGlite arranca vacío y no lo prueba.
- En la nube un índice nuevo se crea sin `concurrently` y bloquea las escrituras mientras se arma: mide la tabla o púrgala antes del `db push`.
- No nombres `p_cantidad` ni `p_tamano` un parámetro que no es una página: `escala.sql` lo trata como tamaño y exige `_acotar_pagina`.
- No llames a un ayudante con un prefijo que una prueba cuenta por patrón (`_formula_%` lo cuenta `validar-formula.sql`).
- Una migración integrada con fecha anterior a la última que ya tiene la demo traba `demo.yml` (`db push` no aplica ninguna): no la muevas
  tal cual (pisaría lo que una posterior redefine); bórrala, crea una al final sólo con lo que ninguna posterior redefine y compara
  `scripts/db/huella-de-la-base.sh` antes y después.
- Al regenerar SQL desde el catálogo (`pg_policies.qual`, `pg_get_triggerdef`), consulta con el `search_path` vacío: si no, los nombres salen sin esquema (`uid()` por `auth.uid()`) y la policy no aplica.
- `format('%s', un_booleano)` escribe `t` o `f`, que no es SQL: usa `case when … then 'true' else 'false' end` al generar un `insert`.
- Una función que lee una tabla temporal que arma quien la llama la recibe como `regclass` y la consulta por SQL dinámico (`format('… %s …', p_fuente)`): con el nombre escrito, `db:lint` cae porque la tabla no existe al revisar la función.
- Antes de comparar dos volcados quita las líneas `\restrict` y `\unrestrict` de `pg_dump` 17: llevan una clave al azar y dan una diferencia falsa.
- `supabase db dump` ya trae `alter publication supabase_realtime add table …`, pero no los triggers de `auth.users`, las policies de `storage.objects`, los buckets, los secretos de Vault ni los jobs: eso lo suma `scripts/db/aplastar.sh`.

## Candados y concurrencia

- Toma la fila `for no key update` si no cambias una clave y asigna una columna con índice único sólo si cambia: `for update` o reasignar el mismo valor toman el candado de clave y chocan con el `key share` de quien inserta hijas (espera, 55P03 o 40P01).
- Fija un orden común de candados (lead → vehículo → cotizaciones por id; padres antes que hijas, en el orden de quien purga) y tómalos en una sola pasada ordenada: un job toma primero las filas de todos sus lotes y agregar ∪ quitar van juntos por id; lote a lote o quitar y luego agregar da 40P01.
- Haz que un job que retiene filas use `skip locked`: si no, frena a las personas que editan esas filas.
- Mira el permiso antes del candado y de la versión: quien no puede recibe 42501 sin esperar. Salvo cuando lo que otro cambia a la vez es el permiso de quien llama (la dominancia): ahí el candado va primero.
- Toma el candado antes de leer el estado que comparas (fase esperada, versión) o de contar lo que usa la fila: si no, dos sesiones pasan las dos o se cuela un 23503 crudo.
- Pon en una función `volatile` y en una sentencia aparte, tras el candado, la comprobación que debe ver lo que otro acaba de confirmar: en READ COMMITTED la foto es por sentencia.
- Antes de serializar varias RPC con un candado común, busca en `scripts/carreras/` las que esperan que dos llamadas no se esperen (dos bajas a la vez): ese arnés corre B antes de confirmar A y se cuelga en vez de fallar.
- Un índice único no frena dos `update … where id` a la vez (la segunda relee y pisa): serializa con `pg_advisory_xact_lock` o `for update` más la versión esperada, y pruébalo con una carrera.
- Reordenar con valores de orden pide un candado del conjunto (`lock table`): dos personas que mueven tarjetas distintas pueden dejar dos en el mismo orden.
- Envuelve el `insert` idempotente por id en `exception when unique_violation` (o busca el id tras el candado): dos reintentos simultáneos dan el 23505 crudo de la PK.
- Fija con una prueba de definición una cláusula de candado que no tiene prueba de carrera: al recrear la función se pierde sin que nada caiga.
- Prueba un ciclo de candados con tres conexiones (una retiene el candado del medio, `scripts/carreras/candados-papelera.mjs`): con dos, A termina su llamada antes de que B empiece y el 40P01 nunca aparece.
- Un `for key share` no espera a quien aguarda un `for update` sobre la misma fila si quien la tiene es otro `key share`: se adelanta, y así se arma el ciclo con quien esperaba.
- Importa toda carrera nueva desde `scripts/carreras.mjs`, sin un corredor aparte: lo que sólo corre a mano no corre (lo vigila `scripts/guardas/carreras-en-db-carreras.test.ts`).

## Pruebas de la base (PGlite y `db:probar`)

- Dentro de una transacción `now()` no se mueve: la «esperada vieja» es la versión menos 1 µs, que guardar mueve la versión se prueba entre transacciones, y lo que debe moverse se deja en el pasado (`session_replication_role = replica`) con `ocurrido_en` explícitos y distintos.
- Una función STABLE lee la foto de la sentencia que la llama: prueba su efecto con un ayudante `pg_temp` aparte.
- Con `SOLO=<archivo de la lista fija>` el archivo corre sin la preparación de los anteriores (personas de `humo.sql`): falla con «cuenta bloqueada» o sin lo
  sembrado. Un archivo de la lista fija se prueba con la corrida entera; uno de `areas/` arma lo suyo y sí corre solo.
- PGlite ordena con colación C y la base real con ICU: escribe `collate "C"` explícito y prueba el orden con casos no ASCII, o la diferencia pasa sin verse.
- PGlite no trae los privilegios por defecto de Supabase: un grant se prueba mirando la definición o en la base real.
- En plpgsql, guarda lo que puede faltar en variables con tipo, no en un `record`: uno que nunca se asignó (`m := null` no le da forma) da «record is not assigned yet» al leer `m.id` en la base real, y PGlite lo deja pasar. Lo ve `db:medir:volumen`, que corre en la base real.
- Lo que una lista llama por fila va en plpgsql, no en `language sql`: una función SQL que no se inlinea (`security definer`, `set search_path`) se planifica en cada llamada, y tres por fila en una página de 50 eran el 90 % de `embarques_listar`. Y un permiso por fila se resuelve una vez por llamada (el alcance del origen), no con `puede_vehiculo()` por vehículo.
- Compara un valor que puede ser nulo con `is distinct from` o `is not true`: `= false` deja pasar el nulo y la prueba no cae.
- Inspecciona el cuerpo de una función con `pg_get_functiondef`, no `prosrc`: una `language sql` con `begin atomic` deja `prosrc` vacío.
- Comprueba que una mutación cae por la causa que buscabas: un rojo por un motivo ajeno (la fila propia ya tomada) no demuestra nada.
- Inserta en la misma transacción lo que una espera necesita ver: una inserción de otra conexión hecha desde el cliente no la ve Postgres y la corrida se cuelga en vez de dar 40P01.
- Fija el instante en vez de `now() + 12 h`: a ciertas horas del día la prueba no mide nada.
- Usa un prefijo propio por archivo para los ayudantes `pg_temp`: en el `db:probar` completo se comparten y el mismo nombre con otra firma da «is not unique».
- Un trigger `deferrable initially deferred` no corre en un bloque que se revierte (nunca llega al `commit`): prueba el invariante con `set constraints <trigger> immediate` antes de la escritura, o la prueba pasa sin mirarlo.
- Escribe explícito el default de una columna del que depende la prueba: si cambia (`bloqueante` a `false`), caen pruebas ajenas.
- Prueba aparte lo que crees en `interno` o `web`: las guardas generales (RLS en todo, definer con `search_path`) sólo miran `public`.
- Postgres revierte toda la llamada ante un error: una prueba no ve el orden de escrituras dentro de una función, sólo guarda contra un `exception when` interno.
- Elige «el primer origen activo» por `(creado_en, clave)` o filtra lo tuyo, nunca por id: los uuid son al azar y otro archivo pudo dejar uno creado.
- Crea antes una dueña de prueba: con la base recién reseteada no hay cuentas, la primera es dueña y una invitada sin aceptar no puede ser la única que gestiona (`rbac_guardian`).
- Revisa los detectores textuales al escribir un mensaje de error: palabras como `antes`/`despues` hacen caer la guarda de `cotizaciones-visibilidad.sql`.
- Prueba un espejo TS de una regla SQL contra la función vigente en PGlite con los mismos casos, `hint` y texto, copiando sus detalles: `char_length` cuenta puntos de código (no `.length`), `collate "C"` no es `localeCompare` ni `<`, `btrim` sólo quita U+0020 y `jsonb::text` lleva `", "`.
- Espeja el `Math.round` de TS en SQL con `floor(v) + (v - floor(v) >= 0.5)`, nunca `round(float8)` (redondea al par): un color derivado cambiaría en un canal y el juego espejo no daría igual.
- Acorta un id derivado que tiene que entrar en la forma de un id con un hash espejado (FNV-1a de 32 bits sobre ASCII: `Math.imul`/`>>> 0` en TS, `bigint` y `% 4294967296` en plpgsql), nunca con `md5`: TS no lo tiene en síncrono.
- El espejo TS no ve el texto de un número `jsonb`: `24.0` llega a JS como 24 y la base guarda `24.0` (un byte más); en un tope en bytes manda la base.
- Un centinela de una prueba de fugas que se busca en el texto de la respuesta no puede ser parte de una palabra que la respuesta lleva por sí sola («cent» está en «centro» y en «Porcentaje»): quita esas palabras antes de buscarlo, o elige otro.

## PostgREST, tipos y capa de datos

- Haz viajar `actualizado_en` como el texto de la base, nunca por `Date` ni `fechas.ts`, y compáralo con sus microsegundos aceptando que Postgres recorte ceros (`\d{1,6}`): `Date` redondea a milisegundos y toda edición da PT409.
- No embebas una tabla sobre sí misma (`mensajes→mensajes`, `formulas!version_origen_id`): da 400 o un arreglo. Léela con una segunda consulta por PK.
- Nombra la FK en el embed si dos apuntan a la misma tabla (`fases!fases_requisitos_fase_id_fkey!inner`) y prueba toda lectura con embebidos contra la base real: las filas de mentira no ven la ambigüedad ni la forma.
- Lee por páginas hasta una vacía o con tope + 1, nunca hasta una corta: `max_rows` depende del despliegue. Si después reescribes todo, lee entero o nada.
- Filtra el nulo con `.is('col', null)`: `.eq('col', null)` no encuentra ninguna fila.
- `database.types.ts` lista también los ayudantes `_…` (el generador no mira los grants): figurar ahí no significa que la app pueda llamarlos.
- Los tipos generados no conocen el nulo: pasa por Zod toda respuesta de RPC aceptando nulo donde la base puede darlo, y llama con todos los parámetros (`nuloParaLaBase`) o castea en el repositorio a una función con parámetros sin default.
- Con escritura directa bajo RLS, cero filas afectadas no es éxito: di «sin permiso» o relee por id para distinguirlo de «ya no existe».
- Filtra «lo mío» por `usuario_id` a mano aunque haya RLS: la RLS deja ver filas ajenas a quien gestiona y la dueña confirmaría turnos de otra persona.
- Pon `eliminado_en is null` explícito aunque la policy lo implique: el índice parcial no debe depender de que el planificador lo deduzca.
- Haz cruzar montos y decimales como texto y pásalos a `Number` sólo al entrar a `<Monto>`: un float de JSON pierde cifras al calcular o guardar.
- Lee un número tipeado con `leerNumeroTipeado` según el locale, también el de una celda: aceptar `,` o `.` sin mirarlo guarda «2.000» como 2,00 y «1.5» como 15.
- Mapea en `errores.ts` de la entidad cada código que su RPC puede dar (`22022`, `P0002`): `errorDePostgrest` sólo conoce los comunes y el resto cae en «Algo falló…».
- No pases por `errorDePostgrest()` un 22023 o PT409 escrito para la persona: cambia por el genérico todo mensaje con «column» o «relation», y un id de nodo puede contenerlo.
- No muestres textos de la base salvo el PT409 (persona y hora): cada código tiene su texto propio en la pantalla.
- Pasa por `revisarTextoParaLaBase()` todo texto o JSON de la persona que va a `jsonb` o `text`: `\u0000`, un surrogate suelto o un anidamiento profundo rompen PostgREST o supabase-js.
- Sube un objeto por hash sin `upsert` (no hay policy de update) y cuenta «ya existe» como éxito: el mismo archivo vuelve a subirse al reintentar.
- Usa `perfiles` (legible por toda persona activa) para un selector de personas: `equipo_lista` pide `equipo.usuarios.ver`.
- Crea el cliente admin dentro de cada función que lo usa, nunca global: salta la RLS y no debe sobrevivir a la llamada.

## Server Actions, Next y React

- Tras una action pon lo devuelto en la pantalla cargada, sin revalidar ni `router.refresh()`: en Next 16 `revalidatePath`, `revalidateTag`, `updateTag` y `refresh` vuelven a dibujar la página que llama (se pierde lo tipeado y lo cargado vuelve a la primera página).
- Tras un `router.refresh()` inevitable, mantén los controles apagados hasta que la pantalla se redibuje: un cambio de URL en medio pierde el refresco.
- Suelta el aviso de guardado o el cierre de panel al terminar el envío (`useTrasElEnvio`) y encola lo que sale al desmontarse: el refresco remonta el panel antes de que `isPending` baje.
- Responde una redirección estructural (308) desde `redirects()` de `next.config.ts` o un route handler, nunca desde una página: bajo el `<Suspense>` del layout y con
  `loading.tsx`, `permanentRedirect()` llega ya mandado el esqueleto y sale 200 con un meta refresh. Si depende de la persona, `redireccionPermanente(…, { porPersona: true })`
  (`Cache-Control: private, no-store`), o el navegador la reusa para otra sesión; un `route.ts` convive con el `layout.tsx` del segmento. Pruébala con `page.request.get(…, { maxRedirects: 0 })`.
- Un test que comprueba que una ruta existe mirando `src/app` atraviesa los grupos de rutas (`(pestanas)`): la URL no los nombra y un `existsSync` del
  camino literal da falso en cuanto una carpeta pasa a un grupo (`existeLaRuta()` de `src/app/(app)/configuracion/origenes/existe-la-ruta.ts`).
- Mide el peor caso de lo que manda una Server Action: el tope es 1 MB por pedido y una fórmula de 2.000 nodos pesa ≈ 400 KB.
- En un route handler, `await connection()` va antes de cualquier rama (también el 503 sin secreto): con `cacheComponents`, `next build` lo prerenderiza y lo sirve fijo.
- Renueva el id idempotente del navegador por intento (tras el éxito o al reabrir, `key` = la apertura): la pantalla conserva su estado y el mismo id devolvería lo ya creado.
- Usa un token fijo, sin refresco, en un stream que lee con la sesión después de responder: rotar el refresh token tras la `Response` cierra la sesión por reuso.
- Pon una constante que lee un Server Component fuera de todo archivo `'use client'`: llega como referencia de cliente, no como valor (las claves de URL compartidas van en `entities/`).
- Con el doble montaje de StrictMode descarta lo viejo por «último pedido», no con un `useRef` de «ya leí»: deja la vista en «Cargando…».
- Pasa a filas con `memo` callbacks estables (los `set` de `useState`): un callback nuevo por render vuelve a dibujar las 500 filas.
- Nada que se hidrata usa `Date` del cliente: «Hoy» se calcula en el servidor y viaja como `YYYY-MM-DD` (cerca de la medianoche «Hoy» y «Ayer» cambian al hidratar), y una página de muestra no usa `Date`.
- Usa una tupla `AlMenosUna<T>` bajo `noUncheckedIndexedAccess`, y recuerda que `ReadonlyArray.map` pierde la tupla.
- Reemplaza las variables de una plantilla en una sola pasada con función: un valor con `{clave}` o `$&` se expandiría en `String.replace`.
- Una grilla que atiende el teclado sólo toma las teclas que nacen en ella (`e.target === e.currentTarget`): si frena las flechas que suben desde un asa de
  dnd-kit que lleva adentro, el sensor de teclado (escucha en la ventana) no las recibe y la fila no se mueve.
- Desestructura lo que un hook devuelve para `ref=` (`const { alMontar, estilo } = useFila…`): con `ref={fila.algo}` el compilador de React
  toma `fila` por un ref y marca cada lectura suya en el render («Cannot access refs during render»).
- Un hijo que registra algo en el estado de un padre al montarse (las líneas del «⋯» de la guardada) lo hace en `useLayoutEffect`: el `setState` de un `useEffect`
  de la hidratación se aplica recién cuando termina de hidratarse lo que llega tras `<Suspense>`, y entretanto el padre dibuja sin eso. Un `ref` que también es un
  objeto de contexto con un `RefObject` adentro hace que el compilador marque `ref={ctx.funcion}`: la función va en su propio contexto.

## Módulos y JS en frío

- No reexportes lecturas de otras superficies por un `composicion.client.ts` que importa una pantalla en frío: ella paga todo lo que reexporta (+20 KB). Cada lectura en su `composicion-<x>.client.ts`.
- Dale a cada superficie su propio `diferidos.tsx`: un `diferido()` de nivel superior es efecto de módulo y no se descarta aunque la pantalla no lo reexporte.
- Mide con `presupuesto-js` antes de importar `<Badge>` u otra utilidad de `shared` en la carga en frío de una pantalla pesada: `<Badge>` arrastra Base UI (+8,5 KB).
- Saca un componente de un `pantallas/<área>.ts` ajeno a la ruta por su propio `pantallas/<área>-<pantalla>.ts`: importar de un barril con Client Components de otra pantalla puede arrastrarlos al JS en frío (el detalle de un proyecto cargaba el listado y «Nuevo proyecto», +5 %).
- Haz que un `loading.tsx` importe sólo el esqueleto, nunca la pantalla ni el barril de `pantallas/`: baja su chunk dos veces en frío. Tampoco un barril de `shared/ui` con Client Components (`tarjetas-de-ajustes`): importa el archivo del esqueleto. El `loading.tsx` de un segmento con hijos (`configuracion/origenes/`) viaja en todas las páginas de debajo (las seis pestañas de un origen subían 6,4 KB).
- No pongas un `page.tsx` que sólo redirige en un segmento con hijos: pide su `loading.tsx`, y el esqueleto de cada nivel viaja en el HTML de todas las páginas de debajo (dos veces). La redirección fija va a `redirects()` de `next.config.ts`.
- Manda al navegador las acciones ya calculadas por el servidor, no `permisos.ts` ni las reglas: importarlas suma JS en frío a la ruta.
- Pasa al cliente sólo lo que dibuja (`contextoParaElNavegador()`): las props viajan en el primer HTML (≈ 100 B por nodo y por fila) y las del layout, en el de todas las pantallas (30 acciones de la paleta suman 7 KB a `/perfil`).
- Pon en un archivo de `features/` del módulo la composición que cruza módulos: en una entrada la rechaza `boundaries`.
- Nombra un archivo de `pantallas/` con el prefijo de su área: sin prefijo es núcleo, y el núcleo no importa áreas.
- Si un área o módulo necesita algo de otro, lo compone `src/app` por `pantallas/` (render prop desde un Client Component de la ruta, con el cast de `ComponentType`), nunca el barril `client` del otro (el de `equipo` cuesta ≈ 50 KB en `/cotizaciones`): una función no cruza de Server a Client y la E/S con supabase-js se pide con `import()` al usarse.
- No nombres un archivo como un SDK vetado (`resend.ts`): el lint lo veta por patrón de ruta.

## Interfaz

- Dos escrituras seguidas de un mismo lienzo (soltar una caja y vincular enseguida) van en cola, cada una con la última versión conocida: la que
  devolvió la anterior si la página aún no se releyó. Con la versión de la página, la segunda choca contra la primera (`PT409` contra uno mismo).
- Con el texto al 200 % los media queries siguen en px: escribe una columna lateral como `minmax(0, 24rem)`, no rem fijos, y en una rejilla de 12 pistas que colapsa usa `gap-x-0 @lg:gap-x-3` (las pistas van a 0 y los 11 huecos fijos desbordan).
- En el celular, la fila de `<Flotantes>` del marco («Copiar el enlace» y la burbuja del chat) flota a 80–124 px del borde inferior y a 16–112 px del derecho: un control alineado a la derecha en algo pegado abajo queda debajo sin que ningún desplazamiento lo libere; dale `max-md:pr-[96px]` a su fila, y si la fila suma un botón, súmale su ancho.
- `TableCell` y `TableHead` de `src/shared/ui/table` son `whitespace-nowrap`: una celda con un texto que debe partirse (un motivo debajo de un control) lleva `whitespace-normal`, o el texto se derrama sobre la columna de al lado sin que nada falle.
- Nombra los contenedores (`@container/hoja`, `@4xl/hoja`): una consulta de contenedor la resuelve el contenedor más cercano al descendiente, no el que lleva la clase.
- Una consulta de contenedor nunca mira al propio contenedor: `@container/x` y `@5xl/x:grid-cols-…` en el mismo elemento no hace nada; el contenedor va en un envoltorio aparte.
- Un portal no se dibuja en el servidor: el lugar que lo recibe muestra hasta hidratar una copia quieta (`inert`, las mismas piezas) y la esconde por CSS (`peer-empty`) en el mismo cuadro; un alto reservado no alcanza si el contenido se parte en dos líneas en el celular (se mide con un muestreo por `requestAnimationFrame` desde `addInitScript`).
- Un estilo que depende del desplazamiento (la sombra de una columna pegada) va con `container-type: scroll-state` y
  `@container scroll-state(…)`, no con una animación ligada al desplazamiento (`animation-timeline`): cada celda sumaría una animación que
  nunca termina, y `quieto()`, `recibeElClic()` y las capturas esperan a que terminen.
- Lo que se desplaza de costado no debe ensanchar la página en el celular: `min-w-0` en la raíz de una barra de pestañas y `relative` en una lista `overflow-x-auto` con un `sr-only` adentro (es absoluto y escapa del recorte). Mídelo con `scrollWidth` del documento, no a ojo.
- Para que el servidor vuelva a leer lo que una clave de `nuqs` recién escrita pide, escríbela con `shallow: false` (y `startTransition` si hay que esperar), no con `router.refresh()`: nuqs escribe la URL un tick después y el refresco sale con la de antes (`usePedidoAlServidor`).
- Si un panel lee su URL con `nuqs`, escríbela con `nuqs` (con `router.replace` el panel no se entera) y no lo cierres justo antes de un `router.push`/`replace`: nuqs escribe después y pisa el destino; navega y deja que el panel salga solo.
- Respalda en `sessionStorage` lo que guardes en `history.state`: con `shallow: false` Next lo pisa a los ~60 ms y Chromium no conserva un `replaceState` en `pagehide`.
- Elige la primera pestaña con `parseAsStringLiteral(claves).withDefault(primera)`: con `parseAsString` la URL se ensucia con la clave por defecto.
- Dale clave propia de URL a lo que debe convivir: un `?panel=` compartido entre hoja de filtros y drawers hace que abrir uno cierre el otro.
- Monta de a uno los diálogos de una pantalla que se abren por la URL (el último que se abrió, para que termine de irse): un `Confirmar` cerrado que sigue montado deja trabado el siguiente que se abre (queda con `data-open` aunque reciba `abierto` en falso). `useAbiertoAlgunaVez()` por diálogo los deja montados a todos.
- Al pasar de un panel a otro, el que cierra no devuelve el foco (`focoAlCerrar` false): Base UI lo devuelve un instante después y le roba letras al campo nuevo.
- Llama `useCambiosSinGuardar` y `useVueltaDelFoco` una sola vez por panel y clave: dos llamadas se pisan el estado.
- No pongas la versión en la `key` de un editor que guarda ni de sus modales vecinos (guardar los remonta y pierde lo tipeado; la base es la fila que devolvió la RPC), pero sí suma a la `key` la lectura que pide «Recargar» tras un rechazo: sin remontar, la hoja vuelve a mandar lo rechazado.
- Guarda el borrador por campo tocado, no como copia de la fila: así sobrevive a «Recargar» tras un PT409 y se suelta al llegar la versión nueva.
- Dos formularios sobre la misma fila con una sola versión van con un solo «Guardar» o con la versión como `key` en los dos: guardar uno da PT409 al otro o descarta lo escrito.
- En un asistente de varios pasos, apaga los selectores que alimentan el envío mientras prepara, sube o crea: si cambian a mitad, se crea con lo anterior sin decirlo.
- Modela un filtro sí/no como elección de valores (todas / sí / no), no como booleano: un «No» tri-estado no filtra y el chip dice lo contrario.
- Nunca pongas un monto en el título de un `<Confirmar>`, en `aria-label`, `title` ni `<option>`: esquiva `<Monto>` y el Modo Live lo deja a la vista. Etiqueta neutra y el monto al lado.
- Dibuja como texto, nunca como enlace ni HTML, un texto libre de un visitante anónimo (`ruta`, `fuente`).
- Mira `navigator.onLine` también después de cada `await` antes de navegar: si la red se fue mientras se guardaba, Next recarga la página y sin red queda en blanco. Lo elegido queda pendiente y sale al volver.
- Pon `method="post"` en todo `<form>` con credenciales o datos sensibles: enviado antes de hidratar sale por GET y deja la contraseña en la URL.
- Si falla la lectura de un permiso o una regla, apaga el botón con motivo y nunca lo habilites (`dominada: null` → apagado).
- Al comparar rutas por prefijo, `/` sólo coincide consigo misma: si no, vuelve «disponible» cualquier ruta.
- Pon el motivo de un botón o pestaña apagada en texto visible (`aria-describedby`), no sólo en `title`: un `TabsTrigger` deshabilitado no recibe foco y el lector no lo lee.
- Al cambiar un token de color corre `design/tokens.test.ts` (contraste AA) y actualiza su espejo del PDF (`estilos-del-documento.ts`) y `e2e/xcell-geometria.spec.ts`.
- Dale a toda página nueva su `loading.tsx`, un `h1` (`sr-only` si no se ve) fuera del `Suspense` y un `<title>` único: lo exigen `estados-de-ruta.test.ts` y `accesibilidad.spec.ts`.
- Una página que sólo redirige (tras su `loading.tsx`, la redirección es del navegador) se anota en `SOLO_REDIRIGEN` de
  `e2e/soporte/accesibilidad-rutas.ts`, o como `pendiente` en `DINAMICAS` si su ruta lleva un `[param]`: al cambiar la URL todavía se ve el
  esqueleto del destino y el barrido cuenta «0 h1» o cae con «Execution context was destroyed».
- Un control que sale de un `<Bloque>` plegado queda a la vista del barrido de accesibilidad: un `Switch` (un `span` con rol) no toma el nombre
  del `htmlFor` de su etiqueta; dale `aria-labelledby`.
- Cuando un envío apaga el campo que tenía el foco y el diálogo pasa a mostrar el resultado, lleva el foco al resultado: si no, queda en `body`
  y el Tab recorre la página antes de volver al diálogo (duplica las teclas de una tarea de oro).
- Un `<a href="#ancla">` que salta dentro de la página desde un menú (`⋯`) espera a que el menú termine de cerrarse antes de enfocar el
  destino: al cerrarse, el menú le devuelve el foco a su botón y pisa el salto.
- Un título del servidor al que salta un ancla (`#…` con el foco) no se le pasa a una isla diferida para que lo dibuje: al cambiar de árbol se vuelve a
  montar y pierde el foco. Se queda en el servidor con una ranura vacía al lado y la isla pone lo suyo ahí con `createPortal`.
- Un foco que se da al montar (el encabezado de la conversación abierta) no se lo quita a lo que ya está enfocado dentro de su zona: el efecto
  corre al hidratar, y quien entró pudo haber empezado a escribir antes en el campo (`ZonaDelHilo`).
- Una barra pegada abajo que aparece con la primera tecla (`sticky bottom-0`) tapa el campo donde se escribe si estaba en el borde de la pantalla: al
  aparecer, desplaza lo justo para dejarlo a la vista (`BarraDeCambiosSinGuardar`).
- Un submenú de un menú (`DropdownMenuSubTrigger`) que se abre al pasar el puntero se vuelve a cerrar con el clic que le sigue: ponle `openOnHover={false}` y que lo abran el clic, el toque o el teclado.
- Chrome ignora `autocomplete="off"` en un `type="password"` y el Chromium de Playwright no lo reproduce: eso sólo se comprueba a mano, no lo des por probado.
- Lo que se escala al ancho de su contenedor (`useEscalaDeLaTarjeta`) mide un nodo que no se desplaza ni depende de su contenido (`contain: inline-size`),
  con el ancho redondeado hacia abajo; lo que dibuja no desborda su marco (ni el borde que sobresale, ni el alto con fracciones, ni el texto de una fila
  más baja que una línea), y la página reserva el lugar de su barra (`scrollbar-gutter: stable`). Si una barra que aparece cambia el ancho medido, la
  escala, el alto y la barra entran en un ciclo de pocos píxeles que no deja elegir nada. Se prueba con las barras visibles
  (`ignoreDefaultArgs: ['--hide-scrollbars']`, `e2e/configuracion-tarjeta-arrastrar.spec.ts`): el Chromium de Playwright las esconde.
- Dentro de una columna que se desplaza por dentro (la ficha en dos columnas), no uses `scrollIntoView` para dejar algo a la vista de una barra de costado (la tira de miniaturas): mueve también a la columna y la deja donde la persona no la puso; ajusta el `scrollLeft` de la barra. Y esa columna va `relative`: un `sr-only` (absoluto) de adentro, sin ancestro posicionado, no queda recortado y alarga el documento (la ventana se desplaza 17 px).
- Una columna que recupera su posición al volver a una pantalla (`usePosicionDeLasColumnas()`) insiste unos segundos: al mostrarse de nuevo el contenido se acomoda y el navegador achica el desplazamiento al tope de ese momento; reponer una sola vez deja la posición equivocada.
- Un modal de formulario queda montado al cerrarse: lo tipeado sigue en su estado y, en un campo controlado, en el `value` del documento. Un secreto o una
  clave se borra al cerrar (`useModalDeSecreto`), y el e2e que dice «la clave no vuelve» mira `page.content()` con el modal ya cerrado.
- Un modal con formulario que se abre desde otro formulario (`NuevoColorDelGrupo` en el panel de una banda) va en un portal, pero sus eventos suben por el árbol
  de React: su `submit` llega al `onSubmit` del formulario de afuera. Ese `onSubmit` sale con `evento.target !== evento.currentTarget`.
- Lo que aparece bajo una barra al elegir algo (la línea bajo la barra de la fórmula) tiene alto fijo, aunque no haya nada elegido: si crece, lo de abajo baja y el
  segundo clic de un doble clic cae en otra fila.
- La cabecera de una tarjeta (título, estado, botones) lleva un `basis` en rem en el título: sin él, con el texto al 200 % el título se aplasta junto a los botones
  en vez de partir la cabecera en dos líneas.
- Una ruta o un parámetro que se muda no deja redirección: se actualizan sus enlaces y, con una migración, sus datos guardados; la URL vieja da «no existe». Una redirección por cada mudanza se acumula y nadie la quita. (kit)
- Un solo nivel de secciones por pantalla, a la vista: un acordeón o una sección dentro de otra esconden lo que hay y obligan a adivinar dónde está. Lo secundario va en un drawer o un modal con su URL. (kit)
- Lo que cambia de contenido dentro de un área (cargar, editar, cambiar de vista, mostrar un aviso) no cambia su tamaño: alto fijo o reservado, y el esqueleto mide lo mismo que el contenido; si no, lo de abajo salta y el toque cae en otro lado. Se comprueba midiendo con `boundingBox()` antes y después.
  Lo que llega con la página y nada de la pantalla cambia (una lista corta de una tarjeta de ajustes) no reserva el alto de su tope: en una página que
  entra a 1440×900 (`e2e/empresa-tarjetas.spec.ts`) ese hueco vacío es lo que la hace desplazar.
- Un alto fijo que tiene que contener texto sale de la letra (`max(44px, letra × 1,5 + relleno)`), no de un px literal: con la «Letra» grande o el texto al
  200 % un alto en px corta el valor. Lo que cambia de estado va en un lugar del mismo alto (una etiqueta que flota con `transform`, una línea cortada con «…»).
- `container-type` crea un contexto de apilamiento: el globo (`::after`) de un nodo de adentro queda debajo del contenedor vecino que viene después. El
  contenedor sube con `relative focus-within:z-10 hover:z-10`.
- `container-type: inline-size` dentro de una tabla `w-max` (o de cualquier caja que se mide por su contenido) colapsa a 0: el contenedor no aporta ancho
  propio. Ahí la celda no es contenedor (`XCELL_COMPACTA` pone `--xcell-contenedor: normal`).
- Una clase larga en un componente que se repite (una celda de la hoja, una fila) se paga una vez por instancia en el HTML: un `@container`, una variable
  `calc()` o un globo `after:` en clases suman KB por celda. Lo que es igual en todas va a una hoja de estilos en `@layer components` con `:where()` (una
  clase la sigue pisando); antes de publicar se mide `renderToStaticMarkup()` contra `main`.
- Una transición (`transition-transform`) sigue en curso cuando un e2e mide cajas justo después del cambio: espera el valor final del estilo
  (`getComputedStyle(e).scale`) antes de medir.
- Bajo CSS `zoom` (el lienzo del editor de la hoja), `getComputedStyle` da px de CSS y `getBoundingClientRect` y el puntero, px de la pantalla: pasa
  el punto a los px de la rejilla dividiendo por `caja.width / estilo.width` (`medir-la-rejilla.ts`) antes de buscar la celda.

## Realtime y notificaciones

- Abre todo canal nuevo por `canal.client.ts`: se une después de `realtime.setAuth()` (antes entra como `anon` y rechaza el filtro con «invalid column for filter»).
- Relee al unirte al canal, también la primera vez: lo insertado entre la lectura de la pantalla y la unión nunca llega como señal.
- Suscríbete sólo a `INSERT`/`UPDATE` filtrados por columna (`usuario_id=eq.<yo>`, `conversacion_id=eq.<id>`) y nunca reacciones a `DELETE` (Realtime no les aplica RLS): lo que borra una fila (una salida de miembro) la quita y relee por su cuenta.
- Monta las suscripciones del marco al descansar (`useAlDescansar`), no al hidratar: evaluar el cliente de Supabase mientras React hidrata retrasa el primer clic unos 300 ms.
- Haz que una suscripción de fondo se vuelva a suscribir con cada `online` (`useVueltaDeLaRed()` como `key`) y nunca muestre «Sin conexión»: nadie la pidió y tapa el aviso real.

## Escala y rendimiento

- Recorta a una variable, antes de la consulta, una lista de ids de una función invocadora (`= any (coalesce(p_ids[1:100], '{}'))` no entra al índice bajo RLS); se ve en los bloques de la llamada real (`pg_stat_get_xact_blocks_fetched`), no en un `EXPLAIN` suelto ni como `postgres`.
- Bajo RLS una comparación de enum (`enum_eq`, no leakproof) no es condición de índice: usa índices parciales con el literal en su rama.
- Deja un solo índice entero por columna que se sondea: dos que sirven a la misma consulta compiten en el plan genérico según el volumen.
- Un índice para un cursor `(creado_en, id) < (c, i)` lleva las dos columnas en el sentido del orden (`creado_en desc, id desc`): si no, la tupla deja de ser condición de índice.
- Borra un índice que ninguna ruta usa si cubre una columna que cambia en cada escritura: vuelve no-HOT ese update.
- Para «le queda alguna» por lote usa una sonda `(select true … limit 1)`, no `exists`: en el plan genérico con poco volumen, `exists` hace un semi join que lee el índice entero.
- Resuelve el alcance una vez en una `security definer` con el predicado de la policy: filtrar hijas cuyas policies preguntan por fila paga un `puede_*` por fila recorrida.
- Con el plan genérico, varios filtros en la misma consulta parecen selectivos y ordenan toda la tabla: recorre el índice por lotes y filtra en plpgsql.
- Usa como cursor el id de una fila visible y resuélvelo por PK: un cursor que es la clave de un grupo puede recorrer grupos invisibles.
- Un filtro por una entidad chica (un contenedor, un embarque) sobre una lista ordenada por otra columna recorre la lista entera descartando: parte de las unidades de la entidad por su índice, con tope (y la ruta de siempre si lo pasa), y ordena sólo esas (`_logistica_columna`: de 80 ms a 1,4 ms con una fase de 120.000).
- En una invocadora, lo que se lee de un arreglo de ids ya elegidos (`unnest(v_ids)`) va en laterales con `limit`: con el plan genérico un `join … on c.id = u.id` se aplana en un hash join que recorre la tabla entera con la RLS (63.000 bloques y 2 s por página en la lista agrupada).
- Lee un cupo «N por hora» con las N más recientes (`order by creado_en desc limit N`; libre = la más vieja + 1 h): así no hace falta `count(` ni otra excepción en `escala.sql`.
- Mide el costo en altas e importación antes de un índice de n-gramas (duplica el tiempo) y prefiere un mínimo de 3 caracteres.
- Mide como corre: sentencia preparada con parámetros (no literales), el `EXPLAIN` de una `security definer` como dueño de la tabla, y con volumen y fondo realista (el plan genérico estima por promedio): si no, el planificador elige otro plan.
- Antes de medir crecimiento de bloques deja la base limpia: vacía con `truncate … cascade` dentro de la transacción (con guarda de que quedó vacía), no con `delete`, y pasa `vacuum (full, analyze)`: entradas de índice y tuplas muertas dejan espacio que la sonda reusa y suma 0.
- Exige la forma de un plan sólo en el volumen donde el índice gana: entre dos índices parciales que sirven a la misma rama (las vivas sin fecha por el suyo o por
  `vehiculos_situacion_idx`), con 50.000 el planificador elige el más chico y con 250.000 el dedicado; una guarda de forma en los dos volúmenes cae sin que haya nada roto.
- Juzga «no crece con N» por bloques por relación (`pg_stat_get_xact_blocks_fetched`), no en ms ni en buffers totales: el autovacuum y el WAL mueven los tiempos.
- Comprueba que la medición mide: la guarda «no crece con N» debe caer al quitar el índice y cada ruta medida devolver sus `n + 1` filas (con la sesión equivocada la policy la vacía y el assert pasa sin medir).
- Escribe un «fuera de estos valores» sobre un arreglo no constante como `col = any (<complemento>)`, nunca `col <> all (…)`: con una columna casi de un solo valor el planificador estima selectividad ≈ 0 y deja de leer la ruta en orden por su índice.
- En plpgsql recorre un parámetro `jsonb` desde una variable (`v_secs := p_diseno -> 'secciones'`), nunca con `p_diseno -> … -> i` en el bucle: si
  llega fuera de línea (TOAST), cada `->` lo vuelve a leer entero (13.080 buffers en vez de 1.860 con 2.000 ítems).

## e2e (Playwright)

### Localizar y esperar

- Con un diálogo o un `<Drawer>` abierto, lo de afuera sale del árbol accesible: `toHaveCount(0)` de una fila pasa aunque siga ahí. Ciérralo y espera `expect(dialogo).toBeHidden()` antes de afirmar sobre la página.
- Sobre listas de cientos de filas busca por texto, no `*ByRole`: calcular el nombre accesible de cada enlace agota el timeout con un CPU.
- Una página con `h1` propio (las sub-rutas de Configuración) repite el nombre de sus bloques («Monedas y tipos de cambio» contiene «Tipos de cambio»): busca el `h2` con `exact: true` o `level`.
- Usa `exact: true` en botones genéricos («Guardar») y cuando un nombre o texto contiene a otro («Ir a la versión» dentro de «Revertir a la versión N»): si no, coincide con el de otra barra.
- Una posición de desplazamiento medida en una ficha con columnas (`vehiculos-ficha-desplazamiento-interno`) se mide con los bloques que leen al acercarse ya llegados (`bloquesLlegaron()`): un esqueleto más alto que lo que lo reemplaza achica la columna al llegar y mueve la posición, y una medida anterior no es la que queda.
- `useALaVista()` dentro de una columna que se desplaza por dentro usa la columna como raíz del `IntersectionObserver`: con la ventana como raíz, lo que la columna recorta no entra en el margen de 200 px y un bloque de más arriba nunca se acerca. `useIrAlLlegar()` observa todos los bloques de la columna, no sólo el pedido: uno de arriba que cambia de alto mueve al pedido.
- Una lectura de cliente que se hace al montarse (`leerAlMontar` de `useDeEsteVehiculo`) no cuenta como «en camino» la que quedó vieja al desmontarse: el montaje que repite `<Activity>` al volver a mostrar la pantalla la pide otra vez; con `!cargando` el bloque se quedaba en su esqueleto.
- Busca dentro de `main` o `#contenido`, nunca por `.fixed` ni una clase genérica: el marco repite textos («Sin conexión», la navegación) y sus barras fijas (campana, chat) coinciden.
- El «Más acciones de …» de la cabecera de una ficha no es el único de la página: las filas de «Relacionados» llevan el suyo. Usa `menuDeLaFicha()`, que las excluye, no un `getByRole` suelto.
- Filtra lo visible en un localizador de filas (`tr, li`): Next conserva la pantalla anterior escondida en el DOM y aparecen dos filas.
- Una hora de Postgres no trae siempre 6 decimales (quita los ceros finales): no compares su largo; compara la ida y vuelta.
- En el celular una fila de tabla es una tarjeta: un localizador por fila funciona en escritorio y cae en `movil`.
- Antes de un atajo de teclado o un Tab espera el estado final (`toHaveValue`, resultados, hidratación, la sección y el foco en su lugar): antes de hidratar la `N` la toma el «Nuevo lead» del marco, y un Tab mientras llega contenido manda el foco al `body`.
- Un clic antes de hidratar se pierde: reintenta con tope corto hasta que la URL pida el panel y para si ya lo pide, porque cada clic de más suma una entrada al historial y rompe «atrás».
- Lo que `diferido({ enFrio })` dibuja en el servidor se ve antes de hidratar y antes de que llegue su código: espera lo que sólo trae el código cargado (el asa «Mover «…»» del editor de campos) o insiste con `abrirElMenu()` / `abrirElCampo()` de `e2e/soporte/editor-de-campos.ts`.
- Lo que el servidor ya dibuja no dice que la pantalla hidrató: en la matriz de Roles el «⋯» de la cabecera de un rol se ve cientos de ms antes que el de un nivel (`diferido()`). Espera el de un nivel (`esperarLaMatrizHidratada()` de `e2e/soporte/niveles.ts`) antes de tocar una celda, y lo que publica un efecto (`--alto-cabecera-roles`) antes de medir lo pegado.
- Un clic que abre un visor o un modal se afirma (visible) y se cierra (`toBeHidden()`) antes del clic siguiente: si no, el siguiente cae sobre él y la prueba pasa sólo cuando el primero llegó antes de hidratar.
- Arma la espera de un pedido antes del clic con `conRespuesta(page, coincide, accion, espera)` de `e2e/soporte/esperas.ts`, con tope propio: recibe la acción, no una promesa ya creada.
- Sin red, espera el texto del pendiente, no el `requestfailed`: el evento no prueba lo que ve la persona.
- Afirma el estado nuevo (en la base o con `expect.poll`), nunca un toast que se cierra solo, una lista leída una vez tras mutar ni un `toHaveURL` que la página anterior ya cumple.
- nuqs dibuja al instante y escribe la URL después: espera la clave en la URL antes de `reload()` o «atrás», o recarga la URL de antes (pasa en el celular).
- Tras una action que revalida, espera una señal de la página nueva (el estado de la barra, un texto) antes de abrir un panel por URL: escribir la clave con
  nuqs mientras Next aplica lo revalidado deja la página de antes. Y un ayudante que abre un modal diferido decide por la URL, no por `isVisible()`, que da
  «no» mientras se monta (`e2e/soporte/informacion-de-la-formula.ts`).
- Al cerrar un panel por URL con `shallow: false`, la clave sale de la URL recién cuando vuelve el servidor: un ayudante que decide por `page.url()` si hacer clic espera antes a que la URL ya no la nombre y no quede un diálogo (`abrirElCampo()`).
- Abre un popover o una hoja sólo con la pantalla en su forma final: la primera visita al embudo cambia de rama al llegar el tablero y desmonta lo abierto. `abrirVistaYOpciones()` reabre si se cerró solo.
- Mide cajas dentro de un diálogo sólo cuando termina la animación (`quieto()`): durante la escala 44 px miden 42 y `getBoundingClientRect` miente.
- Centra el botón antes del clic: tras `scrollIntoViewIfNeeded` queda al borde inferior, debajo de la burbuja del chat.
- Un `input type=date` conserva el foco en su subcampo y `blur()` no lo suelta: reintenta y descarta si sigue enfocado, o la medición de foco visible se compara consigo misma.
- Arrastra una caja de React Flow con la vista quieta (no tras un `fitView` animado: el `mousedown` cae en el lienzo) y con `page.mouse.move` a un punto fijo: un `hover` con `force` fuera de la caja desplaza contenedores.
- Tras guardar en el panel de una fase, recarga antes de otra escritura del mismo flujo: si sale antes de que llegue la versión nueva, da `PT409`.
- Compara y ordena fechas como timestamp (`Date.parse`), nunca como texto ISO: «…:23Z» queda por delante de «…:23.078Z» y un orden por texto puede borrar a la dueña.
- En una prueba `@sin-celular` no midas ni con una función propia del spec (la guarda la cuenta como ayudante que mide): afirma estilos con
  `toHaveCSS` y arrastra con `hover` en pasos (dnd-kit toma la fila en el primer movimiento y la lleva en los siguientes). El «sin saltos» de
  una pantalla sin celular (Configuración) se fija en Vitest: el contenedor de alto reservado contiene lo de antes y lo de después.
- Un `dragTo` sobre dnd-kit suelta sin esperar la colisión del último paso y cae en otro lugar (en el editor de la hoja, al final de la
  sección): arrastra con `mouse.down()` y `hover`, espera la marca de soltar (`data-marca-de-soltar`) y recién entonces `mouse.up()`
  (`e2e/soporte/arrastre-del-lienzo.ts`). Para un lugar libre sin pieza encima que sirva de destino, avanza de a pasos y lee el texto de la marca
  («Columna 7, fila 1»: `arrastrarHastaElLugar()`), sin medir.
- Un spec de Configuración sin celular (`@sin-celular-archivo`) no puede medir ni cambiar el ancho: lo que la pantalla dibuja en otros anchos va en un
  spec aparte, sin marca, que siembra su propio estado por SQL (el editor de la hoja y `cotizar-hoja-rejilla-libre.spec.ts`).
- Antes de un arrastre con `page.mouse` (el número de una fila de la planilla) desplaza y recién después mide las cajas, con el destino al
  medio de la ventana: la cabecera y la barra pegadas tapan lo de arriba. Un `<Drawer>` que se cierra deja su fondo encima mientras sale y
  se traga el `pointerdown`: espera a que el asa reciba el puntero (`document.elementFromPoint`, `arrastrarFila()` de `e2e/soporte/planilla.ts`).
- Tras «Recargar» de un conflicto (`router.refresh()`), espera la señal visible de que llegó (el aviso se va: `<AvisoDeConflictoDeLaHoja>` lo quita al redibujar) antes de cerrar el panel: un cierre a mitad de camino descarta el refresco en vuelo y la hoja queda con lo viejo, sólo si la máquina va lenta.
- Un monto formateado por `Intl` separa la moneda del número con un espacio no separable (U+00A0), no con uno común: en un regex de e2e va `\s` («USD\s[\d.,]+»), nunca un espacio literal.
- Con el asa de dnd-kit tomada por teclado, la primera flecha se puede perder (su sensor escucha un momento después): insiste sólo mientras el anuncio siga en el lugar de partida, o la fila sube dos.

### Sesiones y datos de prueba

- Para cambiar de cuenta, `context.clearCookies()` antes de `entrar` (`{ fresco: true }` no descarta la sesión), y mejor parte la prueba que cambia de usuario a mitad: arrastra el estado de la sesión anterior.
- Limpia en el orden de las FK soltando antes lo que frena (comprobantes con `restrict`, FK sin `on delete` como `ajustes_web.actualizado_por`), y un spec que siembra por SQL borra lo suyo también al empezar: un `afterAll` o una corrida caídos ensucian el siguiente.
- Limpia sólo tu prefijo o tu origen (`borrarDineroDeEsteOrigen`), nunca `like 'E2E%'` ni todos los `e2e_%`: una limpieza amplia borra lo que otro spec en curso necesita.
- No corras juntos dos specs que borran y siembran las mismas personas (`chat` y `chat-widget`): se pisan el terreno. Van en comandos aparte.
- Corre un solo `pnpm test:e2e` a la vez en un worktree: compila `.next-e2e` (`scripts/compilar-e2e.sh`) antes de pedir el candado, así que el segundo reescribe el build que sirve el primero y le deja las páginas en blanco, aunque después caiga en el candado. Lanza el siguiente cuando termine el anterior.
- Afirma una cifra compartida (tablero, margen, conteos del mes) por el aumento que causa tu acción con `≥`, nunca por un total: otros specs escriben en el mismo período.
- Un spec que escribe un secreto real (Vault de apibara) toma su huella al empezar y la deja igual al final: si no, rompe a los demás.
- Un embudo creado por `embudo_crear()` nace con «Nueva», «Ganada» y «Perdida», no con las etapas del de por defecto («Nuevo», «Ganado»…): nombra la etapa del embudo que usas.
- Para simular un estado que un job cierra, retén un candado que el job no puede tomar; no pauses `cron.job`.
- Para probar qué camino usa la pantalla, mide con `pg_stat_statements` (con `workers: 1`) que crece una lectura y no la otra.
- Distingue las Server Actions propias con un marcador (`intento`) en un vigilante que cuenta por URL: otras actions van a la misma URL (registrar la visita).

### El marco y las cuentas de pedidos

- Un texto visible que cambia (etiqueta, `aria-label`, botón, título) se busca en los e2e antes de publicar, y también los localizadores no exactos que el texto nuevo cumpliría («Recargar la página» vuelve ambiguo un `getByRole('button', { name: 'Recargar' })` de otra pantalla si el botón va en el marco): lo hace `node scripts/e2e-afectados.mjs`, que los corre con `--correr`. El CI corre el completo cuando la rama toca un disparador del Nivel 2, pero en local sólo corre lo que se nombra.
- Si sumas algo al marco o al menú (entrada, campana, burbuja, pestaña), grepea `e2e/`: mueve paradas de Tab, pedidos contados, pestañas contadas, topes de JS y lo que tapa un `fixed`.
- Marca `esDelMarco` todo pedido nuevo que haga el marco: los specs que cuentan pedidos de su pantalla los excluyen y si no, caen.
- Una revalidación del navegador (un 304 contra su caché) Playwright la ve como un 200 sin bytes nuevos: el 304 se prueba con `page.request.get(url, { headers: { 'if-none-match': etag } })`, y lo del navegador se cuenta por pedidos y bytes, no por estado.
- Mide la tarea de oro y todo recorrido que cruza el marco con teclas, toques y KLM con tope, nunca con reloj ni con la cuenta exacta de paradas de Tab: varias sesiones en una máquina dan rojos falsos y cada entrada nueva del marco pondría en rojo PR ajenos.

### Pruebas que prueban algo

- Una prueba que pasa con y sin el arreglo no se conserva; una de «con `reduce` no ocurre X» necesita su mitad de control, la que muestra que sin `reduce` sí ocurre.
- Para afirmar que algo no se envió espera un estado final o un centinela, no un `waitForTimeout`: sin centinela la prueba no demuestra nada.
- Reproduce una inestable frenando la CPU del navegador (CDP `Emulation.setCPUThrottlingRate`) o con latencia en `page.route` (`rsc`, `rpc`, actions): sin reproducirla, no la des por arreglada.
- En un spec `serial` la primera caída deja las demás «did not run»: no las cuentes como verdes y corre por separado cada una.
- Si un spec caído quedó en `/ingreso` (bajo carga o con el servidor recién levantado), es el inestable conocido del ingreso: repítelo solo antes de culpar al cambio.
- Lo que depende de la hora (la marca de «ahora», un vencimiento) cambia el DOM según cuándo corre: un texto que la prueba busca exacto va en su propio elemento, y la prueba fija el reloj (`page.clock`) o no mira las filas que la hora puede tocar.
- Si un e2e siembra fotos por SQL (`sembrarFotos()`) y después las edita, siembra también su fila en `vehiculos_imagenes_version`: sin versión, mover o fijar la portada no mandan nada y el clic pasa sin error.
- El total de la tarjeta de la hoja es `totales.usd` (la suma de los grupos, cada uno en su bucket), no el valor del nodo total: con la fórmula de prueba (`cotizar-formula.ts`) un cambio en el nodo `total` no lo mueve. Afirma una cifra de la fórmula en la celda de un nodo que el diseño dibuja (`[data-nodo]`).

## Vitest

- En un DOM grande busca por texto, no por rol (con un CPU pasa los 5 s), y llega al tope con pocas filas; un test que corre un script entero lleva su tope con el motivo.
- Mockea `server-only` en el test de un `client.ts` que reexporta una Server Action: la arrastra transitivamente.
- Prueba un registro por área con el área simulada, nunca con el archivo real: la prueba cae en cuanto alguien registra algo.
- Un componente que empieza a usar `useRouter()` o un hook de nuqs rompe los tests de todo lo que lo dibuja («invariant expected app router to be mounted»,
  «nuqs requires an adapter»): esos tests montan con `withNuqsTestingAdapter()` y mockean `next/navigation`; lo que la URL escribe llega tarde (`waitFor`).
- jsdom (dom-accessibility-api) no toma el `aria-label` de un nodo referido por `aria-describedby` al calcular la descripción (sólo el texto): un test de
  descripción sobre un candado con `aria-label` afirma el `aria-describedby` y el `aria-label`, y la descripción de verdad se prueba en Chromium (CDP, `e2e/xcell-teclado.spec.ts`).

## CI, entorno y herramientas

- Un archivo que una herramienta regenera (`.eslintcache`) va a `.gitignore` antes de su primer commit; si ya está versionado, sale con `git rm --cached` en su propio commit, nunca se restaura a mano en cada sesión. `scripts/guardas/ignorados.test.ts` (`pnpm test`) cae si algo versionado está ignorado; una excepción a propósito va como `!ruta` en `.gitignore`. (kit)
- Espera un proceso en segundo plano con su aviso (`run_in_background`): un bucle de `sleep`/`until`, un `tail` repetido del log o un Monitor de intervalo pagan un turno con todo el contexto en cada vuelta; el hook `bloquear-esperas.sh` lo rechaza. (kit)
- Tras reescribir un doc con un guion (python, sed), compara sus líneas antes y después: un guion que escribe el contenido dos veces lo duplica sin que git, el lint ni el mapa lo vean. (kit)
- Antes de publicar una migración, corre `pnpm db:revisar`: es lo que el job «Base» del CI compara de la base (`db:lint`, advisors, `db:lint` contra su lista e inventario); `pnpm db:lint` solo no corre los advisors ni compara contra la lista. (kit)
- Registra una RPC en `paginas-en-la-base.ts` en el mismo cambio que su primer `.rpc(`, no antes: `paginas.test.ts` rechaza una entrada sin llamador en `src/`.
- Agrega la sección de `docs/UX.md` que cita un spec en el mismo commit que la pantalla: la guarda del mapa exige que el título exista.
- `supabase db lint` cambia de formato si detecta un agente (`AI_AGENT`, `CLAUDECODE`): lee con `leerDbLint()` aceptando las dos formas y, para reproducir el CI, quita esas variables.
- Corre Splinter con los schemas de `[api]` (`pgrst.db_schemas`): sin ellos sólo revisa `public` y no ve los avisos de `web`.
- Un job que levanta la pila de Supabase la levanta con `./.github/acciones/pila`, nunca con `supabase start` suelto: reserva los puertos efímeros y, si aun así «address already in use», muestra quién tiene el puerto (`ss`), baja la pila y reintenta una vez (otro error cae a la primera). Un «Base» o un e2e rojo con ese texto en `supabase start` no es del código: mira ese diagnóstico antes de tocar nada.
- El lint con tipos (`projectService`) del repo entero roza los 4 GB del heap de Node que da el runner: `pnpm lint` y `lint:fix` van con
  `NODE_OPTIONS=--max-old-space-size=8192`. Sin eso, el PR que suma archivos cae por `heap out of memory` (código 134) aunque el lint
  no tenga nada que decir.
- Excluye del typecheck y del lint toda carpeta ignorada por git que el orquestador enlaza en el worktree (la copia de V1 en `docs/referencias/cotizador-actual`), y también del recorrido de `scripts/enlaces-internos.mjs`: `tsconfig` incluye `**/*.ts` y el mapa sigue el enlace.
- Si `next build` cae con «Type '/x' is not assignable to RouteImpl», corre `pnpm typecheck` (hace `next typegen`): no es del código.
- El permiso de reintentar tras el `SecurityFatalError` de `next build` vence 5 minutos después de que _empezó_ el build que cayó
  (`.next-e2e/cache/next-agentic-upgrade-retries/`): con un build más largo, el reintento de `scripts/compilar-e2e.sh` cae igual; vuelve a correrlo
  antes de que pasen 5 minutos desde que empezó ese segundo intento.
- No nombres `<Confirmar>` con sus signos en un comentario: `scripts/guardas/confirmar-con-url.test.ts` busca el texto crudo (comentarios incluidos) y pide registrar un diálogo que no existe; escribe el nombre sin `<…>`.
- Usa `set -o pipefail` en los arneses: el código de salida de una tubería es el del último comando y una mutación «cae» o «pasa» en falso.
- Antes de culpar al código por e2e que caen, mira que la base del carril tenga las migraciones (`pnpm db:reset` al partir de un `main` nuevo; `supabase_migrations.schema_migrations`): dos worktrees con la misma letra en `.env.carril` comparten la pila y se pisan; `bash scripts/worktree/preparar.sh <letra libre>` pasa el worktree a otra.
- El hook de Bash lee el texto entero del comando, heredocs incluidos, y lo parte también por comillas invertidas y paréntesis: un guion que nombre un push, la bandera de saltar hooks o una orden remota de Supabase se escribe en un archivo (Write) y se corre desde ahí. Lo mismo un texto que nombre un comando bloqueado, aunque sea entre `` ` `` (un doc, un mensaje de commit que nombre una orden de pnpm): se escribe con Write o va por `git commit -F <archivo>`.
- Un issue que abre una GitHub App con su token de instalación llega con `author_association` CONTRIBUTOR y `performed_via_github_app` nulo: a la app se la reconoce por `user.type` Bot y su login `<slug>[bot]`. (kit)
- Un doble de prueba de una API se copia de una respuesta real (`gh api …`, sin datos personales), no de la documentación. (kit)
- Un token de instalación vence a la hora: una sesión larga no hereda un `GH_TOKEN` fijo; `gh` y git piden el suyo por `gh-app/gh` y el helper de credenciales. (kit)
- En un hook, busca el subcomando saltando las opciones globales (`pnpm -C x up`, `pnpm --filter web …`): mirar el primer argumento deja pasar la orden con una opción delante.
- Con dos cuentas en `gh`, no cambies la activa: pide el token de la dueña del repo por llamada (`GH_TOKEN=$(gh auth token --user <dueña>)`), como hace `scripts/flujo/publicar.sh`.
- Pide los archivos de un PR con la API paginada (`gh api --paginate repos/{owner}/{repo}/pulls/<n>/files?per_page=100`): `gh pr view --json files` corta en 100 y lo que queda afuera (una migración) no se ve.
- La cuenta de líneas de `max-lines` (300) vale también para un `.test.ts`: una prueba nueva que no cabe va en su propio archivo.
- `supabase db reset --linked` (CLI 2.120) no siembra aunque `[db.seed]` esté encendido: resetea con `--no-seed` y aplica cada semilla con
  `db query --linked -f`, cortando si una falla (`scripts/demo/resetear.sh`); sin el seed no hay rol dueño y la primera cuenta nace sin permisos.
- `db diff --linked` muestra triggers de `storage.buckets` que llaman a funciones de `storage`: son del Storage de la nube, más nuevo
  que la pila local, no de las migraciones. Fíltralos; un trigger propio llama a una función de `public` o `interno`.
- No dejes que Prettier formatee una plantilla con marcadores `{{X}}`: en un frontmatter YAML los reescribe como `{ { X } }` y el reemplazo deja de encontrarlos. Va en `.prettierignore` y con una prueba que use la plantilla real (`scripts/orquestador/orquestador.test.ts`).
- Lo que el orquestador comparte por enlace en cada worktree (`COMPARTIDAS` de `scripts/orquestador/config.env`) no lleva `.ts` ni enlaces rotos:
  `typecheck` (`**/*.ts`) y `mapa.sh --check` lo recorren y el hook del commit cae por código ajeno. Si pasa, aparta el enlace del worktree (no su destino). (kit)
- En un carril corre las herramientas con `TMPDIR` propio (fuera de `/tmp`): el `/tmp` de la máquina es un tmpfs que comparten todas las
  sesiones y, sin inodos, nada puede crear archivos ahí (tampoco la terminal del agente).
- Lee pronto el motivo de un CI rojo en el log del job caído (`gh run view --job <id> --log-failed`), no en el de la corrida: su final es el
  del agregador «Listo», que no dice qué cayó, y `--log-failed` sale vacío al rato. (kit)
- Un rojo que la rama no causó (un choque por lo que otra tarea integró, la máquina del CI, una migración que quedó antes de una ya
  integrada) no gasta un intento de arreglo: lo mecánico va sin sesión (`scripts/orquestador/sin-sesion.sh`) y el choque cuenta aparte. (kit)
- `claude -p` en un worktree pide el trust de la principal en `~/.claude.json` (`projects[<principal>].hasTrustDialogAccepted`): sin él
  ignora los `permissions.allow` del proyecto. `orquestador.sh verificar` lo revisa. (kit)
- Un fd abierto con `exec 9>lock` para `flock` lo heredan todos los hijos, y con él el candado: cierra el fd (`9>&-`) al lanzar lo que pueda sobrevivir al proceso (una sesión, un `pnpm dev`), o un huérfano lo retiene para siempre.
- `exec` conserva los fds abiertos: un bucle que se relanza con `exec` no reabre su candado (`exec 8>lock` soltaría el que comparten sus hijos y el `flock -n` nuevo chocaría con ellos).
- Una prueba que crea una carpeta temporal la borra al terminar (`carpetaTemporal()` de `scripts/lib/temporal.mjs` con `node --test`, `rmSync` en `afterAll` con Vitest): `/tmp` es un tmpfs con tope de archivos que comparten todos los proyectos de la máquina, y lo que queda se acumula corrida tras corrida hasta trabarlos. Se comprueba corriendo las pruebas con `TMPDIR` en una carpeta vacía: al terminar sigue vacía.
- En el CI git no tiene autor: una prueba que commitea pasa `-c user.name=… -c user.email=…` en cada `git commit`.
- Una versión de modelo escrita en un archivo versionado envejece sin aviso: va el alias (`opus`) o el nivel (`capaz`), y `orquestador.sh verificar` dice qué modelo es hoy (`scripts/guardas/versiones-de-modelo.test.ts`).
- Un `deny` de `.claude/settings.json` vale en todo modo y le gana al hook: lo que el hook deja pasar con `ORQ_PERMITE` (`pnpm update` en la tarea de dependencias) no puede estar en el deny.
- Un issue que abre un workflow con `GITHUB_TOKEN` es de `github-actions[bot]`, sin asociación de escritura (`author_association: NONE`): el espejo de la cola lo acepta por su usuario sólo con la etiqueta `noche-roja`, y ningún comentario de un bot cuenta como respuesta.
- Ancla con `/` en `.prettierignore` una carpeta de la raíz (`/contratos/`): sin la barra, la regla de gitignore vale para toda carpeta con ese nombre y `scripts/contratos/` deja de formatearse.
- Un `.ts` generado dentro del repo pasa por el `typecheck` con `noUnusedLocals`: no declares un ayudante que puede quedar sin uso (el `Json` de los tipos de un contrato) y pruébalo compilando con las opciones de `tsconfig.json`.
- Con `@types/node` 20, `fs.globSync` (Node 22+) no tipa aunque Node 24 lo tenga: recorre con `readdirSync(dir, { recursive: true })`.
- Nombra la pila de un carril con el repo (`<proyecto>-<rol>-<carril>`), no con el proyecto: con el slug solo, el carril «a» de app y el de web de un mismo proyecto comparten contenedores.
- Un repo nuevo no declara `provee` ni `consume` antes del paso que publica o fija el contrato: sin `contratos/<id>@<n>.json` (o sin la copia fijada) los jobs `contrato` y `contrato-uso` caen desde el primer PR.
- Protege main de un repo nuevo antes de encender su orquestador (`publicar-proyecto.mjs proteger`, tras el primer CI verde): `gh pr merge --auto` sólo espera lo que la rama exige («Listo · todo en verde») y, sin protección, integra al instante, antes del CI.
- Un repo recién creado vive en `z_<proyecto>/<rol>` y todavía no tiene remoto: el repo propio se busca también por su `rol`, o con un manifiesto de varios repos el orquestador no sabe quién es.
- Una sesión de `claude -p` con la ventana de 1M casi no compacta: cada turno paga todo el contexto (500k–900k en una tarea larga), y
  eso es la mayor parte de su costo. El tope de compactación va explícito al lanzarla (`--autocompact <tokens>`). (kit)
- Un e2e que la rama no toca y que también cae en `main` no se arregla ni se rodea en la rama: va en su tarea urgente, y la rama espera
  a que se integre, se pone al día y vuelve a correr el CI. (kit)
- Un repo de una organización no tiene sesión de `gh`: `gh auth token --user <org>` falla; el token es el de la máquina (`GH_TOKEN` o
  `gh auth token`). (kit)
- En `merge_group` no hay `pull_request.base.sha`: lo que trae el PR es `HEAD^1...HEAD` (la cola integra con squash), y la base para
  comparar migraciones y contratos es `HEAD^1`, con `fetch-depth: 2` (sin el padre, `git ls-tree` falla y la guarda no compara nada). (kit)
- Lint, typecheck y la suite entera sobre el mismo árbol no verifican nada nuevo: corren una vez, al final y en paralelo; entre commits
  alcanzan los hooks (lefthook y `Stop`) y las pruebas de lo tocado. (kit)
- Para que el orquestador tome un cambio suyo no reinicies el servicio: al integrarse en `main` se relanza solo con `exec` y las
  sesiones en curso siguen. `systemctl --user restart` corta esas sesiones (`KillMode=control-group`) y cada una se retoma con otra
  sesión que reconstruye lo hecho. Para frenar lanzamientos va `orquestador.sh pausar`. (kit)
- El estado de `.orquestador/estado/` es de una máquina, no de la cola: una tarea pendiente sin rastro local puede tener ya su PR abierto desde otra máquina. Antes de lanzarla se pregunta a GitHub por su rama, y sin respuesta no se lanza a ciegas. (kit)

## Por módulo

### cotizaciones

- Para «difiere de lo guardado» compara valores y totales, no sólo el total: una celda puede cambiar sin moverlo.
- Un cálculo del motor hecho aparte en la misma pasada (lo calculado de un pisado, `calcularAparte()`) guarda y repone el largo de `faltantes`, la fuente
  y el estado del nodo, en TS y en el espejo SQL: evaluar un nodo escribe en lo compartido de la pasada, y sin reponer, un pisado suma faltantes que no
  existen o cambia el estado de lo que ya quedó escrito.
- Un e2e que compara el diseño de una versión con el de otra lee la sembrada como la lee la app (`_diseno_en_rejilla(diseno)`): una de flujo se convierte
  al leerla y todo lo que se guarda sobre ella lleva ya sus posiciones.
- Compara un `jsonb` leído de la base con lo que se edita sin mirar el orden de las claves (`mismoJson()`): la base las devuelve ordenadas por largo y un
  `JSON.stringify` dice «hay cambios» para siempre tras guardar (y `useBorradorDeEstado`, que compara el texto, guarda un «recuperado» falso).
- Un logo para un dibujo del servidor pasa por `logoParaDibujar()`: react-pdf y satori no leen WebP ni SVG con estilos, y `sharp` lo pasa a PNG.
- Un filtro de SVG por su texto busca `<svg` en todo el texto, no al principio: `sharp` lee como SVG el que empieza con un comentario, un DOCTYPE o
  un BOM, y el comprimido (`.svgz`) esconde el texto; lo que el filtro no revisó no se rasteriza.
- Una celda de un dibujo compartido no reusa un componente del marco de la app (`<Marca>`: tamaño fijo y el nombre): dibuja desde la caja de la celda, y un e2e mide la imagen dentro de ese rectángulo en los tres dibujos.
- Un dibujo que comparten el HTML, react-pdf y `next/og` va por posiciones absolutas desde una geometría pura: satori no tiene `grid` (ni `<table>`, que tampoco dibuja react-pdf) y todo `div` con más de un hijo lleva `display: flex`.
- Una fuente de react-pdf que lee del disco y no se importa no la ve el trazado de archivos: cada ruta que la usa la suma a `outputFileTracingIncludes` de `next.config.ts`.
- Valida una plantilla de la tarjeta contra la visibilidad que compila la base (`_compilar_visibilidad()`, `visibilidadDeLaPlantilla()`), nunca con «todo del nivel «todos»»: lo que la hoja no dibuja no figura, y un `tc_nombre` cuyo tipo de cambio no tiene celda da `tipo_de_cambio_restringido` recién al publicar.
- Una guarda que sigue los imports de un `'use client'` corta en un archivo `'use server'`: el bundler cambia la Server Action por una referencia y lo que importa no viaja.
- Un espejo de una regex entre JS y Postgres va en ASCII (`[!-~]`), sin `\S` ni la bandera `u`: con Unicode las dos clases no coinciden (la URL de un enlace de la ayuda, `URL_DE_ENLACE`).
- Una clave de referencia nueva en un nodo (la `prueba` de `elegir`) se suma a todos los espejos de `referenciasDe()` en la base, no sólo a `validar_formula()`: `_diseno_auxiliares()` (si no, publicar pide celda a las auxiliares del texto) y `_nodos_en_par()`. Cada uno lleva su caso en el juego espejo (`casos-de-en-par.json`) o su prueba SQL con los nodos que compila TS.

### vehiculos

- Mira el tipo del blob que devuelve el canvas y usa JPEG si hace falta: Safari devuelve PNG aunque pidas WebP.
