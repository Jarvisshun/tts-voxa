interface ConfirmDeleteModalProps {
  open: boolean
  message?: string
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmDeleteModal({ open, message, onCancel, onConfirm }: ConfirmDeleteModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-900 mb-2">确认删除</h3>
        <p className="text-sm text-gray-500 mb-5">{message || '确定删除此记录？删除后无法恢复。'}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-all">
            取消
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all">
            删除
          </button>
        </div>
      </div>
    </div>
  )
}
