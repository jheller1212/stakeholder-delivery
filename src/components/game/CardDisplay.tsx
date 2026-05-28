import type { Asset, Liability, Market } from '../../types/game'

const COLOR_MAP: Record<string, string> = {
  red: 'border-red-500/60 bg-red-950/40',
  green: 'border-green-500/60 bg-green-950/40',
  blue: 'border-blue-500/60 bg-blue-950/40',
  yellow: 'border-yellow-500/60 bg-yellow-950/40',
  purple: 'border-purple-500/60 bg-purple-950/40',
}

const COLOR_LABEL: Record<string, string> = {
  red: 'text-red-400',
  green: 'text-green-400',
  blue: 'text-blue-400',
  yellow: 'text-yellow-400',
  purple: 'text-purple-400',
}

export function isAsset(card: Asset | Liability): card is Asset {
  return 'color' in card
}

interface AssetCardProps {
  asset: Asset
  market?: Market
  onClick?: () => void
  selected?: boolean
  small?: boolean
}

export function AssetCard({ asset, market, onClick, selected, small }: AssetCardProps) {
  const condition = market ? market[asset.color] : undefined
  const modifier = condition === 'plus' ? 1 : condition === 'minus' ? -1 : 0
  const marketValue = market ? asset.gold + modifier : undefined

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`${small ? 'p-1.5 min-w-14' : 'p-2.5 min-w-24'} rounded-lg border-2 text-left transition-all ${
        COLOR_MAP[asset.color]
      } ${selected ? 'ring-2 ring-white/20 scale-105 brightness-110' : ''} ${
        onClick ? 'hover:scale-105 hover:brightness-110 cursor-pointer' : 'cursor-default'
      }`}
    >
      {/* Color label */}
      <p className={`${small ? 'text-[9px]' : 'text-[10px]'} font-semibold uppercase tracking-wider ${COLOR_LABEL[asset.color]}`}>
        {asset.color}
      </p>
      {/* Gold value */}
      <div className="flex items-center gap-1 mt-0.5">
        <span className={`${small ? 'text-sm' : 'text-base'} font-bold text-amber-400`}>{asset.gold}</span>
        <span className={`${small ? 'text-[9px]' : 'text-[10px]'} text-amber-400/70`}>gold</span>
      </div>
      {/* Silver value */}
      {asset.silver > 0 && (
        <div className="flex items-center gap-1">
          <span className={`${small ? 'text-xs' : 'text-sm'} font-semibold text-gray-400`}>{asset.silver}</span>
          <span className={`${small ? 'text-[9px]' : 'text-[10px]'} text-gray-500`}>silver</span>
        </div>
      )}
      {/* Market value */}
      {marketValue !== undefined && (
        <p className={`${small ? 'text-[9px]' : 'text-[10px]'} mt-1 ${modifier > 0 ? 'text-green-400' : modifier < 0 ? 'text-red-400' : 'text-gray-600'}`}>
          Market: {marketValue}
        </p>
      )}
      {/* Ability */}
      {asset.ability && (
        <p className={`${small ? 'text-[8px]' : 'text-[9px]'} text-purple-300/70 mt-0.5 italic`}>
          {asset.ability.replace(/_/g, ' ')}
        </p>
      )}
    </button>
  )
}

interface LiabilityCardProps {
  liability: Liability
  market?: Market
  onClick?: () => void
  selected?: boolean
  small?: boolean
}

export function LiabilityCard({ liability, market, onClick, selected, small }: LiabilityCardProps) {
  const cost = market
    ? liability.rfr_type === 'short_term'
      ? liability.gold + market.rfr
      : liability.gold + market.rfr + market.mrp
    : undefined

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`${small ? 'p-1.5 min-w-14' : 'p-2.5 min-w-24'} rounded-lg border-2 border-gray-600/40 bg-gray-900/60 text-left transition-all ${
        selected ? 'ring-2 ring-white/20 scale-105 brightness-110' : ''
      } ${onClick ? 'hover:scale-105 hover:brightness-110 cursor-pointer' : 'cursor-default'}`}
    >
      {/* Type label */}
      <p className={`${small ? 'text-[9px]' : 'text-[10px]'} font-semibold uppercase tracking-wider text-gray-500`}>
        {liability.rfr_type === 'short_term' ? 'Short term' : 'Long term'}
      </p>
      {/* Cash gain */}
      <div className="flex items-center gap-1 mt-0.5">
        <span className={`${small ? 'text-sm' : 'text-base'} font-bold text-amber-400`}>+{liability.gold}</span>
        <span className={`${small ? 'text-[9px]' : 'text-[10px]'} text-amber-400/70`}>gold</span>
      </div>
      {/* Cost at end */}
      {cost !== undefined && (
        <p className={`${small ? 'text-[9px]' : 'text-[10px]'} text-red-400/70 mt-1`}>
          Costs: {cost} gold
        </p>
      )}
    </button>
  )
}

interface HandCardProps {
  card: Asset | Liability
  market?: Market
  onClick?: () => void
  selected?: boolean
  small?: boolean
}

export function HandCard({ card, market, onClick, selected, small }: HandCardProps) {
  if (isAsset(card)) {
    return <AssetCard asset={card} market={market} onClick={onClick} selected={selected} small={small} />
  }
  return <LiabilityCard liability={card} market={market} onClick={onClick} selected={selected} small={small} />
}
