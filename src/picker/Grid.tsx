import type { Layout } from './layout'
import type { PickerOption } from './types'
import { Box } from 'ink'
import React from 'react'
import { Cell } from './Cell'

interface Props {
  options: PickerOption[]
  cursor: number
  scroll: number
  layout: Layout
}

export function Grid({ options, cursor, scroll, layout }: Props) {
  const { columns, visibleRows, cellW, cellH, cardW } = layout
  const rows: React.ReactNode[] = []
  const startRow = scroll
  const endRow = scroll + visibleRows

  for (let r = startRow; r < endRow; r++) {
    const cells: React.ReactNode[] = []
    for (let c = 0; c < columns; c++) {
      const idx = r * columns + c
      if (idx >= options.length)
        break
      cells.push(
        <Cell
          key={idx}
          option={options[idx]}
          selected={idx === cursor}
          cardW={cardW}
          cellW={cellW}
          cellH={cellH}
        />,
      )
    }
    if (cells.length === 0)
      break
    rows.push(
      <Box key={r} flexDirection="row" marginBottom={-1}>
        {cells}
      </Box>,
    )
  }

  return <Box flexDirection="column">{rows}</Box>
}
