import type { PickerOption } from './types'
import { Box, Text, useInput, useStdout } from 'ink'
import React, { useEffect, useMemo, useState } from 'react'
import { CompactRow } from './CompactRow'
import { Grid } from './Grid'
import { computeLayout } from './layout'
import { useGridNavigation } from './useGridNavigation'

interface Props {
  prompt: string
  options: PickerOption[]
  onResolve: (index: number | undefined) => void
}

interface Size { columns: number, rows: number }

function getSize(stdout: NodeJS.WriteStream | undefined): Size {
  return {
    columns: stdout?.columns ?? 80,
    rows: stdout?.rows ?? 24,
  }
}

export function Picker({ prompt, options, onResolve }: Props) {
  const { stdout } = useStdout()
  const [size, setSize] = useState<Size>(() => getSize(stdout))

  useEffect(() => {
    if (!stdout)
      return
    const handler = () => setSize(getSize(stdout))
    stdout.on('resize', handler)
    return () => {
      stdout.off('resize', handler)
    }
  }, [stdout])

  const longestName = useMemo(
    () => options.reduce((m, o) => Math.max(m, o.name.length), 0),
    [options],
  )

  const promptLines = prompt.split('\n').length

  const layout = useMemo(
    () => computeLayout({
      termW: size.columns,
      termH: size.rows,
      optionCount: options.length,
      longestName,
      promptLines,
    }),
    [size.columns, size.rows, options.length, longestName, promptLines],
  )

  const { cursor, scroll, onKey } = useGridNavigation({
    total: options.length,
    columns: layout.columns,
    visibleRows: layout.visibleRows,
  })

  useInput((input, key) => {
    if (key.return) {
      onResolve(cursor)
      return
    }
    if (key.escape || input === 'q' || (key.ctrl && input === 'c')) {
      onResolve(undefined)
      return
    }
    if (key.upArrow)
      onKey('up')
    else if (key.downArrow)
      onKey('down')
    else if (key.leftArrow)
      onKey('left')
    else if (key.rightArrow)
      onKey('right')
  })

  if (layout.mode === 'compact') {
    const start = scroll
    const end = Math.min(options.length, scroll + layout.visibleRows)
    const rows: React.ReactNode[] = []
    for (let i = start; i < end; i++) {
      rows.push(
        <CompactRow key={i} option={options[i]} selected={i === cursor} />,
      )
    }
    return (
      <Box flexDirection="column">
        <Text>{prompt}</Text>
        {rows}
        <Text dimColor>↑↓ navigate · Enter select · Esc cancel</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Text>{prompt}</Text>
      <Grid
        options={options}
        cursor={cursor}
        scroll={scroll}
        layout={layout}
      />
      <Text dimColor>↑↓←→ navigate · Enter select · Esc cancel</Text>
    </Box>
  )
}
