import { useReducer } from 'react'

export interface NavMeta {
  total: number
  columns: number
  visibleRows: number
}

export interface NavState {
  cursor: number
  scroll: number
}

export type NavKey = 'up' | 'down' | 'left' | 'right'

export function step(state: NavState, key: NavKey, meta: NavMeta): NavState {
  const { total, columns, visibleRows } = meta
  if (total <= 0)
    return state

  const cur = Math.min(state.cursor, total - 1)
  const row = Math.floor(cur / columns)
  const col = cur % columns
  const lastRow = Math.floor((total - 1) / columns)

  let nextCursor = cur

  switch (key) {
    case 'left': {
      if (col > 0) {
        nextCursor = cur - 1
      }
      else {
        const rowStart = row * columns
        const rowEnd = Math.min(rowStart + columns - 1, total - 1)
        nextCursor = rowEnd
      }
      break
    }
    case 'right': {
      const rowStart = row * columns
      const rowEnd = Math.min(rowStart + columns - 1, total - 1)
      nextCursor = cur < rowEnd ? cur + 1 : rowStart
      break
    }
    case 'up': {
      if (row > 0)
        nextCursor = (row - 1) * columns + col
      break
    }
    case 'down': {
      if (row < lastRow) {
        const target = (row + 1) * columns + col
        nextCursor = Math.min(target, total - 1)
      }
      break
    }
  }

  const nextRow = Math.floor(nextCursor / columns)
  let scroll = state.scroll
  if (nextRow < scroll)
    scroll = nextRow
  else if (nextRow >= scroll + visibleRows)
    scroll = nextRow - visibleRows + 1
  scroll = Math.max(0, Math.min(scroll, Math.max(0, lastRow - visibleRows + 1)))

  return { cursor: nextCursor, scroll }
}

type Action = { type: 'key', key: NavKey, meta: NavMeta } | { type: 'reset', meta: NavMeta }

function reducer(state: NavState, action: Action): NavState {
  if (action.type === 'reset') {
    if (state.cursor < action.meta.total)
      return state
    return { cursor: 0, scroll: 0 }
  }
  return step(state, action.key, action.meta)
}

export function useGridNavigation(meta: NavMeta) {
  const [state, dispatch] = useReducer(reducer, { cursor: 0, scroll: 0 })
  return {
    cursor: Math.min(state.cursor, Math.max(0, meta.total - 1)),
    scroll: state.scroll,
    onKey: (key: NavKey) => dispatch({ type: 'key', key, meta }),
  }
}
