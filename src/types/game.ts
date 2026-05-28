// Card colors that affect market value
export type CardColor = 'red' | 'green' | 'blue' | 'yellow' | 'purple'

// Market condition for each color
export type MarketCondition = 'plus' | 'zero' | 'minus'

export interface Market {
  rfr: number // risk-free rate
  mrp: number // market risk premium
  red: MarketCondition
  green: MarketCondition
  blue: MarketCondition
  yellow: MarketCondition
  purple: MarketCondition
}

export interface Asset {
  id: string
  gold: number
  silver: number
  color: CardColor
  ability?: AssetAbility // purple assets may have abilities
}

export type LiabilityType = 'short_term' | 'long_term'

export interface Liability {
  id: string
  gold: number
  rfr_type: LiabilityType
}

export type Character =
  | 'head_of_rnd'
  | 'ceo'
  | 'cso'
  | 'cfo'
  | 'shareholder'
  | 'stakeholder'
  | 'regulator'
  | 'banker'

export const CHARACTER_INFO: Record<Character, { name: string; abilities: string[] }> = {
  head_of_rnd: {
    name: 'Head of R&D',
    abilities: ['Draw 6 cards and return 2', 'Gain +1 cash for each purple card'],
  },
  ceo: {
    name: 'CEO',
    abilities: ['Buy up to 3 assets', 'Gain +1 cash for each yellow card', 'Become chairman next round'],
  },
  cso: {
    name: 'CSO',
    abilities: ['Buy up to 2 green and/or red assets', 'Gain +1 cash for each green card', 'Cannot be forced to disinvest by the Shareholder'],
  },
  cfo: {
    name: 'CFO',
    abilities: ['Issue up to 3 liabilities', 'Gain +1 cash for each blue card', 'May issue liabilities to raise cash when required to terminate credit'],
  },
  shareholder: {
    name: 'Shareholder',
    abilities: ['Fire any character except banker and regulator', 'A fired character skips their turn in silence'],
  },
  stakeholder: {
    name: 'Stakeholder',
    abilities: ['Gain +1 cash for each red card', 'Force a player (not the CSO) to divest an asset (not green or red)'],
  },
  regulator: {
    name: 'Regulator',
    abilities: ['Trade hand with any player', 'Or return any number of cards to the deck and draw the same amount'],
  },
  banker: {
    name: 'Banker',
    abilities: ['Terminate the credit line of any character (except shareholder and regulator)'],
  },
}

// Purple asset abilities that trigger at end of game
export type AssetAbility = 'minus_into_plus' | 'silver_into_gold' | 'change_asset_color'

// Game phases
export type GamePhase = 'lobby' | 'character_selection' | 'drawing' | 'playing' | 'banker_target' | 'asset_abilities' | 'results'

export interface Player {
  id: string
  user_id: string
  name: string
  character?: Character | null
  cash: number
  hand: (Asset | Liability)[]
  assets: Asset[]
  liabilities: Liability[]
  has_used_ability: boolean
  cards_drawn: number[]
  total_cards_drawn: number
  assets_bought_this_turn: number
  liabilities_issued_this_turn: number
  is_connected: boolean
}

export interface GameState {
  id: string
  room_code: string
  phase: GamePhase
  current_player_index: number | null
  players: Player[]
  market: Market
  current_events: GameEvent[]
  is_final_round: boolean
  turn_number: number
  created_at: string
}

export interface GameEvent {
  id: string
  title: string
  description: string
  plus_gold?: CardColor[]
  minus_gold?: CardColor[]
  skip_turn?: Character
}

// Actions a player can send
export type GameAction =
  | { type: 'join_lobby'; name: string }
  | { type: 'leave_lobby' }
  | { type: 'start_game' }
  | { type: 'select_character'; character: Character }
  | { type: 'draw_card'; card_type: 'asset' | 'liability' | 'market_event' }
  | { type: 'put_back_card'; card_index: number }
  | { type: 'buy_asset'; hand_index: number }
  | { type: 'issue_liability'; hand_index: number }
  | { type: 'end_turn' }
  // Character abilities
  | { type: 'fire_character'; target_player_id: string }
  | { type: 'divest_asset'; target_player_id: string; asset_index: number }
  | { type: 'swap_hands'; target_player_id: string }
  | { type: 'swap_with_deck'; card_indices: number[] }
  | { type: 'terminate_credit'; target_player_id: string }
  | { type: 'pay_banker'; selected_assets: number[]; selected_liabilities: number[] }
  | { type: 'redeem_liability'; liability_index: number }
  // End of game abilities (purple assets)
  | { type: 'toggle_minus_into_plus'; color: CardColor }
  | { type: 'toggle_silver_into_gold'; asset_index: number }
  | { type: 'toggle_change_asset_color'; asset_index: number; color: CardColor }
  | { type: 'confirm_asset_ability'; asset_index: number }
