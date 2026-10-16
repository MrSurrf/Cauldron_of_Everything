import acidIcon from './assets/acid.svg'
import bludgeoningIcon from './assets/bludgeoning.svg'
import coldIcon from './assets/cold.svg'
import fireIcon from './assets/fire.svg'
import forceIcon from './assets/force.svg'
import lightningIcon from './assets/lightning.svg'
import necroticIcon from './assets/necrotic.svg'
import piercingIcon from './assets/piercing.svg'
import poisonIcon from './assets/poison.svg'
import psychicIcon from './assets/psychic.svg'
import radiantIcon from './assets/radiant.svg'
import slashingIcon from './assets/slashing.svg'
import thunderIcon from './assets/thunder.svg'
import type { DamageType } from '../../model/creature'

type DamageTypePresentation = {
  color: string
  flipX?: boolean
  icon: string
  label: string
  // Оптическая компенсация пропорций исходных SVG без искажения контура.
  rotation?: number
  scale: number
}

export const damageTypePresentation: Record<
  DamageType,
  DamageTypePresentation
> = {
  bludgeoning: {
    color: '#E2C8A6',
    icon: bludgeoningIcon,
    label: 'Дробящий урон',
    scale: 0.92,
  },
  piercing: {
    color: '#E2C8A6',
    icon: piercingIcon,
    label: 'Колющий урон',
    rotation: 35,
    scale: 1.08,
  },
  slashing: {
    color: '#E2C8A6',
    flipX: true,
    icon: slashingIcon,
    label: 'Рубящий урон',
    scale: 1.06,
  },
  acid: {
    color: '#C7F43D',
    icon: acidIcon,
    label: 'Кислотный урон',
    scale: 1.1,
  },
  poison: {
    color: '#45D36B',
    icon: poisonIcon,
    label: 'Урон ядом',
    scale: 1.18,
  },
  cold: {
    color: '#79EAF2',
    icon: coldIcon,
    label: 'Урон холодом',
    scale: 0.94,
  },
  fire: {
    color: '#FF8A3D',
    icon: fireIcon,
    label: 'Урон огнём',
    scale: 1,
  },
  lightning: {
    color: '#72A7FF',
    icon: lightningIcon,
    label: 'Урон молнией',
    scale: 1.08,
  },
  thunder: {
    color: '#9FAAFF',
    icon: thunderIcon,
    label: 'Урон громом',
    scale: 1,
  },
  force: {
    color: '#FF626D',
    icon: forceIcon,
    label: 'Силовой урон',
    scale: 0.94,
  },
  necrotic: {
    color: '#A9C46C',
    icon: necroticIcon,
    label: 'Некротический урон',
    scale: 1,
  },
  psychic: {
    color: '#FF72D2',
    icon: psychicIcon,
    label: 'Психический урон',
    scale: 0.98,
  },
  radiant: {
    color: '#FFF0A3',
    icon: radiantIcon,
    label: 'Лучистый урон',
    scale: 0.94,
  },
}
