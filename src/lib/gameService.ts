import { doc, setDoc, onSnapshot, getDoc, runTransaction } from 'firebase/firestore'
import { db } from './firebase'
import { createInitialGameState } from './gameEngine'
import type { GameState, Character, Asset, Liability } from '../types/game'

// Create a new game from lobby players
export async function createGame(
  gameId: string,
  roomCode: string,
  players: { user_id: string; name: string }[]
): Promise<GameState> {
  const state = createInitialGameState(gameId, roomCode, players)
  await setDoc(doc(db, 'games', gameId), state)
  return state
}

// Subscribe to game state changes
export function subscribeToGame(
  gameId: string,
  callback: (state: GameState) => void
): () => void {
  return onSnapshot(doc(db, 'games', gameId), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as GameState)
    }
  })
}

// Get current game state
export async function getGameState(gameId: string): Promise<GameState | null> {
  const snapshot = await getDoc(doc(db, 'games', gameId))
  return snapshot.exists() ? (snapshot.data() as GameState) : null
}

// Select a character (during character_selection phase)
export async function selectCharacter(gameId: string, userId: string, character: Character): Promise<void> {
  const gameRef = doc(db, 'games', gameId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef)
    if (!snapshot.exists()) throw new Error('Game not found')

    const state = snapshot.data() as GameState & { _availableCharacters: Character[] }
    if (state.phase !== 'character_selection') throw new Error('Not in character selection phase')

    const playerIndex = state.players.findIndex(p => p.user_id === userId)
    if (playerIndex === -1) throw new Error('Player not found')
    if (state.players[playerIndex].character) throw new Error('Already selected a character')

    const availIdx = state._availableCharacters.indexOf(character)
    if (availIdx === -1) throw new Error('Character not available')

    // Update player's character
    const players = [...state.players]
    players[playerIndex] = { ...players[playerIndex], character }

    // Remove from available
    const available = [...state._availableCharacters]
    available.splice(availIdx, 1)

    // Check if all players have selected
    const allSelected = players.every(p => p.character)

    transaction.update(gameRef, {
      players,
      _availableCharacters: available,
      phase: allSelected ? 'drawing' : 'character_selection',
      current_player_index: allSelected ? 0 : state.current_player_index,
    })
  })
}

// Draw a card
export async function drawCard(gameId: string, userId: string, cardType: 'asset' | 'liability'): Promise<void> {
  const gameRef = doc(db, 'games', gameId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef)
    if (!snapshot.exists()) throw new Error('Game not found')

    const state = snapshot.data() as GameState & {
      _assetDeck: unknown[]
      _liabilityDeck: unknown[]
      _marketEventDeck: unknown[]
    }

    if (state.phase !== 'drawing') throw new Error('Not in drawing phase')

    const playerIndex = state.players.findIndex(p => p.user_id === userId)
    if (playerIndex === -1) throw new Error('Player not found')
    if (state.current_player_index !== playerIndex) throw new Error('Not your turn')

    const player = { ...state.players[playerIndex] }
    const hand = [...player.hand]
    const cardsDrawn = [...player.cards_drawn]

    const deck = cardType === 'asset' ? [...state._assetDeck] : [...state._liabilityDeck]
    if (deck.length === 0) throw new Error('Deck is empty')

    const card = deck.pop()! as Asset | Liability
    hand.push(card)
    cardsDrawn.push(hand.length - 1)

    player.hand = hand
    player.cards_drawn = cardsDrawn
    player.total_cards_drawn = player.total_cards_drawn + 1

    const players = [...state.players]
    players[playerIndex] = player

    const updates: Record<string, unknown> = { players }
    if (cardType === 'asset') {
      updates._assetDeck = deck
    } else {
      updates._liabilityDeck = deck
    }

    // Check if player has drawn enough cards
    const drawCount = player.character === 'head_of_rnd' ? 6 : 3
    if (player.total_cards_drawn >= drawCount) {
      // Move to put-back phase (still 'drawing' but cards_drawn tracks it)
    }

    transaction.update(gameRef, updates)
  })
}

