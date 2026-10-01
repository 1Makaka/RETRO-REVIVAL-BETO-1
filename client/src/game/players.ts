/**
 * Frantic Battles - Player & Hero Database
 */

export interface HeroSkill {
  name: string;
  icon: string;
  cooldown: number; // in seconds
  desc: string;
}

export interface HeroData {
  id: string;
  name: string;
  title: string;
  style: string;
  rarity: 'ОБЫЧНЫЙ' | 'РЕДКИЙ' | 'ЭПИЧЕСКИЙ' | 'ЛЕГЕНДАРНЫЙ' | 'МИФИЧЕСКИЙ';
  color: number;
  colorHex: string;
  hp: number;
  speed: number;
  texture: string;
  portrait: string;
  attackDesc: string;
  skills: HeroSkill[];
}

export const HEROES: Record<string, HeroData> = {
  char_zaza: {
    id: 'char_zaza',
    name: 'ZAZA (Заза)',
    title: 'Токсичный Мутант',
    style: 'Яд, контроль зоны и трансформация в танка.',
    rarity: 'ЭПИЧЕСКИЙ',
    color: 0xa855f7,
    colorHex: '#c084fc',
    hp: 1000,
    speed: 265,
    texture: 'char_zaza',
    portrait: 'portrait_zaza',
    attackDesc: 'Удар в ближнем бою (урон 90).',
    skills: [
      {
        name: 'Плевок ядом',
        icon: 'skill_zaza_1',
        cooldown: 3.0,
        desc: 'Выпускает токсичный сгусток яда вперед. Образует лужу, наносящую урон.'
      },
      {
        name: 'Пропеллер',
        icon: 'skill_zaza_2',
        cooldown: 4.5,
        desc: 'Быстро вращает деревянную дубинку, отражая летящие снаряды.'
      },
      {
        name: 'Мутация монстра',
        icon: 'skill_zaza_3',
        cooldown: 14.0,
        desc: 'Мутирует в гигантского монстра (2000 HP) с новыми мощными атаками ближнего боя (укусы и рев).'
      }
    ]
  },
  char_grim: {
    id: 'char_grim',
    name: 'ГРИМ (Grim)',
    title: 'Теневой Алхимик',
    style: 'Скрытность, ловушки и взрывной урон.',
    rarity: 'ОБЫЧНЫЙ',
    color: 0x94a3b8,
    colorHex: '#cbd5e1',
    hp: 900,
    speed: 280,
    texture: 'char_grim',
    portrait: 'portrait_grim',
    attackDesc: 'Бросок алхимической колбы (урон 80).',
    skills: [
      {
        name: 'Смоляная бомба',
        icon: 'skill_grim_1',
        cooldown: 2.8,
        desc: 'Бьет колбой смолы, создавая вязкую ловушку, сильно замедляющую врагов.'
      },
      {
        name: 'Теневой шаг',
        icon: 'skill_grim_2',
        cooldown: 4.0,
        desc: 'Резкий скрытный рывок вперед с кратковременной невидимостью.'
      },
      {
        name: 'Взрывной котел',
        icon: 'skill_grim_3',
        cooldown: 13.0,
        desc: 'Устанавливает котел, который мощно взрывается через 1.5 секунды.'
      }
    ]
  },
  char_bjorn: {
    id: 'char_bjorn',
    name: 'БЬОРН (Bjorn)',
    title: 'Северный Берсерк',
    style: 'Агрессивный ближний бой, отбрасывание и массовый урон.',
    rarity: 'ОБЫЧНЫЙ',
    color: 0x94a3b8,
    colorHex: '#cbd5e1',
    hp: 1250,
    speed: 245,
    texture: 'char_bjorn',
    portrait: 'portrait_bjorn',
    attackDesc: 'Размашистый удар топором (урон 120).',
    skills: [
      {
        name: 'Землетрясение',
        icon: 'skill_bjorn_1',
        cooldown: 3.2,
        desc: 'Бьет ногой о землю, вызывая цепь каменных шипов прямо перед собой.'
      },
      {
        name: 'Мощный таран',
        icon: 'skill_bjorn_2',
        cooldown: 4.5,
        desc: 'Делает сокрушительный рывок плечом, отбрасывая противников.'
      },
      {
        name: 'Вихрь топоров',
        icon: 'skill_bjorn_3',
        cooldown: 12.0,
        desc: 'Бешено вращается с тяжелым топором, нанося АОЕ урон вокруг себя.'
      }
    ]
  },
  char_torf: {
    id: 'char_torf',
    name: 'ТОРФ (Torf)',
    title: 'Каменный Исполин',
    style: 'Несокрушимый танк: иммунитет к отталкиванию, каменная броня и подземный прорыв.',
    rarity: 'РЕДКИЙ',
    color: 0x3b82f6,
    colorHex: '#60a5fa',
    hp: 1500,
    speed: 220,
    texture: 'char_torf',
    portrait: 'portrait_torf',
    attackDesc: 'Тяжелые кулаки: размашистый удар гигантскими руками по широкой дуге (АОЕ урон).',
    skills: [
      {
        name: 'Бросок валуна',
        icon: 'skill_torf_1',
        cooldown: 3.5,
        desc: 'Вырывает из-под земли кусок породы и швыряет его. При ударе валун разлетается на осколки с АОЕ уроном.'
      },
      {
        name: 'Каменная кожа',
        icon: 'skill_torf_2',
        cooldown: 4.5,
        desc: 'Покрывается прочной коркой на 3.5 сек: весь получаемый урон снижен на 50%, уничтожает вражеские снаряды.'
      },
      {
        name: 'Подземный прорыв',
        icon: 'skill_torf_3',
        cooldown: 13.0,
        desc: 'Уходит под землю на 2с (неуязвим, быстрая тень) и с грохотом вырывается наружу, подбрасывая врагов с крит. уроном.'
      }
    ]
  },
  char_omen: {
    id: 'char_omen',
    name: 'ОМЕН (Omen)',
    title: 'Призрачная Сова Теней',
    style: 'Хрупкий, но смертоносный дальний бой: мобильность, контроль врагов и призрачное парение.',
    rarity: 'МИФИЧЕСКИЙ',
    color: 0xef4444,
    colorHex: '#ef4444',
    hp: 700,
    speed: 295,
    texture: 'char_omen',
    portrait: 'portrait_omen',
    attackDesc: 'Теневые лезвия: взмахивает крыльями, выпуская разрезающие дальние снаряды (урон 85).',
    skills: [
      {
        name: 'Теневой шторм',
        icon: 'skill_omen_1',
        cooldown: 2.5,
        desc: 'Запускает веер из 5 пробивающих теневых лезвий, наносящих урон и замедляющих врагов.'
      },
      {
        name: 'Астральный рывок',
        icon: 'skill_omen_2',
        cooldown: 4.0,
        desc: 'Мгновенный телепорт/рывок, оставляющий взрывную иллюзию теней, оглушающую врагов.'
      },
      {
        name: 'Теневое приземление',
        icon: 'skill_omen_3',
        cooldown: 12.0,
        desc: 'Омен взлетает в небо с красной вспышкой, становясь неуязвимым. Вы управляете огромным прицелом на земле (2с). Омен обрушивается в указанную точку, нанося массовый урон и ослепляя всех врагов на 2с!'
      }
    ]
  },
  char_alrik: {
    id: 'char_alrik',
    name: 'АЛАРИК (Alarik)',
    title: 'Страж Стальной Фаланги',
    style: 'Плотный рыцарь с длинным копьем для сдерживания толпы мобов в узких коридорах.',
    rarity: 'РЕДКИЙ',
    color: 0x3b82f6,
    colorHex: '#60a5fa',
    hp: 1350,
    speed: 235,
    texture: 'char_alrik',
    portrait: 'portrait_alrik',
    attackDesc: 'Выпад копьем: длинный резкий укол вперед (дальность в 1.5 раза выше обычного оружия, урон 95).',
    skills: [
      {
        name: 'Таранный рывок',
        icon: 'skill_alrik_1',
        cooldown: 3.2,
        desc: 'Опускает копье и стремительно мчится вперед, расталкивая и нанося урон всем врагам на пути.'
      },
      {
        name: 'Широкий взмах',
        icon: 'skill_alrik_2',
        cooldown: 4.2,
        desc: 'Делает мощный круговой размах копьем на 360°, жестко отбрасывая (Knockback) всех противников вокруг.'
      },
      {
        name: 'Стальная Фаланга',
        icon: 'skill_alrik_3',
        cooldown: 13.0,
        desc: 'Втыкает копье и ставит перед собой энергетический щит на 3с. Отражает снаряды и врагов с огромным уроном! Можно поворачивать щит на месте.'
      }
    ]
  },
  char_kraul: {
    id: 'char_kraul',
    name: 'КРАУЛ (Kraul)',
    title: 'Теневой Живорез',
    style: 'Стеклянная пушка: невероятная скорость, малый хитбокс, но критически низкое здоровье.',
    rarity: 'ЭПИЧЕСКИЙ',
    color: 0xa855f7,
    colorHex: '#c084fc',
    hp: 500,
    speed: 315,
    texture: 'char_kraul',
    portrait: 'portrait_kraul',
    attackDesc: 'Хлесткий удар плетью из длинных рук прямо перед собой (урон 110, узкая зона, повышенная дальность).',
    skills: [
      {
        name: 'Теневой рывок',
        icon: 'skill_kraul_1',
        cooldown: 4.0,
        desc: 'Стремительный рывок сквозь врагов, накладывающий эффект "Кровотечение" (урон каждую секунду в течение 3 сек).'
      },
      {
        name: 'Мертвая хватка',
        icon: 'skill_kraul_2',
        cooldown: 5.0,
        desc: 'Вытягивает длинную руку вперед. При попадании притягивается к врагу и оглушает его на 1 секунду.'
      },
      {
        name: 'Жуткая мясорубка',
        icon: 'skill_kraul_3',
        cooldown: 14.0,
        desc: 'Впадает в бешенство на 4 сек: скорость атаки увеличивается в 2 раза, а удары восстанавливают 15% здоровья.'
      }
    ]
  },
  char_nihil: {
    id: 'char_nihil',
    name: 'НИХИЛ (Nihil)',
    title: 'Нихил Бездны',
    style: 'Кастер контроля и урона по площади (AoE Mage Бездны).',
    rarity: 'МИФИЧЕСКИЙ',
    color: 0xc084fc,
    colorHex: '#d8b4fe',
    hp: 750,
    speed: 220,
    texture: 'char_nihil',
    portrait: 'portrait_nihil',
    attackDesc: 'Спектральный Серп: выпускает вращающееся лезвие дуги Бездны (урон 85, пробивает до 2 целей насквозь).',
    skills: [
      {
        name: 'Сингулярность Пустоты',
        icon: 'skill_nihil_1',
        cooldown: 6.0,
        desc: 'Создает вихрь фиолетового пламени радиусом 110 px. Затягивает врагов и наносит 40 урона каждые 0.5с (2.5с).'
      },
      {
        name: 'Шаг Пустоты',
        icon: 'skill_nihil_2',
        cooldown: 4.5,
        desc: 'Быстрый рывок в форме нематериального духа Бездны, временно ускоряющий на 30%.'
      },
      {
        name: 'Казнь Трех Клинков',
        icon: 'skill_nihil_3',
        cooldown: 18.0,
        desc: 'Три гигантских сиреневых клинка вонзаются в землю вокруг Нихила, нанося 380 урона и оглушая врагов на 1.5с.'
      }
    ]
  }
};
