-- Add new columns to styles table
ALTER TABLE styles ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS color_profile TEXT;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS popularity INTEGER DEFAULT 0;
ALTER TABLE styles ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add service type columns to artists table
ALTER TABLE artists ADD COLUMN IF NOT EXISTS offers_coverup BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS offers_custom_design BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS has_flash_designs BOOLEAN NOT NULL DEFAULT false;

-- Clear old styles and insert updated 21 styles
DELETE FROM artist_styles;
DELETE FROM styles;

INSERT INTO styles (slug, name, name_en, description, subtitle, group_name, color_profile, popularity, sort_order) VALUES
  ('fine-line',             '極簡線條',   'Fine Line',              '細緻單線勾勒，簡約不簡單',                   '細線條、留白、精緻小圖',           'popular',  'blackgrey', 5, 1),
  ('micro',                 '微刺青',     'Micro Tattoo',           '指尖大小的精緻藝術，第一次刺青的首選',       '極小尺寸、細節精密、低痛感',       'popular',  'both',      5, 2),
  ('realism',               '寫實',       'Realism',                '照片級的擬真度，把真實世界刻在皮膚上',       '高度擬真、光影細膩、黑灰或彩色',   'popular',  'both',      5, 3),
  ('floral',                '花卉',       'Floral',                 '各種花朵與植物，從寫實玫瑰到簡約枝葉',       '玫瑰、牡丹、枝葉、藤蔓',           'popular',  'both',      5, 4),
  ('blackwork',             '暗黑',       'Blackwork',              '純黑墨水的力量，從大面積填黑到精緻暗黑圖騰', '純黑墨、大面積填色、強烈對比',     'popular',  'blackgrey', 4, 5),
  ('lettering',             '字體',       'Lettering',              '文字就是力量，從手寫體到哥德式字型',         '手寫體、書法、哥德字、句子',       'popular',  'blackgrey', 4, 6),
  ('illustrative',          '插畫',       'Illustrative',           '像從畫布上跳出來的插圖，風格自由多變',       '插畫風、線條搭配填色、故事感',     'popular',  'both',      4, 7),
  ('anime',                 '漫畫/動漫',  'Anime / Manga',          '二次元角色活在皮膚上，致敬你最愛的作品',     '動漫角色、漫畫風、色彩鮮明',       'popular',  'color',     4, 8),
  ('watercolor',            '水彩',       'Watercolor',             '潑墨暈染的夢幻感，像在皮膚上作水彩畫',       '暈染、潑墨、無邊界、夢幻色彩',     'artistic', 'color',     4, 9),
  ('japanese-traditional',  '日式傳統',   'Japanese Traditional',   '浮世繪美學，龍鳳、鯉魚、武士的東方史詩',     '龍、鯉魚、櫻花、浮世繪、和風',     'classic',  'both',      4, 10),
  ('geometric',             '幾何',       'Geometric',              '數學之美，用線條和形狀構建精密圖案',         '對稱、線條、幾何形狀、結構感',     'artistic', 'blackgrey', 4, 11),
  ('neo-traditional',       '新傳統',     'Neo Traditional',        '經典構圖搭配現代色彩，老派的華麗進化',       '粗線條、飽和色彩、裝飾性強',       'classic',  'color',     3, 12),
  ('american-traditional',  '美式傳統',   'American Traditional',   '水手的經典紋身，粗線條、飽和色、不退流行',   '老鷹、玫瑰、匕首、船錨',           'classic',  'color',     3, 13),
  ('dotwork',               '點描',       'Dotwork',                '一點一點堆疊出來的精密圖案，極度考驗耐心',   '點陣排列、漸層效果、禪意感',       'artistic', 'blackgrey', 3, 14),
  ('portrait',              '肖像',       'Portrait',               '把重要的人或寵物永遠留在身上',               '人物面孔、寵物、名人、高擬真',     'special',  'both',      3, 15),
  ('ornamental',            '裝飾',       'Ornamental',             '對稱優雅的裝飾圖騰，像戴在身上的首飾',       '曼陀羅、Henna 風、對稱、精緻',     'artistic', 'blackgrey', 3, 16),
  ('handpoke',              '手刺',       'Handpoke',               '一針一刺的手工藝，比機器刺青更有溫度和儀式感','手工刺、點狀質感、樸實風',          'special',  'both',      3, 17),
  ('tribal',                '部落圖騰',   'Tribal',                 '源自原住民文化的古老圖騰，力量與靈性的象徵', '粗黑線條、對稱圖騰、波里尼西亞風', 'classic',  'blackgrey', 2, 18),
  ('surrealism',            '超現實',     'Surrealism',             '打破現實邏輯，在皮膚上造一場白日夢',         '超現實意象、變形、夢境感',         'artistic', 'both',      2, 19),
  ('abstract',              '抽象',       'Abstract',               '不被定義的自由表達，色塊、筆觸、純粹的視覺感受','非具象、色塊、筆觸、自由形',     'artistic', 'both',      2, 20),
  ('other',                 '其他',       'Other',                  '找不到分類？沒關係，獨特就是你的風格',       '跨界混搭、實驗性、獨創',           'special',  'both',      0, 99);