// Put back a card from hand
export async function putBackCard(gameId: string, userId: string, handIndex: number): Promise<void> {
  const gameRef = doc(db, 'games', gameId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef)
    if (!snapshot.exists()) throw new Error('Game not found')

    const state = snapshot.data() as GameState & {
      _assetDeck: unknown[]
      _liabilityDeck: unknown[]
    }

    const playerIndex = state.players.findIndex(p => p.user_id === userId)
    if (playerIndex === -1) throw new Error('Player not found')

    const player = { ...state.players[playerIndex] }
    const hand = [...player.hand]

    if (handIndex < 0 || handIndex >= hand.length) throw new Error('Invalid card index')

    // Remove card from hand and put back to appropriate deck
    const [card] = hand.splice(handIndex, 1)
    player.hand = hand

    const players = [...state.players]
    players[playerIndex] = player

    const updates: Record<string, unknown> = { players }

    // Put card back to bottom of appropriate deck
    if ('color' in card) {
      updates._assetDeck = [card, ...state._assetDeck]
    } else {
      updates._liabilityDeck = [card, ...state._liabilityDeck]
    }

    // cards_drawn tracks indices of newly drawn cards; each put-back reduces it
    const remainingDrawn = player.cards_drawn.filter(idx => idx !== handIndex && idx < hand.length)
    player.cards_drawn = remainingDrawn

    players[playerIndex] = player
    updates.players = players

    // Move to playing phase if enough cards put back
    if (remainingDrawn.length === 0) {
      updates.phase = 'playing'
    }

    transaction.update(gameRef, updates)
  })
}

// Stakeholder ability: Force divestment of an asset
export async function divestAsset(gameId: string, userId: string, targetPlayerId: string, assetIndex: number): Promise<void> {
  const gameRef = doc(db, 'games', gameId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef)
    if (!snapshot.exists()) throw new Error('Game not found')

    const state = snapshot.data() as GameState

    const playerIndex = state.players.findIndex(p => p.user_id === userId)
    const player = state.players[playerIndex]
    if (player.character !== 'stakeholder') throw new Error('Not the stakeholder')
    if (player.has_used_ability) throw new Error('Already used ability')

    const targetIndex = state.players.findIndex(p => p.id === targetPlayerId)
    const target = state.players[targetIndex]
    if (!target) throw new Error('Target not found')
    if (target.character === 'cso') throw new Error('Cannot force CSO to divest')

    const asset = target.assets[assetIndex]
    if (!asset) throw new Error('Asset not found')
    if (asset.color === 'green' || asset.color === 'red') throw new Error('Cannot divest green or red assets')

    // Remove asset, give target market value - 1 in cash
    const condition = state.market[asset.color]
    const modifier = condition === 'plus' ? 1 : condition === 'minus' ? -1 : 0
    const marketValue = Math.max(0, asset.gold + modifier - 1)

    const players = state.players.map((p, i) => {
      if (i === playerIndex) return { ...p, has_used_ability: true }
      if (i === targetIndex) {
        const assets = [...p.assets]
        assets.splice(assetIndex, 1)
        return { ...p, assets, cash: p.cash + marketValue }
      }
      return p
    })

    transaction.update(gameRef, { players })
  })
}

// Regulator ability: Swap hands with another player
export async function swapHands(gameId: string, userId: string, targetPlayerId: string): Promise<void> {
  const gameRef = doc(db, 'games', gameId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef)
    if (!snapshot.exists()) throw new Error('Game not found')

    const state = snapshot.data() as GameState

    const playerIndex = state.players.findIndex(p => p.user_id === userId)
    const player = state.players[playerIndex]
    if (player.character !== 'regulator') throw new Error('Not the regulator')
    if (player.has_used_ability) throw new Error('Already used ability')

    const targetIndex = state.players.findIndex(p => p.id === targetPlayerId)
    const target = state.players[targetIndex]
    if (!target) throw new Error('Target not found')

    const players = state.players.map((p, i) => {
      if (i === playerIndex) return { ...p, hand: target.hand, has_used_ability: true }
      if (i === targetIndex) return { ...p, hand: player.hand }
      return p
    })

    transaction.update(gameRef, { players })
  })
}

