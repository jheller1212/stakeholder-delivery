import type { GameState } from '../types/game'
import {
  selectCharacter, drawCard, putBackCard, buyAsset, issueLiability,
  endTurn, fireCharacter, divestAsset, swapHands, swapWithDeck,
  terminateCredit, payBanker, redeemLiability, confirmAssetAbilities,
} from './gameService'
import {
  isBotPlayer,
  botSelectCharacter,
  botDecideDrawType,
  botDecidePutBack,
  botDecidePlayActions,
  botDecideBankerResponse,
  type BotDifficulty,
  type BotPlayAction,
} from './botEngine'
import { getDrawCount, getPutBackCount } from './gameEngine'

// Track which actions are in-flight to prevent double-execution
const pendingBots = new Set<string>()

// Delay between bot actions (ms) for visual pacing
const ACTION_DELAY = 1200
const ABILITY_DELAY = 800

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Map of bot user_id -> difficulty
const botDifficulties = new Map<string, BotDifficulty>()

export function registerBot(userId: string, difficulty: BotDifficulty): void {
  botDifficulties.set(userId, difficulty)
}

export function unregisterBot(userId: string): void {
  botDifficulties.delete(userId)
}

export function getBotDifficulty(userId: string): BotDifficulty | undefined {
  return botDifficulties.get(userId)
}

// Main entry: check if a bot needs to act, and execute
export async function processBotTurn(gameId: string, state: GameState): Promise<void> {
  // Character selection: all bots need to pick
  if (state.phase === 'character_selection') {
    for (const player of state.players) {
      if (!isBotPlayer(player.user_id)) continue
      if (player.character) continue // Already selected
      const difficulty = botDifficulties.get(player.user_id)
      if (!difficulty) continue

      const key = `${player.user_id}-charselect-${state.turn_number}`
      if (pendingBots.has(key)) continue
      pendingBots.add(key)

      try {
        await sleep(ACTION_DELAY)
        const character = botSelectCharacter(state, player, difficulty)
        await selectCharacter(gameId, player.user_id, character)
      } catch (err) {
        console.warn(`Bot ${player.name} character select failed:`, err)
      } finally {
        pendingBots.delete(key)
      }
    }
    return
  }

  // Handle asset_abilities phase: bots auto-confirm (skip using abilities for simplicity)
  if (state.phase === 'asset_abilities') {
    if (state.current_player_index === null) return
    const abilityPlayer = state.players[state.current_player_index]
    if (!abilityPlayer || !isBotPlayer(abilityPlayer.user_id)) return

    const key = `${abilityPlayer.user_id}-asset_abilities-${state.turn_number}`
    if (pendingBots.has(key)) return
    pendingBots.add(key)

    try {
      await sleep(ACTION_DELAY)
      await confirmAssetAbilities(gameId, abilityPlayer.user_id)
    } catch (err) {
      console.warn(`Bot ${abilityPlayer.name} asset abilities confirm failed:`, err)
    } finally {
      pendingBots.delete(key)
    }
    return
  }

  // Handle banker_target phase: the targeted player (possibly a bot) must respond
  if (state.phase === 'banker_target') {
    const bankerTarget = (state as unknown as Record<string, unknown>)._bankerTarget as string | null
    if (bankerTarget) {
      const targetPlayer = state.players.find(p => p.id === bankerTarget)
      if (targetPlayer && isBotPlayer(targetPlayer.user_id)) {
        const targetDifficulty = botDifficulties.get(targetPlayer.user_id)
        if (targetDifficulty) {
          const key = `${targetPlayer.user_id}-banker_target-${state.turn_number}`
          if (!pendingBots.has(key)) {
            pendingBots.add(key)
            try {
              await executeBotBankerResponse(gameId, state, targetPlayer, targetDifficulty)
            } catch (err) {
              console.warn(`Bot ${targetPlayer.name} banker response failed:`, err)
            } finally {
              pendingBots.delete(key)
            }
          }
        }
      }
    }
    return
  }

  // Check if current player is a bot
  if (state.current_player_index === null) return
  const currentPlayer = state.players[state.current_player_index]
  if (!currentPlayer || !isBotPlayer(currentPlayer.user_id)) return

  const difficulty = botDifficulties.get(currentPlayer.user_id)
  if (!difficulty) return

  const key = `${currentPlayer.user_id}-${state.phase}-${state.turn_number}`
  if (pendingBots.has(key)) return
  pendingBots.add(key)

  try {
    switch (state.phase) {
      case 'drawing':
        await executeBotDrawPhase(gameId, state, currentPlayer, difficulty)
        break
      case 'playing':
        await executeBotPlayPhase(gameId, state, currentPlayer, difficulty)
        break
    }
  } catch (err) {
    console.warn(`Bot ${currentPlayer.name} action failed:`, err)
  } finally {
    pendingBots.delete(key)
  }
}

