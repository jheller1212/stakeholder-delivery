import type { Asset, Liability, Market } from '../../types/game'

const COLOR_MAP: Record<string, string> = {
  red: 'border-red-500 bg-red-500/10',
  green: 'border-green-500 bg-green-500/10',
  blue: 'border-blue-500 bg-blue-500/10',
  yellow: 'border-yellow-500 bg-yellow-500/10',
  purple: 'border-purple-500 bg-purple-500/10',
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
      className={`${small ? 'p-2' : 'p-3'} rounded-lg border-2 text-left transition-all ${
        COLOR_MAP[asset.color]
      } ${selected ? 'ring-2 ring-white/30 scale-105' : ''} ${
        onClick ? 'hover:scale-105 cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`font-bold ${small ? 'text-sm' : 'text-lg'} text-amber-400`}>
          {asset.gold}g
        </span>
        {asset.silver > 0 && (
          <span className={`${small ? 'text-xs' : 'text-sm'} text-gray-400`}>{asset.silver}s</span>
        )}
      </div>
      <p className={`${small ? 'text-[10px]' : 'text-xs'} text-gray-400 capitalize mt-0.5`}>
        {asset.color}
      </p>
      {marketValue !== undefined && (
        <p className={`${small ? 'text-[10px]' : 'text-xs'} ${modifier > 0 ? 'text-green-400' : modifier < 0 ? 'text-red-400' : 'text-gray-500'}`}>
          Market: {marketValue}g
        </p>
      )}
      {asset.ability && (
        <p className={`${small ? 'text-[10px]' : 'text-xs'} text-purple-300 mt-0.5`}>
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
      className={`${small ? 'p-2' : 'p-3'} rounded-lg border-2 border-gray-500 bg-gray-500/10 text-left transition-all ${
        selected ? 'ring-2 ring-white/30 scale-105' : ''
      } ${onClick ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between">
        <span className={`font-bold ${small ? 'text-sm' : 'text-lg'} text-amber-400`}>
          +{liability.gold}g
        </span>
      </div>
      <p className={`${small ? 'text-[10px]' : 'text-xs'} text-gray-400 capitalize mt-0.5`}>
        {liability.rfr_type.replace('_', ' ')}
      </p>
      {cost !== undefined && (
        <p className={`${small ? 'text-[10px]' : 'text-xs'} text-red-400`}>
          Cost: -{cost}g
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
