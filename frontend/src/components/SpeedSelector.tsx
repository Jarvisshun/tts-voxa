interface SpeedSelectorProps {
  value: number
  onChange: (speed: number) => void
  presets?: number[]
}

const DEFAULT_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

export default function SpeedSelector({ value, onChange, presets = DEFAULT_PRESETS }: SpeedSelectorProps) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
        语速 <span className="text-indigo-500 normal-case font-medium">{value.toFixed(1)}x</span>
      </label>
      <div className="flex gap-1">
        {presets.map(s => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              Math.abs(value - s) < 0.01
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}