async function executeBotDrawPhase(
  gameId: string,
  state: GameState,
  player: typeof state.players[0],
  difficulty: BotDifficulty
): Promise<void> {
  const drawCount = getDrawCount(player.character)
  const putBackCount = getPutBackCount(player.character)
  const totalDrawn = player.total_cards_drawn

  // Draw cards
  if (totalDrawn < drawCount) {
    for (let i = totalDrawn; i < drawCount; i++) {
      await sleep(ACTION_DELAY)
      const cardType = botDecideDrawType(state, player, difficulty)
      await drawCard(gameId, player.user_id, cardType)
    }
  }

  // Put back cards
  // Note: we need fresh state after draws, but since we're making sequential calls
  // and Firestore is consistent, the put-back logic runs against the updated state
  for (let i = 0; i < putBackCount; i++) {
    await sleep(ACTION_DELAY)
    const putBackIdx = botDecidePutBack(state, player, difficulty)
    await putBackCard(gameId, player.user_id, putBackIdx)
  }
}

async function executeBotPlayPhase(
  gameId: string,
  state: GameState,
  player: typeof state.players[0],
  difficulty: BotDifficulty
): Promise<void> {
  const actions = botDecidePlayActions(state, player, difficulty)

  for (const action of actions) {
    await sleep(action.type === 'use_ability' ? ABILITY_DELAY : ACTION_DELAY)

    try {
      switch (action.type) {
        case 'buy_asset':
          if (action.handIndex !== undefined) {
            await buyAsset(gameId, player.user_id, action.handIndex)
          }
          break

        case 'issue_liability':
          if (action.handIndex !== undefined) {
            await issueLiability(gameId, player.user_id, action.handIndex)
          }
          break

        case 'use_ability':
          await executeBotAbility(gameId, state, player, action)
          break

        case 'end_turn':
          await endTurn(gameId, player.user_id)
          break
      }
    } catch (err) {
      console.warn(`Bot ${player.name} action ${action.type} failed:`, err)
      // If an action fails, try to end turn
      if (action.type !== 'end_turn') {
        try {
          await endTurn(gameId, player.user_id)
        } catch {
          // Give up
        }
        return
      }
    }
  }
}

async function executeBotAbility(
  gameId: string,
  state: GameState,
  player: typeof state.players[0],
  action: BotPlayAction
): Promise<void> {
  const character = player.character

  switch (character) {
    case 'shareholder':
      if (action.targetPlayerId) {
        await fireCharacter(gameId, player.user_id, action.targetPlayerId)
      }
      break

    case 'stakeholder':
      if (action.targetPlayerId && action.assetIndex !== undefined) {
        await divestAsset(gameId, player.user_id, action.targetPlayerId, action.assetIndex)
      }
      break

    case 'banker':
      if (action.targetPlayerId) {
        await terminateCredit(gameId, player.user_id, action.targetPlayerId)
      }
      break

    case 'regulator':
      if (action.targetPlayerId) {
        await swapHands(gameId, player.user_id, action.targetPlayerId)
      } else if (action.cardIndices && action.cardIndices.length > 0) {
        await swapWithDeck(gameId, player.user_id, action.cardIndices)
      }
      break

    case 'cfo':
      if (action.liabilityIndex !== undefined) {
        await redeemLiability(gameId, player.user_id, action.liabilityIndex)
      }
      break
  }
}

async function executeBotBankerResponse(
  gameId: string,
  state: GameState,
  player: typeof state.players[0],
  difficulty: BotDifficulty
): Promise<void> {
  await sleep(ACTION_DELAY)
  const response = botDecideBankerResponse(state, player, difficulty)
  await payBanker(gameId, player.user_id, response.assetIndices, response.liabilityIndices)
}
