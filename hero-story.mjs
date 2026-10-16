// Toyota GR Supra A90 / 3.0, 2025 US specification.
// Narration is shipped as local MP3 files. Durations are measured by
// scripts/build-narration.mjs, with 1.4 s of breathing room per chapter.
export const chapters = [
  {
    "id": "heritage",
    "title": "История продолжается",
    "kicker": "1978 → 1993 → 2019",
    "narration": "История Supra началась в 1978 году с шестицилиндровой версии Celica. В 1993-м появилось четвёртое поколение A80, а в 2019-м Supra вернулась как спортивное купе поколения A90.",
    "subtitle": "От Celica Supra к пятому поколению GR Supra",
    "audio": "./assets/narration/01.mp3",
    "start": 0,
    "end": 18.578,
    "duration": 18.578
  },
  {
    "id": "body",
    "title": "Форма раскрывает устройство",
    "kicker": "Кузов · пропорции · компоновка",
    "narration": "Длинный капот, короткая двухместная кабина и крыша с двумя выпуклостями связывают современную Supra с её предшественниками и Toyota 2000GT. Поднимем кузовные панели: под внешней формой скрываются двигатель, силовая структура и ходовая часть.",
    "subtitle": "Кузовные панели расходятся, открывая внутренние узлы",
    "audio": "./assets/narration/02.mp3",
    "start": 18.578,
    "end": 37.167,
    "duration": 18.589
  },
  {
    "id": "engine",
    "title": "Шесть цилиндров в ряд",
    "kicker": "B58 · 3,0 л · 382 hp · ≈499 Н·м",
    "narration": "В центре внимания — трёхлитровый двигатель B58: шесть цилиндров расположены в один ряд. Поршни через шатуны вращают коленчатый вал. В версии 2025 года для США двигатель развивает 382 hp и около 499 ньютон-метров крутящего момента.",
    "subtitle": "Поршни и шатуны превращают движение в вращение коленвала",
    "audio": "./assets/narration/03.mp3",
    "start": 37.167,
    "end": 61.472,
    "duration": 24.305
  },
  {
    "id": "intake",
    "title": "Одна турбина, два канала",
    "kicker": "Twin-scroll · наддув · впуск",
    "narration": "Twin-scroll — это одна турбина с двумя отдельными каналами для выхлопных газов. Такое разделение уменьшает взаимное влияние импульсов от цилиндров. Турбина приводит компрессор, который сжимает воздух для впуска: так наддув помогает трёхлитровому двигателю наполнять цилиндры.",
    "subtitle": "Выхлоп вращает турбину, компрессор подаёт сжатый воздух во впуск",
    "audio": "./assets/narration/04.mp3",
    "start": 61.472,
    "end": 81.773,
    "duration": 20.301
  },
  {
    "id": "drivetrain",
    "title": "Путь момента к задним колёсам",
    "kicker": "Коробка → кардан → дифференциал",
    "narration": "От двигателя момент проходит через коробку передач и карданный вал к заднему дифференциалу. Активный дифференциал управляет блокировкой между задними колёсами. Для Supra 3.0 доступны восьмиступенчатый автомат и шестиступенчатая механика: в обоих случаях привод остаётся задним.",
    "subtitle": "Коробка, кардан и активный дифференциал соединяют двигатель с дорогой",
    "audio": "./assets/narration/05.mp3",
    "start": 81.773,
    "end": 101.988,
    "duration": 20.215
  },
  {
    "id": "chassis",
    "title": "Контакт с дорогой",
    "kicker": "Подвеска AVS · передние тормоза Brembo",
    "narration": "Спереди работает подвеска Макферсон, сзади — независимая многорычажная схема. Адаптивные амортизаторы меняют демпфирование, помогая колёсам сохранять контакт с дорогой. Передние четырёхпоршневые суппорты Brembo сжимают вентилируемые диски диаметром 348 миллиметров, превращая энергию движения в тепло.",
    "subtitle": "Подвеска ведёт колёса, тормоза преобразуют движение в тепло",
    "audio": "./assets/narration/06.mp3",
    "start": 101.988,
    "end": 125.998,
    "duration": 24.01
  },
  {
    "id": "reunion",
    "title": "Снова единое целое",
    "kicker": "GR Supra · A90 · пятое поколение",
    "narration": "Вернём каждый узел на своё место: кузов, двигатель, трансмиссия и подвеска снова образуют один автомобиль. Современная Supra сохраняет знакомую идею — рядную шестёрку спереди и ведущие задние колёса. Теперь можно остановить историю и рассмотреть любую деталь самостоятельно.",
    "subtitle": "От истории автомобиля — к самостоятельному изучению деталей",
    "audio": "./assets/narration/07.mp3",
    "start": 125.998,
    "end": 146.538,
    "duration": 20.54
  }
];

export const totalDuration = 146.538;

// One continuous audio clock; chapter boundaries include the spoken text
// followed by a 1.4 s pause. This is the preferred hero playback source.
export const narrationAudio = './assets/narration/story.mp3';

export const sources = [
  {
    id: 'heritage',
    title: 'Toyota Global — The Legend Returns (1978 and 1993)',
    url: 'https://global.toyota/en/newsroom/toyota/21235480.html',
    chapters: ['heritage'],
  },
  {
    id: 'return',
    title: 'Toyota Global — Toyota Rolls Out New Supra (2019, B58)',
    url: 'https://global.toyota/en/newsroom/toyota/28110994.html',
    chapters: ['heritage', 'engine', 'reunion'],
  },
  {
    id: 'design',
    title: 'Toyota USA — A Legend Returns: 2020 Toyota Supra Makes World Debut',
    url: 'https://pressroom.toyota.com/legend-returns-2020-toyota-supra-makes-world-debut/',
    chapters: ['body'],
  },
  {
    id: 'specification',
    title: 'Toyota USA — 2025 GR Supra brochure, pp. 3–4 and 13',
    url: 'https://www.toyota.com/content/dam/toyota/brochures/pdf/2025/grsupra_ebrochure.pdf',
    chapters: ['engine', 'drivetrain', 'chassis'],
  },
  {
    id: 'turbo',
    title: 'Toyota UK — GR Supra press kit: twin-scroll turbocharger',
    url: 'https://media.toyota.co.uk/wp-content/uploads/sites/5/pdf/220509M-GR-Supra-Press-Kit.pdf',
    chapters: ['intake'],
  },
];