// Regulator ability: Swap cards with deck
export async function swapWithDeck(gameId: string, userId: string, cardIndices: number[]): Promise<void> {
  const gameRef = doc(db, 'games', gameId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef)
    if (!snapshot.exists()) throw new Error('Game not found')

    const state = snapshot.data() as GameState & {
      _assetDeck: unknown[]
      _liabilityDeck: unknown[]
    }

    const playerIndex = state.players.findIndex(p => p.user_id === userId)
    const player = state.players[playerIndex]
    if (player.character !== 'regulator') throw new Error('Not the regulator')
    if (player.has_used_ability) throw new Error('Already used ability')

    const hand = [...player.hand]
    const assetDeck = [...state._assetDeck]
    const liabilityDeck = [...state._liabilityDeck]

    // Remove selected cards and put back to decks
    const removed = cardIndices
      .sort((a, b) => b - a)
      .map(i => hand.splice(i, 1)[0])

    for (const card of removed) {
      if ('color' in card) {
        assetDeck.unshift(card)
      } else {
        liabilityDeck.unshift(card)
      }
    }

    // Draw same number of new cards (alternating asset/liability)
    for (let i = 0; i < removed.length; i++) {
      const deck = assetDeck.length > 0 ? assetDeck : liabilityDeck
      if (deck.length > 0) {
        hand.push(deck.pop()! as Asset | Liability)
      }
    }

    const players = state.players.map((p, idx) =>
      idx === playerIndex ? { ...p, hand, has_used_ability: true } : p
    )

    transaction.update(gameRef, {
      players,
      _assetDeck: assetDeck,
      _liabilityDeck: liabilityDeck,
    })
  })
}

// Banker ability: Terminate credit line
export async function terminateCredit(gameId: string, userId: string, targetPlayerId: string): Promise<void> {
  const gameRef = doc(db, 'games', gameId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef)
    if (!snapshot.exists()) throw new Error('Game not found')

    const state = snapshot.data() as GameState

    const playerIndex = state.players.findIndex(p => p.user_id === userId)
    const player = state.players[playerIndex]
    if (player.character !== 'banker') throw new Error('Not the banker')
    if (player.has_used_ability) throw new Error('Already used ability')

    const target = state.players.find(p => p.id === targetPlayerId)
    if (!target) throw new Error('Target not found')
    if (target.character === 'shareholder' || target.character === 'regulator') {
      throw new Error('Cannot terminate credit of shareholder or regulator')
    }

    // Mark ability used; target must pay back a liability or sell an asset
    const players = state.players.map(p =>
      p.user_id === userId ? { ...p, has_used_ability: true } : p
    )

    transaction.update(gameRef, {
      players,
      phase: 'banker_target',
      _bankerTarget: targetPlayerId,
    })
  })
}

// Target of banker pays back (sells assets or issues liabilities to cover)
export async function payBanker(gameId: string, userId: string, assetIndices: number[], liabilityIndices: number[]): Promise<void> {
  const gameRef = doc(db, 'games', gameId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef)
    if (!snapshot.exists()) throw new Error('Game not found')

    const state = snapshot.data() as GameState & { _bankerTarget: string }

    const playerIndex = state.players.findIndex(p => p.user_id === userId)
    const player = state.players[playerIndex]
    if (state._bankerTarget !== player.id) throw new Error('Not the banker target')

    // Sell selected assets at market value, pay back selected liabilities
    let cash = player.cash
    const assets = [...player.assets]
    const liabilities = [...player.liabilities]

    // Sell assets (reverse order to maintain indices)
    for (const idx of [...assetIndices].sort((a, b) => b - a)) {
      const asset = assets[idx]
      if (asset) {
        const condition = state.market[asset.color]
        const modifier = condition === 'plus' ? 1 : condition === 'minus' ? -1 : 0
        cash += asset.gold + modifier
        assets.splice(idx, 1)
      }
    }

    // Pay back liabilities (reverse order)
    for (const idx of [...liabilityIndices].sort((a, b) => b - a)) {
      const liability = liabilities[idx]
      if (liability) {
        const cost = liability.rfr_type === 'short_term'
          ? liability.gold + state.market.rfr
          : liability.gold + state.market.rfr + state.market.mrp
        cash -= cost
        liabilities.splice(idx, 1)
      }
    }

    const players = state.players.map((p, i) =>
      i === playerIndex ? { ...p, cash, assets, liabilities } : p
    )

    transaction.update(gameRef, {
      players,
      phase: 'playing',
      _bankerTarget: null,
    })
  })
}

