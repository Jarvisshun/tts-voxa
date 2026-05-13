export default function ErrorMessage({ message, className }: { message: string; className?: string }) {
  return (
    <div className={`bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm flex items-center gap-2 ${className || ''}`}>
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
      {message}
    </div>
  )
}
