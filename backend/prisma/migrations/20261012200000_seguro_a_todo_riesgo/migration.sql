-- Los documentos "Seguro" del sistema anterior pasan a ser
-- "Seguro Contra Todo Riesgo" del catálogo (decisión confirmada).
--
-- Solo datos, sin cambios de estructura. Segura:
--   - toca únicamente filas del sistema anterior (tipo_documento NULL)
--     cuyo texto original es exactamente "Seguro";
--   - no toca la columna original "tipo", así que la reversa es exacta
--     (ver prisma/rollback/20261012200000_seguro_a_todo_riesgo.down.sql);
--   - si un vehículo ya tuviera un Seguro Contra Todo Riesgo, su fila
--     "Seguro" se deja como estaba, para no duplicar el tipo (índice
--     único vehiculo_id + tipo_documento).
-- "Permiso de operación" no se toca.
UPDATE "documentos_vehiculo" d
SET "tipo_documento" = 'SEGURO_TODO_RIESGO'
WHERE d."tipo_documento" IS NULL
  AND lower(btrim(d."tipo")) = 'seguro'
  AND NOT EXISTS (
    SELECT 1 FROM "documentos_vehiculo" o
    WHERE o."vehiculo_id" = d."vehiculo_id"
      AND o."tipo_documento" = 'SEGURO_TODO_RIESGO'
  )
  -- Si un mismo vehículo tuviera 2 filas "Seguro", solo la más antigua.
  AND d."id" = (
    SELECT min(s."id") FROM "documentos_vehiculo" s
    WHERE s."vehiculo_id" = d."vehiculo_id"
      AND s."tipo_documento" IS NULL
      AND lower(btrim(s."tipo")) = 'seguro'
  );
