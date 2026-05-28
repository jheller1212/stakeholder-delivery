import type { GameState, Character, Asset, Liability, Player } from '../types/game'
import { assetMarketValue, getCSOAssetCost, canCSOBuyAsset } from './gameEngine'

export type BotDifficulty = 'medium' | 'hard'

// Bot names for flavor
const BOT_NAMES = [
  'Alex (Bot)', 'Morgan (Bot)', 'Jordan (Bot)', 'Taylor (Bot)',
  'Casey (Bot)', 'Riley (Bot)', 'Quinn (Bot)',
]

export function getBotName(index: number): string {
  return BOT_NAMES[index % BOT_NAMES.length]
}

export function isBotPlayer(userId: string): boolean {
  return userId.startsWith('bot-')
}

// Random choice with optional weighting toward optimal
function maybe(probability: number): boolean {
  return Math.random() < probability
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Character selection logic
export function botSelectCharacter(
  state: GameState,
  botPlayer: Player,
  difficulty: BotDifficulty
): Character {
  const available = ((state as unknown as Record<string, unknown>)._availableCharacters as Character[]) || []
  if (available.length === 0) throw new Error('No characters available')

  if (difficulty === 'medium') {
    // Medium: slight preference for characters that match owned asset colors, but mostly random
    if (maybe(0.4)) {
      return pickRandom(available)
    }
    // Prefer characters that give bonus cash for colors the bot owns
    const colorBonusMap: Partial<Record<Character, string>> = {
      head_of_rnd: 'purple', ceo: 'yellow', cso: 'green', cfo: 'blue', stakeholder: 'red',
    }
    const scored = available.map(c => {
      const bonusColor = colorBonusMap[c]
      const colorCount = bonusColor ? botPlayer.assets.filter(a => a.color === bonusColor).length : 0
      return { character: c, score: colorCount }
    })
    scored.sort((a, b) => b.score - a.score)
    return scored[0].character
  }

  // Hard: pick strategically
  const colorBonusMap: Partial<Record<Character, string>> = {
    head_of_rnd: 'purple', ceo: 'yellow', cso: 'green', cfo: 'blue', stakeholder: 'red',
  }

  const scored = available.map(c => {
    let score = 0
    // Bonus cash from matching colors
    const bonusColor = colorBonusMap[c]
    if (bonusColor) {
      score += botPlayer.assets.filter(a => a.color === bonusColor).length * 2
    }
    // CEO is strong if we have cash to buy multiple assets
    if (c === 'ceo' && botPlayer.cash >= 3) score += 3
    // Head of R&D is good for card selection
    if (c === 'head_of_rnd') score += 2
    // CFO is good if we have liabilities to redeem
    if (c === 'cfo' && botPlayer.liabilities.length > 0 && botPlayer.cash > 2) score += 2
    // CSO is good if hand has red/green assets
    if (c === 'cso') {
      const rgAssets = botPlayer.hand.filter(card => 'color' in card && (card.color === 'red' || card.color === 'green'))
      score += rgAssets.length * 2
    }
    // Offensive abilities are less useful with few players
    if (c === 'shareholder' || c === 'banker') score += 1
    if (c === 'stakeholder') score += 1
    if (c === 'regulator') score += 1
    return { character: c, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0].character
}

// Drawing phase: decide whether to draw asset or liability
export function botDecideDrawType(
  _state: GameState,
  botPlayer: Player,
  difficulty: BotDifficulty
): 'asset' | 'liability' {
  if (difficulty === 'medium') {
    // Medium: 70% assets, 30% liabilities
    return maybe(0.7) ? 'asset' : 'liability'
  }

  // Hard: draw assets if we have cash to buy, liabilities if we need cash
  const assetsInHand = botPlayer.hand.filter(c => 'color' in c) as Asset[]
  const affordableAssets = assetsInHand.filter(a => a.gold <= botPlayer.cash)

  if (botPlayer.cash < 2 && botPlayer.liabilities.length < 3) {
    return 'liability' // Need cash
  }
  if (affordableAssets.length >= 2) {
    return 'liability' // Already have buyable assets, get liabilities for cash
  }
  return 'asset'
}

// Put back phase: decide which card to put back
export function botDecidePutBack(
  state: GameState,
  botPlayer: Player,
  difficulty: BotDifficulty
): number {
  const hand = botPlayer.hand
  if (hand.length === 0) return 0

  if (difficulty === 'medium') {
    // Medium: put back a random card, slight preference for low-value cards
    if (maybe(0.4)) {
      return Math.floor(Math.random() * hand.length)
    }
  }

  // Evaluate each card's value
  const scores = hand.map((card, index) => {
    if ('color' in card) {
      // Asset: value based on market value and affordability
      const asset = card as Asset
      const marketVal = assetMarketValue(asset, state.market)
      const canAfford = asset.gold <= botPlayer.cash
      // Higher score = keep this card
      return { index, score: canAfford ? marketVal + asset.silver + 2 : marketVal + asset.silver - 1 }
    } else {
      // Liability: value based on cash gain vs cost
      const liability = card as Liability
      const cashGain = liability.gold
      const needCash = botPlayer.cash < 2
      return { index, score: needCash ? cashGain + 1 : cashGain - 1 }
    }
  })

  // Put back the lowest-scored card
  scores.sort((a, b) => a.score - b.score)
  return scores[0].index
}

// Playing phase: decide what actions to take
export interface BotPlayAction {
  type: 'buy_asset' | 'issue_liability' | 'end_turn' | 'use_ability'
  handIndex?: number
  targetPlayerId?: string
  assetIndex?: number
  cardIndices?: number[]
  liabilityIndex?: number
}

export function botDecidePlayActions(
  state: GameState,
  botPlayer: Player,
  difficulty: BotDifficulty
): BotPlayAction[] {
  const actions: BotPlayAction[] = []
  const hand = [...botPlayer.hand]
  let cash = botPlayer.cash
  let assetsBought = 0
  let liabilitiesIssued = 0

  const maxAssets = botPlayer.character === 'ceo' ? 3 : botPlayer.character === 'cso' ? 2 : 1
  const maxLiabilities = botPlayer.character === 'cfo' ? 3 : 1

  // Use ability first (for offensive characters)
  if (!botPlayer.has_used_ability) {
    const abilityAction = botDecideAbility(state, botPlayer, difficulty)
    if (abilityAction) {
      actions.push(abilityAction)
    }
  }

  // Buy assets
  const assetsInHand = hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => 'color' in card)
    .map(({ card, index }) => ({ asset: card as Asset, index }))

  // Sort by value (best first)
  assetsInHand.sort((a, b) => {
    const valA = assetMarketValue(a.asset, state.market) + a.asset.silver
    const valB = assetMarketValue(b.asset, state.market) + b.asset.silver
    return valB - valA
  })

  for (const { asset, index } of assetsInHand) {
    if (assetsBought >= maxAssets) break
    if (asset.gold > cash) continue

    // CSO can only buy red/green
    if (botPlayer.character === 'cso' && !canCSOBuyAsset(asset)) continue

    // CSO budget check
    if (botPlayer.character === 'cso') {
      const cost = getCSOAssetCost(asset.color)
      if (cost > (maxAssets - assetsBought)) continue
    }

    const marketVal = assetMarketValue(asset, state.market)

    if (difficulty === 'medium') {
      // Medium: buy if it seems decent (60% threshold)
      if (marketVal + asset.silver >= 2 || maybe(0.4)) {
        actions.push({ type: 'buy_asset', handIndex: index })
        cash -= asset.gold
        assetsBought++
      }
    } else {
      // Hard: buy if market value is positive or if we need assets for game end
      if (marketVal + asset.silver >= 1 || botPlayer.assets.length >= 4) {
        actions.push({ type: 'buy_asset', handIndex: index })
        cash -= asset.gold
        assetsBought++
      }
    }
  }

  // Issue liabilities for cash
  const liabilitiesInHand = hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => 'rfr_type' in card)
    .map(({ card, index }) => ({ liability: card as Liability, index }))

  for (const { liability, index } of liabilitiesInHand) {
    if (liabilitiesIssued >= maxLiabilities) break

    if (difficulty === 'medium') {
      // Medium: issue if we need cash
      if (cash < 2 || maybe(0.3)) {
        actions.push({ type: 'issue_liability', handIndex: index })
        cash += liability.gold
        liabilitiesIssued++
      }
    } else {
      // Hard: issue short-term liabilities preferentially, only when needed
      const isShortTerm = liability.rfr_type === 'short_term'

      if (cash < 3 || (isShortTerm && state.market.rfr <= 2)) {
        actions.push({ type: 'issue_liability', handIndex: index })
        cash += liability.gold
        liabilitiesIssued++
      }
    }
  }

  // CFO: redeem liabilities if it's profitable
  if (botPlayer.character === 'cfo' && botPlayer.liabilities.length > 0) {
    for (let i = 0; i < botPlayer.liabilities.length; i++) {
      const liability = botPlayer.liabilities[i]
      const cost = liability.rfr_type === 'short_term'
        ? liability.gold + state.market.rfr
        : liability.gold + state.market.rfr + state.market.mrp

      if (difficulty === 'hard' && cash >= cost && cost <= liability.gold + 1) {
        actions.push({ type: 'use_ability', liabilityIndex: i })
        cash -= cost
        break // Redeem one at a time
      } else if (difficulty === 'medium' && cash >= cost && maybe(0.3)) {
        actions.push({ type: 'use_ability', liabilityIndex: i })
        cash -= cost
        break
      }
    }
  }

  actions.push({ type: 'end_turn' })
  return actions
}

// Ability usage decision
function botDecideAbility(
  state: GameState,
  botPlayer: Player,
  difficulty: BotDifficulty
): BotPlayAction | null {
  const character = botPlayer.character
  const otherPlayers = state.players.filter(p => p.user_id !== botPlayer.user_id)

  switch (character) {
    case 'shareholder': {
      // Fire the leading player (by asset count) if they're not banker/regulator
      const targets = otherPlayers.filter(p =>
        p.character && p.character !== 'banker' && p.character !== 'regulator'
      )
      if (targets.length === 0) return null

      if (difficulty === 'medium' && !maybe(0.6)) return null

      // Target the player with most assets
      const sorted = [...targets].sort((a, b) => b.assets.length - a.assets.length)
      return { type: 'use_ability', targetPlayerId: sorted[0].id }
    }

    case 'stakeholder': {
      // Force divestment of a non-CSO player's non-red/green asset
      const targets = otherPlayers.filter(p =>
        p.character !== 'cso' &&
        p.assets.some(a => a.color !== 'green' && a.color !== 'red')
      )
      if (targets.length === 0) return null

      if (difficulty === 'medium' && !maybe(0.5)) return null

      // Target the player with highest value blue/yellow/purple asset
      let bestTarget = targets[0]
      let bestAssetIdx = 0
      let bestValue = -Infinity
      for (const target of targets) {
        for (let i = 0; i < target.assets.length; i++) {
          const asset = target.assets[i]
          if (asset.color === 'green' || asset.color === 'red') continue
          const val = assetMarketValue(asset, state.market) + asset.silver
          if (val > bestValue) {
            bestValue = val
            bestTarget = target
            bestAssetIdx = i
          }
        }
      }
      return { type: 'use_ability', targetPlayerId: bestTarget.id, assetIndex: bestAssetIdx }
    }

    case 'banker': {
      // Terminate credit of the player with most liabilities (not shareholder/regulator)
      const targets = otherPlayers.filter(p =>
        p.character && p.character !== 'shareholder' && p.character !== 'regulator'
      )
      if (targets.length === 0) return null

      if (difficulty === 'medium' && !maybe(0.4)) return null

      const sorted = [...targets].sort((a, b) => b.assets.length - a.assets.length)
      return { type: 'use_ability', targetPlayerId: sorted[0].id }
    }

    case 'regulator': {
      // Swap hands if someone has a much better hand
      if (difficulty === 'medium' && !maybe(0.3)) return null

      const myHandValue = botPlayer.hand.reduce((sum, card) => {
        if ('color' in card) return sum + (card as Asset).gold + (card as Asset).silver
        return sum + (card as Liability).gold
      }, 0)

      let bestTarget: Player | null = null
      let bestHandValue = myHandValue
      for (const target of otherPlayers) {
        const val = target.hand.reduce((sum, card) => {
          if ('color' in card) return sum + (card as Asset).gold + (card as Asset).silver
          return sum + (card as Liability).gold
        }, 0)
        if (val > bestHandValue + 2) {
          bestHandValue = val
          bestTarget = target
        }
      }

      if (bestTarget) {
        return { type: 'use_ability', targetPlayerId: bestTarget.id }
      }

      // Otherwise swap worst cards with deck
      if (botPlayer.hand.length > 0 && difficulty === 'hard') {
        const scores = botPlayer.hand.map((card, idx) => {
          if ('color' in card) {
            const asset = card as Asset
            return { idx, score: assetMarketValue(asset, state.market) + asset.silver }
          }
          return { idx, score: 0 }
        })
        scores.sort((a, b) => a.score - b.score)
        // Swap worst cards (up to 2)
        const toSwap = scores.slice(0, Math.min(2, scores.length)).map(s => s.idx)
        return { type: 'use_ability', cardIndices: toSwap }
      }
      return null
    }

    default:
      return null
  }
}

// Banker target: decide what to sell/pay back
export function botDecideBankerResponse(
  state: GameState,
  botPlayer: Player,
  _difficulty: BotDifficulty
): { assetIndices: number[]; liabilityIndices: number[] } {
  // Pay back the cheapest liability if possible, or sell cheapest asset
  if (botPlayer.liabilities.length > 0) {
    // Find cheapest liability
    let cheapestIdx = 0
    let cheapestCost = Infinity
    for (let i = 0; i < botPlayer.liabilities.length; i++) {
      const l = botPlayer.liabilities[i]
      const cost = l.rfr_type === 'short_term'
        ? l.gold + state.market.rfr
        : l.gold + state.market.rfr + state.market.mrp
      if (cost < cheapestCost) {
        cheapestCost = cost
        cheapestIdx = i
      }
    }
    if (botPlayer.cash >= cheapestCost) {
      return { assetIndices: [], liabilityIndices: [cheapestIdx] }
    }
  }

  // Sell cheapest asset
  if (botPlayer.assets.length > 0) {
    let cheapestIdx = 0
    let cheapestVal = Infinity
    for (let i = 0; i < botPlayer.assets.length; i++) {
      const val = assetMarketValue(botPlayer.assets[i], state.market) + botPlayer.assets[i].silver
      if (val < cheapestVal) {
        cheapestVal = val
        cheapestIdx = i
      }
    }
    return { assetIndices: [cheapestIdx], liabilityIndices: [] }
  }

  return { assetIndices: [], liabilityIndices: [] }
}
