import aberrationFrame from './AberrationHP.svg'
import beastFrame from './BeastHP.svg'
import celestialFrame from './СelestialsHP.svg'
import constructFrame from './ConstructHP.svg'
import dragonFrame from './DragonHP.svg'
import elementalFrame from './ElementalHP.svg'
import fairyFrame from './FairyHP.svg'
import fiendFrame from './FiendHP.svg'
import giantFrame from './GiantHP.svg'
import humanoidFrame from './HumanoidHP.svg'
import monsterFrame from './MonsterHP.svg'
import plantFrame from './PlantHP.svg'
import slimeFrame from './SlimeHP.svg'
import undeadFrame from './UndeadHP.svg'

export type CreatureHitPointsFrameType =
  | 'aberration'
  | 'beast'
  | 'celestial'
  | 'construct'
  | 'dragon'
  | 'elemental'
  | 'fairy'
  | 'fiend'
  | 'giant'
  | 'humanoid'
  | 'monster'
  | 'plant'
  | 'slime'
  | 'undead'

type CreatureHitPointsFrame = {
  source: string
  valueCenter: {
    x: number
    y: number
  }
}

const frames: Record<CreatureHitPointsFrameType, CreatureHitPointsFrame> = {
  aberration: { source: aberrationFrame, valueCenter: { x: 50, y: 57.1 } },
  beast: { source: beastFrame, valueCenter: { x: 50, y: 54 } },
  celestial: { source: celestialFrame, valueCenter: { x: 50, y: 59.5 } },
  construct: { source: constructFrame, valueCenter: { x: 50, y: 52.4 } },
  dragon: { source: dragonFrame, valueCenter: { x: 50, y: 63.6 } },
  elemental: { source: elementalFrame, valueCenter: { x: 50, y: 57 } },
  fairy: { source: fairyFrame, valueCenter: { x: 50, y: 54.6 } },
  fiend: { source: fiendFrame, valueCenter: { x: 50, y: 59.7 } },
  giant: { source: giantFrame, valueCenter: { x: 50, y: 56.5 } },
  humanoid: { source: humanoidFrame, valueCenter: { x: 50, y: 52.2 } },
  monster: { source: monsterFrame, valueCenter: { x: 50, y: 61.7 } },
  plant: { source: plantFrame, valueCenter: { x: 50, y: 53.8 } },
  slime: { source: slimeFrame, valueCenter: { x: 50, y: 45.8 } },
  undead: { source: undeadFrame, valueCenter: { x: 50, y: 55.5 } },
}

const aliases: Readonly<Record<string, CreatureHitPointsFrameType>> = {
  aberration: 'aberration',
  aberrations: 'aberration',
  'аберрация': 'aberration',
  beast: 'beast',
  beasts: 'beast',
  'зверь': 'beast',
  celestial: 'celestial',
  celestials: 'celestial',
  'небожитель': 'celestial',
  construct: 'construct',
  constructs: 'construct',
  'конструкт': 'construct',
  dragon: 'dragon',
  dragons: 'dragon',
  'дракон': 'dragon',
  elemental: 'elemental',
  elementals: 'elemental',
  'элементаль': 'elemental',
  fairy: 'fairy',
  fey: 'fairy',
  'фея': 'fairy',
  fiend: 'fiend',
  fiends: 'fiend',
  'исчадие': 'fiend',
  giant: 'giant',
  giants: 'giant',
  'великан': 'giant',
  humanoid: 'humanoid',
  humanoids: 'humanoid',
  'гуманоид': 'humanoid',
  monster: 'monster',
  monsters: 'monster',
  monstrosity: 'monster',
  monstrosities: 'monster',
  'монстр': 'monster',
  ooze: 'slime',
  oozes: 'slime',
  slime: 'slime',
  'слизь': 'slime',
  plant: 'plant',
  plants: 'plant',
  'растение': 'plant',
  undead: 'undead',
  'нежить': 'undead',
}

function normalizeCreatureType(creatureType?: string) {
  return creatureType
    ?.trim()
    .toLocaleLowerCase('ru-RU')
    .split(/[,(]/, 1)[0]
    .trim()
}

export function getCreatureHitPointsFrame(creatureType?: string) {
  const normalizedType = normalizeCreatureType(creatureType)
  const type = normalizedType ? aliases[normalizedType] : undefined

  return {
    ...frames[type ?? 'monster'],
    type: type ?? 'monster',
  }
}
