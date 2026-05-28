import type { Asset, Liability, Market, MarketCondition, CardColor, Character, GameEvent, Player, GameState } from '../types/game'

// Card data loaded from the original boardgame.json structure
const COLORS: CardColor[] = ['red', 'green', 'blue', 'yellow', 'purple']

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Generate asset deck (based on original game's boardgame.json)
function generateAssetDeck(): Asset[] {
  const assets: Asset[] = []
  let id = 0

  // Regular assets: 4 of each color, varying gold/silver values
  for (const color of COLORS) {
    for (let i = 0; i < 8; i++) {
      const gold = randomInt(1, 4)
      const silver = randomInt(0, 3)
      assets.push({
        id: `asset-${id++}`,
        gold,
        silver,
        color,
        ability: color === 'purple' && i < 3
          ? (['minus_into_plus', 'silver_into_gold', 'change_asset_color'] as const)[i]
          : undefined,
      })
    }
  }
  return shuffle(assets)
}

// Generate liability deck
function generateLiabilityDeck(): Liability[] {
  const liabilities: Liability[] = []
  let id = 0

  for (let i = 0; i < 30; i++) {
    liabilities.push({
      id: `liability-${id++}`,
      gold: randomInt(1, 3),
      rfr_type: i % 2 === 0 ? 'short_term' : 'long_term',
    })
  }
  return shuffle(liabilities)
}

// Generate market/event deck
function generateMarketEventDeck(): (Market | GameEvent)[] {
  const deck: (Market | GameEvent)[] = []

  // Market cards
  for (let i = 0; i < 10; i++) {
    const conditions: MarketCondition[] = ['plus', 'zero', 'minus']
    deck.push({
      rfr: randomInt(1, 5),
      mrp: randomInt(1, 5),
      red: conditions[randomInt(0, 2)],
      green: conditions[randomInt(0, 2)],
      blue: conditions[randomInt(0, 2)],
      yellow: conditions[randomInt(0, 2)],
      purple: conditions[randomInt(0, 2)],
    } as Market)
  }

  // Event cards
  const eventTemplates: Omit<GameEvent, 'id'>[] = [
    { title: 'Bull Market', description: 'All colors gain +1 gold', plus_gold: ['red', 'green', 'blue', 'yellow', 'purple'] },
    { title: 'Bear Market', description: 'All colors lose 1 gold', minus_gold: ['red', 'green', 'blue', 'yellow', 'purple'] },
    { title: 'Green Boom', description: 'Green and red assets gain +1 gold', plus_gold: ['green', 'red'] },
    { title: 'Tech Crash', description: 'Purple and blue assets lose 1 gold', minus_gold: ['purple', 'blue'] },
    { title: 'Regulatory Hold', description: 'The Regulator skips next turn', skip_turn: 'regulator' },
  ]

  eventTemplates.forEach((template, i) => {
    deck.push({ ...template, id: `event-${i}` })
  })

  return shuffle(deck)
}

// Check if something is a Market card (not an event)
export function isMarket(card: Market | GameEvent): card is Market {
  return 'rfr' in card && 'mrp' in card
}

const ALL_CHARACTERS: Character[] = [
  'head_of_rnd', 'ceo', 'cso', 'cfo',
  'shareholder', 'stakeholder', 'regulator', 'banker',
]

export function createInitialGameState(
  gameId: string,
  roomCode: string,
  playerData: { user_id: string; name: string }[]
): GameState {
  const assetDeck = generateAssetDeck()
  const liabilityDeck = generateLiabilityDeck()
  const marketEventDeck = generateMarketEventDeck()

  // Find initial market card
  const firstMarketIdx = marketEventDeck.findIndex(c => isMarket(c))
  const initialMarket = firstMarketIdx >= 0
    ? marketEventDeck.splice(firstMarketIdx, 1)[0] as Market
    : { rfr: 3, mrp: 3, red: 'zero' as const, green: 'zero' as const, blue: 'zero' as const, yellow: 'zero' as const, purple: 'zero' as const }

  // Create players with starting resources
  const players: Player[] = playerData.map((p, i) => {
    // Each player starts with 1 gold, 2 unique assets, 2 liabilities
    const startingAssets = [assetDeck.pop()!, assetDeck.pop()!]
    const startingHand: (Asset | Liability)[] = [liabilityDeck.pop()!, liabilityDeck.pop()!]

    return {
      id: `player-${i}`,
      user_id: p.user_id,
      name: p.name,
      cash: 1,
      hand: startingHand,
      assets: startingAssets,
      liabilities: [],
      has_used_ability: false,
      cards_drawn: [],
      total_cards_drawn: 0,
      is_connected: true,
    }
  })

  return {
    id: gameId,
    room_code: roomCode,
    phase: 'character_selection',
    current_player_index: 0,
    players,
    market: initialMarket,
    current_events: [],
    is_final_round: false,
    turn_number: 1,
    created_at: new Date().toISOString(),
    // Store decks as part of state (serialized to Firestore)
    _assetDeck: assetDeck,
    _liabilityDeck: liabilityDeck,
    _marketEventDeck: marketEventDeck,
    _availableCharacters: ALL_CHARACTERS.slice(0, Math.min(playerData.length + 1, ALL_CHARACTERS.length)),
    _firedCharacters: [],
    _totalAssetsBought: 0,
  } as GameState & Record<string, unknown>
}

// How many assets a player can buy based on character
// Per original docs (section 2.8.2):
// - CEO: budget 3, each color costs 1
// - CSO: budget 2, red/green cost 1, blue/purple/yellow cost 2
// - Everyone else: budget 1, each color costs 1
export function getPlayableAssets(character?: Character): number {
  if (!character) return 1
  if (character === 'ceo') return 3
  if (character === 'cso') return 2
  return 1
}

// CSO asset cost per color (from original docs section 2.8.2)
// CSO has a 2-unit budget. Red/Green cost 1 unit, Blue/Purple/Yellow cost 2 units.
export function getCSOAssetCost(color: CardColor): number {
  if (color === 'red' || color === 'green') return 1
  return 2 // blue, purple, yellow
}

// How many liabilities a player can issue based on character
export function getPlayableLiabilities(character?: Character): number {
  if (!character) return 1
  if (character === 'cfo') return 3
  return 1
}

// How many cards a player can draw based on character
export function getDrawCount(character?: Character): number {
  if (character === 'head_of_rnd') return 6
  return 3
}

// How many cards a player must put back based on character
export function getPutBackCount(character?: Character): number {
  if (character === 'head_of_rnd') return 2
  return 1
}

// Check if buying an asset should refresh the market
export function shouldRefreshMarket(totalBoughtAssets: number): boolean {
  // Market refreshes at 1st, 2nd, 3rd, 4th, 5th, 7th, 8th asset bought across all players
  return [1, 2, 3, 4, 5, 7, 8].includes(totalBoughtAssets)
}

// Calculate asset market value based on current market
export function assetMarketValue(asset: Asset, market: Market): number {
  const condition = market[asset.color]
  const modifier = condition === 'plus' ? 1 : condition === 'minus' ? -1 : 0
  return asset.gold + modifier
}

// Calculate final score for a player
export function calculateScore(player: Player, market: Market): {
  assetValue: number
  liabilityValue: number
  cashValue: number
  total: number
  breakdown: string[]
} {
  const breakdown: string[] = []

  // Asset values
  let assetValue = 0
  for (const asset of player.assets) {
    const value = assetMarketValue(asset, market)
    assetValue += value + asset.silver
    breakdown.push(`${asset.color} asset: ${value}g + ${asset.silver}s = ${value + asset.silver}`)
  }

  // Liability costs
  let liabilityValue = 0
  for (const liability of player.liabilities) {
    const cost = liability.rfr_type === 'short_term'
      ? liability.gold + market.rfr
      : liability.gold + market.rfr + market.mrp
    liabilityValue += cost
    breakdown.push(`${liability.rfr_type} liability: -${cost}`)
  }

  const total = assetValue - liabilityValue + player.cash
  breakdown.push(`Cash: ${player.cash}`)
  breakdown.push(`Total: ${assetValue} - ${liabilityValue} + ${player.cash} = ${total}`)

  return { assetValue, liabilityValue, cashValue: player.cash, total, breakdown }
}

// CSO can only buy red or green
export function canCSOBuyAsset(asset: Asset): boolean {
  return asset.color === 'red' || asset.color === 'green'
}

// Character bonus cash at start of turn
export function getCharacterBonusCash(character: Character, assets: Asset[]): number {
  const colorMap: Partial<Record<Character, CardColor>> = {
    head_of_rnd: 'purple',
    ceo: 'yellow',
    cso: 'green',
    cfo: 'blue',
    stakeholder: 'red',
  }
  const bonusColor = colorMap[character]
  if (!bonusColor) return 0
  return assets.filter(a => a.color === bonusColor).length
}