// CFO ability: Redeem a liability
export async function redeemLiability(gameId: string, userId: string, liabilityIndex: number): Promise<void> {
  const gameRef = doc(db, 'games', gameId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef)
    if (!snapshot.exists()) throw new Error('Game not found')

    const state = snapshot.data() as GameState

    const playerIndex = state.players.findIndex(p => p.user_id === userId)
    const player = state.players[playerIndex]
    if (player.character !== 'cfo') throw new Error('Not the CFO')

    const liability = player.liabilities[liabilityIndex]
    if (!liability) throw new Error('Liability not found')

    const cost = liability.rfr_type === 'short_term'
      ? liability.gold + state.market.rfr
      : liability.gold + state.market.rfr + state.market.mrp

    if (player.cash < cost) throw new Error('Not enough cash to redeem')

    const liabilities = [...player.liabilities]
    liabilities.splice(liabilityIndex, 1)

    const players = state.players.map((p, i) =>
      i === playerIndex ? { ...p, cash: p.cash - cost, liabilities } : p
    )

    transaction.update(gameRef, { players })
  })
}

// Buy an asset from hand
// Rule 8: A new market card should be drawn when someone buys the 1st, 2nd, 3rd, 4th, 5th, 7th, or 8th asset (global count)
export async function buyAsset(gameId: string, userId: string, handIndex: number): Promise<void> {
  const gameRef = doc(db, 'games', gameId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef)
    if (!snapshot.exists()) throw new Error('Game not found')

    const state = snapshot.data() as GameState & {
      _marketEventDeck: (import('../types/game').Market | import('../types/game').GameEvent)[]
      _totalAssetsBought?: number
    }

    if (state.phase !== 'playing') throw new Error('Not in playing phase')

    const playerIndex = state.players.findIndex(p => p.user_id === userId)
    if (playerIndex === -1) throw new Error('Player not found')
    if (state.current_player_index !== playerIndex) throw new Error('Not your turn')

    const player = { ...state.players[playerIndex] }
    const hand = [...player.hand]
    const card = hand[handIndex]

    if (!card || !('color' in card)) throw new Error('Not an asset card')
    const assetCard = card as Asset

    // Check if player can afford it
    if (player.cash < assetCard.gold) throw new Error('Not enough cash')

    // Remove from hand, add to assets
    hand.splice(handIndex, 1)
    player.hand = hand
    player.assets = [...player.assets, assetCard]
    player.cash -= assetCard.gold

    const players = [...state.players]
    players[playerIndex] = player

    const updates: Record<string, unknown> = { players }

    // Track global asset buy count for market refresh (Rule 8)
    const newTotalBought = (state._totalAssetsBought || 0) + 1
    updates._totalAssetsBought = newTotalBought

    // Market refreshes at 1st, 2nd, 3rd, 4th, 5th, 7th, 8th asset bought
    const REFRESH_AT = [1, 2, 3, 4, 5, 7, 8]
    if (REFRESH_AT.includes(newTotalBought) && state._marketEventDeck.length > 0) {
      const marketDeck = [...state._marketEventDeck]
      const events: import('../types/game').GameEvent[] = [...state.current_events]

      // Draw cards from market/event deck until we find a Market card
      // Events encountered along the way get added to current_events
      let newMarket = state.market
      while (marketDeck.length > 0) {
        const drawn = marketDeck.pop()!
        if ('rfr' in drawn && 'mrp' in drawn) {
          // It's a Market card
          newMarket = drawn as import('../types/game').Market
          break
        } else {
          // It's an Event card — accumulate it
          events.push(drawn as import('../types/game').GameEvent)
        }
      }
      updates.market = newMarket
      updates.current_events = events
      updates._marketEventDeck = marketDeck
    }

    // Check end game condition (Rule 6)
    if (player.assets.length >= 6 && !state.is_final_round) {
      updates.is_final_round = true
    }

    transaction.update(gameRef, updates)
  })
}

