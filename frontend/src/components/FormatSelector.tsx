interface FormatSelectorProps {
  value: string
  onChange: (format: string) => void
  options?: string[]
  color?: 'indigo' | 'violet'
}

export default function FormatSelector({ value, onChange, options = ['wav', 'mp3', 'pcm'], color = 'indigo' }: FormatSelectorProps) {
  const activeColor = color === 'violet' ? 'bg-violet-500 shadow-violet-200' : 'bg-indigo-500 shadow-indigo-200'

  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">输出格式</label>
      <div className="flex gap-1.5">
        {options.map(f => (
          <button
            key={f}
            onClick={() => onChange(f)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              value === f
                ? `${activeColor} text-white shadow-sm`
                : 'bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200/70'
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
