import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { getRecentTasks, getBatchStatus } from '../api/client'

export interface TaskItem {
  id: string
  type: 'tts' | 'clone' | 'design' | 'batch'
  status: 'pending' | 'running' | 'completed' | 'failed'
  textPreview: string
  createdAt: string
  progress?: { current: number; total: number }
}

interface TaskContextValue {
  tasks: TaskItem[]
  addTask: (task: TaskItem) => void
  updateTask: (id: string, updates: Partial<TaskItem>) => void
  removeTask: (id: string) => void
  refreshTasks: () => Promise<void>
}

const TaskContext = createContext<TaskContextValue | null>(null)

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addTask = useCallback((task: TaskItem) => {
    setTasks(prev => {
      if (prev.some(t => t.id === task.id)) return prev
      return [task, ...prev]
    })
  }, [])

  const updateTask = useCallback((id: string, updates: Partial<TaskItem>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }, [])

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [])

  const refreshTasks = useCallback(async () => {
    try {
      const resp = await getRecentTasks(30)
      if (resp.success) {
        setTasks(prev => {
          const dbTasks: TaskItem[] = resp.data
          // Keep in-memory tasks that aren't in DB (e.g. active TTS/clone/design tasks)
          const memOnly = prev.filter(t => !dbTasks.some(d => d.id === t.id))
          // DB tasks first (they have persisted state), then in-memory-only tasks
          return [...dbTasks, ...memOnly]
        })
      }
    } catch {}
  }, [])

  // Hydrate on mount
  useEffect(() => { refreshTasks() }, [refreshTasks])

  // Poll active batch jobs — only when there are active batches
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  useEffect(() => {
    const hasActive = tasks.some(t => t.type === 'batch' && (t.status === 'pending' || t.status === 'running'))
    if (!hasActive) {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
      return
    }

    const pollBatches = async () => {
      const activeBatches = tasksRef.current.filter(t => t.type === 'batch' && (t.status === 'pending' || t.status === 'running'))
      if (activeBatches.length === 0) return

      for (const batch of activeBatches) {
        try {
          const resp = await getBatchStatus(batch.id)
          if (resp.success) {
            const d = resp.data
            updateTask(batch.id, {
              status: d.status,
              progress: { current: d.completed_items, total: d.total_items },
            })
          }
        } catch (e) { console.warn('Batch poll failed:', e) }
      }
    }

    pollingRef.current = window.setInterval(pollBatches, 2000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [tasks, updateTask])

  return (
    <TaskContext.Provider value={{ tasks, addTask, updateTask, removeTask, refreshTasks }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTasks() {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useTasks must be used within TaskProvider')
  return ctx
}