// Issue a liability from hand
export async function issueLiability(gameId: string, userId: string, handIndex: number): Promise<void> {
  const gameRef = doc(db, 'games', gameId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef)
    if (!snapshot.exists()) throw new Error('Game not found')

    const state = snapshot.data() as GameState

    if (state.phase !== 'playing') throw new Error('Not in playing phase')

    const playerIndex = state.players.findIndex(p => p.user_id === userId)
    if (playerIndex === -1) throw new Error('Player not found')
    if (state.current_player_index !== playerIndex) throw new Error('Not your turn')

    const player = { ...state.players[playerIndex] }
    const hand = [...player.hand]
    const card = hand[handIndex]

    if (!card || !('rfr_type' in card)) throw new Error('Not a liability card')

    // Remove from hand, add to liabilities, gain cash
    const [liability] = hand.splice(handIndex, 1)
    player.hand = hand
    player.liabilities = [...player.liabilities, liability as unknown as import('../types/game').Liability]
    player.cash += (liability as { gold: number }).gold

    const players = [...state.players]
    players[playerIndex] = player

    transaction.update(gameRef, { players })
  })
}

// End current player's turn
export async function endTurn(gameId: string, userId: string): Promise<void> {
  const gameRef = doc(db, 'games', gameId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef)
    if (!snapshot.exists()) throw new Error('Game not found')

    const state = snapshot.data() as GameState & { _firedCharacters: Character[] }

    const playerIndex = state.players.findIndex(p => p.user_id === userId)
    if (playerIndex === -1) throw new Error('Player not found')
    if (state.current_player_index !== playerIndex) throw new Error('Not your turn')

    // Reset player turn state
    const players = state.players.map(p => ({
      ...p,
      has_used_ability: false,
      cards_drawn: [] as number[],
      total_cards_drawn: 0,
    }))

    // Find next player (skip fired characters)
    let nextIndex = (playerIndex + 1) % players.length
    const firedChars = state._firedCharacters || []

    // Skip fired players
    let attempts = 0
    while (firedChars.includes(players[nextIndex].character!) && attempts < players.length) {
      nextIndex = (nextIndex + 1) % players.length
      attempts++
    }

    // Check if we've gone around (new round)
    const isNewRound = nextIndex <= playerIndex
    const newTurnNumber = isNewRound ? state.turn_number + 1 : state.turn_number

    // Check if game should end (final round completed)
    if (state.is_final_round && isNewRound) {
      transaction.update(gameRef, {
        players,
        phase: 'results',
        current_player_index: null,
      })
      return
    }

    // Add character bonus cash for next player
    const nextPlayer = players[nextIndex]
    if (nextPlayer.character) {
      const bonusColor: Record<string, string> = {
        head_of_rnd: 'purple',
        ceo: 'yellow',
        cso: 'green',
        cfo: 'blue',
        stakeholder: 'red',
      }
      const color = bonusColor[nextPlayer.character]
      if (color) {
        const bonus = nextPlayer.assets.filter(a => a.color === color).length
        players[nextIndex] = { ...nextPlayer, cash: nextPlayer.cash + bonus }
      }
    }

    transaction.update(gameRef, {
      players,
      current_player_index: nextIndex,
      phase: isNewRound ? 'character_selection' : 'drawing',
      turn_number: newTurnNumber,
      _firedCharacters: isNewRound ? [] : firedChars,
      _availableCharacters: isNewRound
        ? ['head_of_rnd', 'ceo', 'cso', 'cfo', 'shareholder', 'stakeholder', 'regulator', 'banker'].slice(0, Math.min(players.length + 1, 8))
        : (state as unknown as Record<string, unknown>)._availableCharacters,
    })
  })
}

// Use character ability: Fire (Shareholder)
export async function fireCharacter(gameId: string, userId: string, targetPlayerId: string): Promise<void> {
  const gameRef = doc(db, 'games', gameId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef)
    if (!snapshot.exists()) throw new Error('Game not found')

    const state = snapshot.data() as GameState & { _firedCharacters: Character[] }

    const playerIndex = state.players.findIndex(p => p.user_id === userId)
    const player = state.players[playerIndex]
    if (player.character !== 'shareholder') throw new Error('Not the shareholder')
    if (player.has_used_ability) throw new Error('Already used ability')

    const target = state.players.find(p => p.id === targetPlayerId)
    if (!target) throw new Error('Target not found')
    if (target.character === 'banker' || target.character === 'regulator') throw new Error('Cannot fire banker or regulator')

    const players = state.players.map(p =>
      p.user_id === userId ? { ...p, has_used_ability: true } : p
    )

    const firedChars = [...(state._firedCharacters || []), target.character!]

    transaction.update(gameRef, { players, _firedCharacters: firedChars })
  })
}
