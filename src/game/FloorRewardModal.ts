import Phaser from 'phaser';
import { soundEngine } from './audio';
import { showHTMLFloorRewardModal } from '../utils/domInput';

export interface FloorPerk {
  id: string;
  title: string;
  heroKey: string; // 'char_grim' | 'char_bjorn' | 'char_torf' | 'char_alrik' | 'char_kraul' | 'char_zaza' | 'char_omen' | 'char_nihil' | 'neutral'
  iconEmoji: string;
  desc: string;
  effect: (sc: any) => void;
}

export const FLOOR_PERKS_DATABASE: FloorPerk[] = [
  // --- 1. ГРИМ (char_grim) ---
  {
    id: 'grim_1',
    heroKey: 'char_grim',
    title: 'ЖАТВА СКЛЕПА',
    iconEmoji: '🗡',
    desc: 'Убийство врага восстанавливает здоровье и дает буст к скорости.',
    effect: (sc) => {
      sc.grimCryptHarvest = true;
      sc.playerMaxHp += 150;
      sc.playerHp = Math.min(sc.playerMaxHp, sc.playerHp + 150);
      sc.playerSpeed = Math.round(sc.playerSpeed * 1.1);
      sc.updateHUD();
    }
  },
  {
    id: 'grim_2',
    heroKey: 'char_grim',
    title: 'ТЕНЕВОЙ РАЗРЕЗ',
    iconEmoji: '🌙',
    desc: 'Базовый взмах выпускает дополнительную волну назад.',
    effect: (sc) => {
      sc.grimShadowSlash = true;
      sc.damageMultiplier += 0.15;
    }
  },
  {
    id: 'grim_3',
    heroKey: 'char_grim',
    title: 'СМЕРТНЫЙ ПРИГОВОР',
    iconEmoji: '💀',
    desc: 'Убийство ультимейтом моментально откатывает половину его CD.',
    effect: (sc) => {
      sc.grimDeathSentence = true;
      sc.damageMultiplier += 0.2;
    }
  },
  {
    id: 'grim_4',
    heroKey: 'char_grim',
    title: 'ШАГ ЖНЕЦА',
    iconEmoji: '👢',
    desc: 'После каждого рывка следующий базовый удар наносит повышенный урон.',
    effect: (sc) => {
      sc.grimReaperStep = true;
    }
  },
  {
    id: 'grim_5',
    heroKey: 'char_grim',
    title: 'ЖАЖДА ДУШ',
    iconEmoji: '🔮',
    desc: 'Каждые 10 убитых врагов повышают базовую силу атаки до конца забега.',
    effect: (sc) => {
      sc.grimSoulHunger = true;
    }
  },
  {
    id: 'grim_6',
    heroKey: 'char_grim',
    title: 'ТЕНЕВОЙ БАРЬЕР',
    iconEmoji: '🛡',
    desc: 'При HP ниже 50% создает покров, поглощающий несколько ударов.',
    effect: (sc) => {
      sc.grimShadowBarrier = true;
    }
  },
  {
    id: 'grim_7',
    heroKey: 'char_grim',
    title: 'РАЗМАШИСТЫЙ ВЗМАХ',
    iconEmoji: '🌀',
    desc: 'Значительно расширяет область поражения удара косой.',
    effect: (sc) => {
      sc.grimBroadSweep = true;
      sc.damageMultiplier += 0.15;
    }
  },
  {
    id: 'grim_8',
    heroKey: 'char_grim',
    title: 'УЖАС ГЛУБИН',
    iconEmoji: '🎭',
    desc: 'Враги поблизости слабеют от страха и наносят на 20% меньше урона.',
    effect: (sc) => {
      sc.grimTerrorAura = true;
    }
  },
  {
    id: 'grim_9',
    heroKey: 'char_grim',
    title: 'КРОВАВАЯ ЖАТВА',
    iconEmoji: '🩸',
    desc: 'Критические попадания вызывают периодический урон от кровотечения.',
    effect: (sc) => {
      sc.grimBloodHarvest = true;
    }
  },
  {
    id: 'grim_10',
    heroKey: 'char_grim',
    title: 'ВЛАДЫКА КОСЫ',
    iconEmoji: '💫',
    desc: 'Ультимейт совершает полный сокрушительный вихрь вокруг героя.',
    effect: (sc) => {
      sc.grimScytheMaster = true;
      sc.damageMultiplier += 0.35;
    }
  },

  // --- 2. БЁРН / БЕРСЕРК (char_bjorn) ---
  {
    id: 'burn_1',
    heroKey: 'char_bjorn',
    title: 'ОГНЕННЫЙ ШЛЕЙФ',
    iconEmoji: '🔥',
    desc: 'Оставляет за собой горящий след, наносящий урон преследователям.',
    effect: (sc) => {
      sc.bjornFlameTrail = true;
    }
  },
  {
    id: 'burn_2',
    heroKey: 'char_bjorn',
    title: 'ДЕТОНАЦИЯ ПЕПЛА',
    iconEmoji: '💥',
    desc: 'Враги, погибшие от огня, взрываются искрами и задевают стоящих рядом.',
    effect: (sc) => {
      sc.bjornAshDetonation = true;
    }
  },
  {
    id: 'burn_3',
    heroKey: 'char_bjorn',
    title: 'ВЕЧНЫЙ НАПАЛМ',
    iconEmoji: '♨',
    desc: 'Время горения от всех умений становится вдвое дольше.',
    effect: (sc) => {
      sc.bjornEternalNapalm = true;
      sc.damageMultiplier += 0.2;
    }
  },
  {
    id: 'burn_4',
    heroKey: 'char_bjorn',
    title: 'ВСПЫШКА ЯРОСТИ',
    iconEmoji: '⭐',
    desc: 'Получение любого удара выпускает кольцо огня во все стороны.',
    effect: (sc) => {
      sc.bjornFuryBurst = true;
    }
  },
  {
    id: 'burn_5',
    heroKey: 'char_bjorn',
    title: 'ПЕРЕГРЕВ',
    iconEmoji: '🔥',
    desc: 'Непрерывная стрельба пламенем ускоряет выпуск последующих снарядов.',
    effect: (sc) => {
      sc.bjornOverheat = true;
    }
  },
  {
    id: 'burn_6',
    heroKey: 'char_bjorn',
    title: 'ПЛАМЕННЫЕ СФЕРЫ',
    iconEmoji: '✨',
    desc: 'Вокруг героя постоянно летают защитные огненные искры.',
    effect: (sc) => {
      sc.bjornFlameOrbs = true;
    }
  },
  {
    id: 'burn_7',
    heroKey: 'char_bjorn',
    title: 'МАГМАТИЧЕСКИЙ ШАР',
    iconEmoji: '☄',
    desc: 'Базовые снаряды становятся крупнее и пробивают первую цель насквозь.',
    effect: (sc) => {
      sc.bjornMagmaComet = true;
      sc.damageMultiplier += 0.25;
    }
  },
  {
    id: 'burn_8',
    heroKey: 'char_bjorn',
    title: 'ОГНЕУПОРНОСТЬ',
    iconEmoji: '🛡',
    desc: 'Снижает получаемый урон от огненных зон и взрывов монстров на 35%.',
    effect: (sc) => {
      sc.bjornFireproof = true;
    }
  },
  {
    id: 'burn_9',
    heroKey: 'char_bjorn',
    title: 'ИСПЕПЕЛЕНИЕ БРОНИ',
    iconEmoji: '⚡',
    desc: 'Огненный урон ослабляет броню врагов, повышая весь урон по ним.',
    effect: (sc) => {
      sc.bjornArmorShred = true;
    }
  },
  {
    id: 'burn_10',
    heroKey: 'char_bjorn',
    title: 'МЕТЕОРИТНЫЙ ДОЖДЬ',
    iconEmoji: '☄',
    desc: 'Ультимейт вызывает падение дополнительных метеоров по краям зала.',
    effect: (sc) => {
      sc.bjornMeteorRain = true;
      sc.damageMultiplier += 0.35;
    }
  },

  // --- 3. ТОРФ (char_torf) ---
  {
    id: 'torf_1',
    heroKey: 'char_torf',
    title: 'ГЛЫБОВЫЙ ПОКРОВ',
    iconEmoji: '🏰',
    desc: 'Вне боя постепенно восстанавливает каменную броню, блокирующую урон.',
    effect: (sc) => {
      sc.torfBoulderCover = true;
      sc.playerMaxHp += 200;
      sc.playerHp += 200;
      sc.updateHUD();
    }
  },
  {
    id: 'torf_2',
    heroKey: 'char_torf',
    title: 'ШИПЫ БАЗАЛЬТА',
    iconEmoji: '🌵',
    desc: 'Возвращает атакующим монстрам 25% полученного в ближнем бою урона.',
    effect: (sc) => {
      sc.torfBasaltSpikes = true;
    }
  },
  {
    id: 'torf_3',
    heroKey: 'char_torf',
    title: 'СЕЙСМИЧЕСКИЙ РАЗЛОМ',
    iconEmoji: '⚡',
    desc: 'Ультимейт оставляет на полу разлом с кипящей лавой, наносящий постоянный урон и замедляющий врагов.',
    effect: (sc) => {
      sc.torfSeismicFault = true;
      sc.damageMultiplier += 0.25;
    }
  },
  {
    id: 'torf_4',
    heroKey: 'char_torf',
    title: 'МОНОЛИТНАЯ ТУША',
    iconEmoji: '🪨',
    desc: 'Существенно повышает общий максимальный запас здоровья (+350 HP).',
    effect: (sc) => {
      sc.playerMaxHp += 350;
      sc.playerHp += 350;
      sc.updateHUD();
    }
  },
  {
    id: 'torf_5',
    heroKey: 'char_torf',
    title: 'ТЯЖЕЛАЯ ПОСТУПЬ',
    iconEmoji: '🦶',
    desc: 'Шаги Торфа создают сотрясения, замедляющие стоящих рядом монстров.',
    effect: (sc) => {
      sc.torfHeavySteps = true;
    }
  },
  {
    id: 'torf_6',
    heroKey: 'char_torf',
    title: 'ОПОЛЗЕНЬ',
    iconEmoji: '🪨',
    desc: 'Рывок расталкивает монстров в стороны и сбивает им замах атаки.',
    effect: (sc) => {
      sc.torfLandslide = true;
    }
  },
  {
    id: 'torf_7',
    heroKey: 'char_torf',
    title: 'ГРАНИТНЫЙ ЛОБ',
    iconEmoji: '🪖',
    desc: 'Снижает длительность замедлений и негативных эффектов на герое на 40%.',
    effect: (sc) => {
      sc.torfGraniteForehead = true;
    }
  },
  {
    id: 'torf_8',
    heroKey: 'char_torf',
    title: 'ПРИТЯЖЕНИЕ РУДЫ',
    iconEmoji: '🧲',
    desc: 'Каменная сила притягивает выпавшие ресурсы и монеты с огромного расстояния.',
    effect: (sc) => {
      sc.torfOreMagnet = true;
    }
  },
  {
    id: 'torf_9',
    heroKey: 'char_torf',
    title: 'КРИСТАЛЛИЗАЦИЯ',
    iconEmoji: '💎',
    desc: 'Каждое попадание по Торфу накапливает заряд для усиления следующего удара.',
    effect: (sc) => {
      sc.torfCrystallization = true;
    }
  },
  {
    id: 'torf_10',
    heroKey: 'char_torf',
    title: 'ТИТАНИЧЕСКИЙ ОБВАЛ',
    iconEmoji: '🏛',
    desc: 'Ультимейт обрушивает с потолка каменные глыбы по всей комнате.',
    effect: (sc) => {
      sc.torfTitanicCollapse = true;
      sc.damageMultiplier += 0.35;
    }
  },
  {
    id: 'torf_11',
    heroKey: 'char_torf',
    title: 'МАГМАТИЧЕСКИЙ ЖАР',
    iconEmoji: '🔥',
    desc: 'Все навыки и удары Торфа поджигают врагов кипящей лавой, нанося периодический огненный урон.',
    effect: (sc) => {
      sc.torfMagmaIgnite = true;
      sc.hasIgnitePerk = true;
    }
  },

  // --- 4. АЛАРИК (char_alrik) ---
  {
    id: 'alaric_1',
    heroKey: 'char_alrik',
    title: 'ОСВЯЩЕННЫЙ КЛИНОК',
    iconEmoji: '⚔',
    desc: 'Каждый четвертый удар наносит чистый урон и восстанавливает здоровье.',
    effect: (sc) => {
      sc.alaricConsecratedBlade = true;
    }
  },
  {
    id: 'alaric_2',
    heroKey: 'char_alrik',
    title: 'АУРА ВОЗДАЯНИЯ',
    iconEmoji: '👑',
    desc: 'Вокруг героя непрерывно горит круг света, наносящий урон монстрам.',
    effect: (sc) => {
      sc.alaricRetributionAura = true;
    }
  },
  {
    id: 'alaric_3',
    heroKey: 'char_alrik',
    title: 'ЩИТ ВЕРЫ',
    iconEmoji: '🛡',
    desc: 'При критическом падении HP дает полную неуязвимость на 2.5 сек (раз за этаж).',
    effect: (sc) => {
      sc.alaricShieldOfFaith = true;
    }
  },
  {
    id: 'alaric_4',
    heroKey: 'char_alrik',
    title: 'ПРАВЕДНЫЙ ГНЕВ',
    iconEmoji: '🔥',
    desc: 'Сила ударов возрастает по мере снижения текущего здоровья Аларика.',
    effect: (sc) => {
      sc.alaricRighteousWrath = true;
    }
  },
  {
    id: 'alaric_5',
    heroKey: 'char_alrik',
    title: 'ОСЛЕПЛЯЮЩИЙ СВЕТ',
    iconEmoji: '✨',
    desc: 'Применение навыка временно сбивает прицел вражеских стрелков.',
    effect: (sc) => {
      sc.alaricBlindingLight = true;
    }
  },
  {
    id: 'alaric_6',
    heroKey: 'char_alrik',
    title: 'РЫЦАРСКИЙ ТАРАН',
    iconEmoji: '🪖',
    desc: 'Рывок превращается в мощный удар щитом, отбрасывающий монстров.',
    effect: (sc) => {
      sc.alaricKnightRam = true;
    }
  },
  {
    id: 'alaric_7',
    heroKey: 'char_alrik',
    title: 'ЗЕРКАЛЬНАЯ КИРАСА',
    iconEmoji: '🛡',
    desc: 'Снижает урон от вражеских снарядов и стрел на 30%.',
    effect: (sc) => {
      sc.alaricMirrorCuirass = true;
    }
  },
  {
    id: 'alaric_8',
    heroKey: 'char_alrik',
    title: 'БЛАГОСЛОВЕНИЕ СТОЙКОСТИ',
    iconEmoji: '🏆',
    desc: 'Убийство крупных и сильных монстров ощутимо восстанавливает HP (+40 HP).',
    effect: (sc) => {
      sc.alaricFortitudeBlessing = true;
    }
  },
  {
    id: 'alaric_9',
    heroKey: 'char_alrik',
    title: 'НЕБЕСНЫЙ СУД',
    iconEmoji: '⚡',
    desc: 'Базовые удары с шансом призывают карающий световой луч сверху.',
    effect: (sc) => {
      sc.alaricHeavenlyJudgement = true;
    }
  },
  {
    id: 'alaric_10',
    heroKey: 'char_alrik',
    title: 'ОПЛОТ ЗАРИ',
    iconEmoji: '🏛',
    desc: 'Ультимейт освящает землю: враги в зоне замедляются и получают урон.',
    effect: (sc) => {
      sc.alaricDawnBastion = true;
      sc.damageMultiplier += 0.3;
    }
  },

  // --- 5. КРАЛ (char_kraul) ---
  {
    id: 'kral_1',
    heroKey: 'char_kraul',
    title: 'БРОНЕБОЙНЫЙ БОЛТ',
    iconEmoji: '🏹',
    desc: 'Выстрелы пробивают первую пораженную цель и летят дальше.',
    effect: (sc) => {
      sc.kralPiercingBolt = true;
    }
  },
  {
    id: 'kral_2',
    heroKey: 'char_kraul',
    title: 'КАПКАНЫ ЗАСАДЫ',
    iconEmoji: '⚙',
    desc: 'При рывке бросает под ноги ловушку, обездвиживающую монстра.',
    effect: (sc) => {
      sc.kralAmbushTrap = true;
    }
  },
  {
    id: 'kral_3',
    heroKey: 'char_kraul',
    title: 'СТРЕЛЬБА НА ПОРАЖЕНИЕ',
    iconEmoji: '🎯',
    desc: 'Повышает вероятность нанесения критического удара и силу крита.',
    effect: (sc) => {
      sc.kralDeadlyShot = true;
      sc.damageMultiplier += 0.25;
    }
  },
  {
    id: 'kral_4',
    heroKey: 'char_kraul',
    title: 'СКОРОСТРЕЛЬНЫЙ МЕХАНИЗМ',
    iconEmoji: '⚙',
    desc: 'Увеличивает частоту выстрелов арбалета на 25%.',
    effect: (sc) => {
      sc.kralRapidMechanism = true;
    }
  },
  {
    id: 'kral_5',
    heroKey: 'char_kraul',
    title: 'ОХОТНИЧИЙ АЗАРТ',
    iconEmoji: '🐾',
    desc: 'Скорость передвижения при стрельбе не падает.',
    effect: (sc) => {
      sc.kralHunterThrill = true;
    }
  },
  {
    id: 'kral_6',
    heroKey: 'char_kraul',
    title: 'СМОЛЯНОЙ НАКОНЕЧНИК',
    iconEmoji: '💧',
    desc: 'Попадания замедляют скорость перемещения монстров.',
    effect: (sc) => {
      sc.kralTarTip = true;
    }
  },
  {
    id: 'kral_7',
    heroKey: 'char_kraul',
    title: 'РИКОШЕТ ОТ СТЕН',
    iconEmoji: '📐',
    desc: 'Выпущенные болты способны один раз отскочить от каменной стены.',
    effect: (sc) => {
      sc.kralWallBounce = true;
    }
  },
  {
    id: 'kral_8',
    heroKey: 'char_kraul',
    title: 'ВЕЕРНАЯ КАРТЕЧЬ',
    iconEmoji: '🏹',
    desc: 'Периодически совершает залп тремя расходящимися стрелами.',
    effect: (sc) => {
      sc.kralFanShot = true;
    }
  },
  {
    id: 'kral_9',
    heroKey: 'char_kraul',
    title: 'КАМУФЛЯЖ СЛЕДОПЫТА',
    iconEmoji: '🧥',
    desc: 'Первый выстрел по нетронутому врагу наносит +50% урона.',
    effect: (sc) => {
      sc.kralPathfinderCamouflage = true;
    }
  },
  {
    id: 'kral_10',
    heroKey: 'char_kraul',
    title: 'ОСАДНЫЙ АРБАЛЕТ',
    iconEmoji: '🎯',
    desc: 'Ультимейт запускает огромный пробивающий снаряд, сметающий ряды врагов.',
    effect: (sc) => {
      sc.kralSiegeCrossbow = true;
      sc.damageMultiplier += 0.4;
    }
  },

  // --- 6. ЗАЗА (char_zaza) ---
  {
    id: 'zaza_1',
    heroKey: 'char_zaza',
    title: 'ТОКСИЧНЫЙ КИНЖАЛ',
    iconEmoji: '🗡',
    desc: 'Атаки накладывают яд, периодически отнимающий HP (до 3 зарядов).',
    effect: (sc) => {
      sc.zazaToxicDagger = true;
    }
  },
  {
    id: 'zaza_2',
    heroKey: 'char_zaza',
    title: 'ДЫМОВАЯ ЗАВЕСА',
    iconEmoji: '💨',
    desc: 'Использование способности дает кратковременную невидимость.',
    effect: (sc) => {
      sc.zazaSmokeScreen = true;
    }
  },
  {
    id: 'zaza_3',
    heroKey: 'char_zaza',
    title: 'НЕЙРОПАРАЛИЧ',
    iconEmoji: '🕸',
    desc: 'Отравленные враги медленнее двигаются и наносят меньше урона.',
    effect: (sc) => {
      sc.zazaNeuroParalysis = true;
    }
  },
  {
    id: 'zaza_4',
    heroKey: 'char_zaza',
    title: 'ЧУМНАЯ ВСПЫШКА',
    iconEmoji: '🧪',
    desc: 'Гибель отравленного монстра заражает стоящих рядом врагов.',
    effect: (sc) => {
      sc.zazaPlagueBurst = true;
    }
  },
  {
    id: 'zaza_5',
    heroKey: 'char_zaza',
    title: 'УДАР В СПИНУ',
    iconEmoji: '⚔',
    desc: 'Атаки со спины всегда гарантированно наносят критический урон.',
    effect: (sc) => {
      sc.zazaBackstab = true;
    }
  },
  {
    id: 'zaza_6',
    heroKey: 'char_zaza',
    title: 'ВЕРТКИЙ ТРЮК',
    iconEmoji: '🤾',
    desc: 'Дает 15% шанс полностью избежать любого получаемого урона.',
    effect: (sc) => {
      sc.zazaNimbleTrick = true;
    }
  },
  {
    id: 'zaza_7',
    heroKey: 'char_zaza',
    title: 'БЫСТРЫЙ ЯД',
    iconEmoji: '🧪',
    desc: 'Урон от отравления срабатывает значительно чаще.',
    effect: (sc) => {
      sc.zazaFastPoison = true;
    }
  },
  {
    id: 'zaza_8',
    heroKey: 'char_zaza',
    title: 'РВАНАЯ РАНА',
    iconEmoji: '🐾',
    desc: 'Удары по отравленным врагам слегка лечат Зазу (+5 HP за удар).',
    effect: (sc) => {
      sc.zazaLaceration = true;
    }
  },
  {
    id: 'zaza_9',
    heroKey: 'char_zaza',
    title: 'ЧУМНОЙ ФИЛЬТР',
    iconEmoji: '🎭',
    desc: 'Полный иммунитет к кислотным лужам и ядовитым газам.',
    effect: (sc) => {
      sc.zazaPlagueFilter = true;
    }
  },
  {
    id: 'zaza_10',
    heroKey: 'char_zaza',
    title: 'ПАНДЕМИЯ',
    iconEmoji: '☣',
    desc: 'Ультимейт мгновенно взрывает все заряды яда на всех врагах в зале.',
    effect: (sc) => {
      sc.zazaPandemic = true;
      sc.damageMultiplier += 0.35;
    }
  },

  // --- 7. ОМЕН (char_omen) ---
  {
    id: 'omen_1',
    heroKey: 'char_omen',
    title: 'ФАЗОВЫЙ СДВИГ',
    iconEmoji: '👻',
    desc: 'Во время рывка герой полностью неуязвим для атак и снарядов.',
    effect: (sc) => {
      sc.omenPhaseShift = true;
    }
  },
  {
    id: 'omen_2',
    heroKey: 'char_omen',
    title: 'ЗНАК ПОГИБЕЛИ',
    iconEmoji: '👁',
    desc: 'Накладывает на врага метку, которая детонирует через несколько секунд.',
    effect: (sc) => {
      sc.omenMarkOfDoom = true;
    }
  },
  {
    id: 'omen_3',
    heroKey: 'char_omen',
    title: 'ЭХО ПУСТОТЫ',
    iconEmoji: '👤',
    desc: 'Периодически призывает спектрального двойника, повторяющего атаки.',
    effect: (sc) => {
      sc.omenVoidEcho = true;
    }
  },
  {
    id: 'omen_4',
    heroKey: 'char_omen',
    title: 'РАЗРЫВ ПРОСТРАНСТВА',
    iconEmoji: '⚡',
    desc: 'Рывок наносит урон всем врагам, сквозь которых пролетел Омен.',
    effect: (sc) => {
      sc.omenSpaceRift = true;
    }
  },
  {
    id: 'omen_5',
    heroKey: 'char_omen',
    title: 'САВАН ПРИЗРАКА',
    iconEmoji: '🌫',
    desc: 'Дальние вражеские стрелы с 30% шансом пролетают сквозь Омена без вреда.',
    effect: (sc) => {
      sc.omenPhantomShroud = true;
    }
  },
  {
    id: 'omen_6',
    heroKey: 'char_omen',
    title: 'ЭФИРНЫЕ КЛИНКИ',
    iconEmoji: '🗡',
    desc: 'Атаки игнорируют броню и пробивают вражеские щиты.',
    effect: (sc) => {
      sc.omenEtherealBlades = true;
      sc.damageMultiplier += 0.2;
    }
  },
  {
    id: 'omen_7',
    heroKey: 'char_omen',
    title: 'ПОГЛОЩЕНИЕ СКОРОСТИ',
    iconEmoji: '🌀',
    desc: 'Удары замедляют цель и временно ускоряют бег Омена.',
    effect: (sc) => {
      sc.omenSpeedDrain = true;
    }
  },
  {
    id: 'omen_8',
    heroKey: 'char_omen',
    title: 'СУМЕРЕЧНЫЙ РАЗРЯД',
    iconEmoji: '⚡',
    desc: 'Периодически поражает ближайшую цель темной молнией.',
    effect: (sc) => {
      sc.omenTwilightDischarge = true;
    }
  },
  {
    id: 'omen_9',
    heroKey: 'char_omen',
    title: 'ЭНТРОПИЯ',
    iconEmoji: '⌛',
    desc: 'Урон увеличивается на 40% по врагам, у которых осталось мало HP.',
    effect: (sc) => {
      sc.omenEntropy = true;
    }
  },
  {
    id: 'omen_10',
    heroKey: 'char_omen',
    title: 'ЦАРСТВО ТЕНЕЙ',
    iconEmoji: '🌑',
    desc: 'Ультимейт затемняет арену и сильно замедляет всех врагов в комнате.',
    effect: (sc) => {
      sc.omenShadowRealm = true;
      sc.damageMultiplier += 0.35;
    }
  },

  // --- 8. НИХИЛ (char_nihil) ---
  {
    id: 'nihil_1',
    heroKey: 'char_nihil',
    title: 'ПРИТЯЖЕНИЕ ГРАВИТОНА',
    iconEmoji: '🌀',
    desc: 'Сингулярность стягивает врагов с большей площади и держит их крепче.',
    effect: (sc) => {
      sc.nihilGravitonPull = true;
    }
  },
  {
    id: 'nihil_2',
    heroKey: 'char_nihil',
    title: 'ТРОЙНОЙ СЕРП',
    iconEmoji: '🌙',
    desc: 'Базовый выстрел выпускает веер из трех клинков вместо одного.',
    effect: (sc) => {
      sc.nihilTripleSickle = true;
    }
  },
  {
    id: 'nihil_3',
    heroKey: 'char_nihil',
    title: 'РАСКОЛ ЗЕМЛИ',
    iconEmoji: '🔮',
    desc: 'Ультимейт оставляет на полу разлом Бездны, непрерывно сжигающий и замедляющий врагов.',
    effect: (sc) => {
      sc.nihilGroundFracture = true;
      sc.damageMultiplier += 0.25;
    }
  },
  {
    id: 'nihil_4',
    heroKey: 'char_nihil',
    title: 'СХЛОПЫВАНИЕ',
    iconEmoji: '💥',
    desc: 'Воронка взрывается дополнительной волной урона при исчезновении.',
    effect: (sc) => {
      sc.nihilCollapseExplosion = true;
    }
  },
  {
    id: 'nihil_5',
    heroKey: 'char_nihil',
    title: 'ЛЕВИТАЦИЯ БЕЗДНЫ',
    iconEmoji: '🪽',
    desc: 'Парение над полом защищает от урона шипов и наземных ловушек.',
    effect: (sc) => {
      sc.nihilVoidLevitation = true;
    }
  },
  {
    id: 'nihil_6',
    heroKey: 'char_nihil',
    title: 'ОСКОЛОК ПУСТОТЫ',
    iconEmoji: '💎',
    desc: 'Убийство врага оставляет кристалл, взрывающийся при приближении других.',
    effect: (sc) => {
      sc.nihilVoidShard = true;
    }
  },
  {
    id: 'nihil_7',
    heroKey: 'char_nihil',
    title: 'АСТРАЛЬНОЕ ГОРЕНИЕ',
    iconEmoji: '🔥',
    desc: 'Способности поджигают цели сиреневым пламенем.',
    effect: (sc) => {
      sc.nihilAstralBurn = true;
    }
  },
  {
    id: 'nihil_8',
    heroKey: 'char_nihil',
    title: 'ПОГЛОЩЕНИЕ МАТЕРИИ',
    iconEmoji: '🛡',
    desc: 'За каждого затянутого в сингулярность врага дает временный барьер.',
    effect: (sc) => {
      sc.nihilMatterAbsorption = true;
    }
  },
  {
    id: 'nihil_9',
    heroKey: 'char_nihil',
    title: 'ВЗОР НЕБЫТИЯ',
    iconEmoji: '👁',
    desc: 'Увеличивает дальность полета всех заклинаний на 35%.',
    effect: (sc) => {
      sc.nihilGazeOfNothingness = true;
    }
  },
  {
    id: 'nihil_10',
    heroKey: 'char_nihil',
    title: 'ТРИУМФ ТРЕХ КЛИНКОВ',
    iconEmoji: '👑',
    desc: 'Три лезвия короны непрерывно вращаются вокруг героя, нанося урон.',
    effect: (sc) => {
      sc.nihilCrownTriumph = true;
      sc.damageMultiplier += 0.35;
    }
  },

  // --- 5 ОБЩИХ НЕЙТРАЛЬНЫХ ПЕРКОВ ---
  {
    id: 'neutral_1',
    heroKey: 'neutral',
    title: 'ЭЛИКСИР ТИТАНА',
    iconEmoji: '🧪',
    desc: 'Повышает максимальный запас здоровья (+200 HP) и восполняет HP.',
    effect: (sc) => {
      sc.playerMaxHp += 200;
      sc.playerHp = Math.min(sc.playerMaxHp, sc.playerHp + 200);
      sc.updateHUD();
    }
  },
  {
    id: 'neutral_2',
    heroKey: 'neutral',
    title: 'САПОГИ ВЕТРА',
    iconEmoji: '👟',
    desc: 'Увеличивает базовую скорость передвижения героя на 18%.',
    effect: (sc) => {
      sc.playerSpeed = Math.round(sc.playerSpeed * 1.18);
      sc.basePlayerSpeed = sc.playerSpeed;
    }
  },
  {
    id: 'neutral_3',
    heroKey: 'neutral',
    title: 'ЗАТОЧКА СТАЛИ',
    iconEmoji: '⚔',
    desc: 'Увеличивает силу всех базовых атак и навыков на 20%.',
    effect: (sc) => {
      sc.damageMultiplier += 0.2;
    }
  },
  {
    id: 'neutral_4',
    heroKey: 'neutral',
    title: 'ПЕСОЧНЫЕ ЧАСЫ',
    iconEmoji: '⏳',
    desc: 'Уменьшает время перезарядки всех способностей на 20%.',
    effect: (sc) => {
      sc.cdMax.s1 = Math.round(sc.cdMax.s1 * 0.8);
      sc.cdMax.s2 = Math.round(sc.cdMax.s2 * 0.8);
      sc.cdMax.ult = Math.round(sc.cdMax.ult * 0.8);
    }
  },
  {
    id: 'neutral_5',
    heroKey: 'neutral',
    title: 'ЖАЖДА БИТВЫ',
    iconEmoji: '🩸',
    desc: 'Восстанавливает небольшой процент здоровья (+5 HP) от нанесенного урона.',
    effect: (sc) => {
      sc.hasVampirism = true;
    }
  },
  {
    id: 'neutral_6',
    heroKey: 'neutral',
    title: 'ОГНЕННОЕ КАСАНИЕ',
    iconEmoji: '🔥',
    desc: 'Все ваши навыки поджигают врагов ярким пламенем, нанося урон каждую секунду.',
    effect: (sc) => {
      sc.hasIgnitePerk = true;
    }
  }
];

export class FloorRewardModal {
  private scene: any;
  private modalObjects: Phaser.GameObjects.GameObject[] = [];
  private isPickProcessing = false;

  constructor(scene: any) {
    this.scene = scene;
  }

  public open() {
    this.scene.player?.setVelocity(0, 0);
    this.scene.isUpgradeModalOpen = true;

    const heroKey = this.scene.selectedHeroKey || 'char_grim';
    const appliedIds: string[] = this.scene.appliedUpgradeCards || [];

    showHTMLFloorRewardModal(
      heroKey,
      appliedIds,
      FLOOR_PERKS_DATABASE,
      (perk) => {
        if (!this.scene.appliedUpgradeCards) this.scene.appliedUpgradeCards = [];
        this.scene.appliedUpgradeCards.push(perk.id);
        
        perk.effect(this.scene);
        this.scene.isUpgradeModalOpen = false;
        this.scene.showFloatingNotice(`УСИЛЕНИЕ ПРИМЕНЕНО: ${perk.title}! ✨`, '#4ade80');
      }
    );
  }

  public close() {
    this.scene.isUpgradeModalOpen = false;
    const oldModal = document.getElementById('game-dom-floor-reward-modal');
    if (oldModal) oldModal.remove();
  }
}
