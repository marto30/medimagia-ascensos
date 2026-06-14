-- =====================================================================
-- 002 · Seed del catálogo completo de pociones
-- =====================================================================
-- La tabla `potions` es la fuente de verdad para la FK
--   bitacora_potions.potion_id -> potions(id)
-- Si una poción del catálogo (POTIONS_CATALOG en app.js) no tiene fila
-- aquí, al guardar una bitácora que la use falla con:
--   violates foreign key constraint "bitacora_potions_potion_id_fkey"
--
-- Este seed inserta TODAS las pociones del catálogo. Es idempotente:
-- ON CONFLICT (id) DO NOTHING => no toca la cantidad (qty) de las que ya
-- existen, solo crea las que faltan (con qty = 0 por defecto).
-- Se puede ejecutar tantas veces como haga falta sin efectos secundarios.
-- =====================================================================

INSERT INTO public.potions (id, name, category) VALUES
  ('pocion_pimentonica',      'Poción Pimentónica',                    'Pociones'),
  ('pocion_purgante',         'Poción Purgante',                       'Pociones'),
  ('pocion_hipotusiva',       'Poción Hipotusiva',                     'Pociones'),
  ('pocion_despertare',       'Poción Despertare',                     'Pociones'),
  ('pocion_herbovitalizante', 'Poción Herbovitalizante',               'Pociones'),
  ('pocion_reabastecedora',   'Poción Reabastecedora de Sangre',       'Pociones'),
  ('pocion_crecehuesos',      'Poción Crecehuesos',                    'Pociones'),
  ('pocion_antiparalis',      'Poción antiparálisis',                  'Pociones'),
  ('pocion_conciencia',       'Poción restauradora de la conciencia',  'Pociones'),
  ('pocion_foruniculos',      'Poción curadora de forúnculos',         'Pociones'),
  ('pocion_crisopea',         'Poción para revertir la crisopea',      'Pociones'),
  ('pocima_dormir',           'Pócima para dormir',                    'Pociones'),
  ('pocion_laxante',          'Poción laxante',                        'Pociones'),
  ('pocion_sueño_tranquilo',  'Poción de sueño sin sueños',            'Pociones'),
  ('pocion_tos',              'Poción para la tos',                    'Pociones'),
  ('filtro_paz',              'Filtro de Paz',                         'Filtros'),
  ('filtro_mandrágora',       'Filtro restaurativo de mandrágora',     'Filtros'),
  ('esencia_dictamo',         'Esencia de díctamo',                    'Esencias'),
  ('esencia_murtlap',         'Esencia de Murtlap',                    'Esencias'),
  ('ungüento_quemaduras',     'Ungüento para quemaduras',              'Ungüentos'),
  ('ungüento_desinfectante',  'Ungüento desinfectante',                'Ungüentos'),
  ('antidoto_venenos',        'Antídoto para venenos comunes',         'Antídotos'),
  ('antidoto_acromántula',    'Antídoto para veneno de acromántula',   'Antídotos'),
  ('antidoto_comezón',        'Antídoto contra la comezón bucal',      'Antídotos'),
  ('antidoto_billywig',       'Antídoto para las picaduras de billywig','Antídotos'),
  ('balsamo_raiz',            'Bálsamo de raíz amarga ardiente',       'Bálsamos'),
  ('balsamo_asclepias',       'Bálsamo de Asclepias tuberosa',         'Bálsamos'),
  ('emplasto_plata',          'Emplasto de polvo de plata y de díctamo','Emplastos'),
  ('solucion_cabeza',         'Solución para el dolor de cabeza',      'Soluciones'),
  ('solucion_limpiadora',     'Solución limpiadora',                   'Soluciones'),
  ('bezoar',                  'Bezoar',                                'Otros'),
  ('chocolate',               'Chocolate',                             'Otros'),
  ('piruletas',               'Piruletas',                             'Otros')
ON CONFLICT (id) DO NOTHING;
