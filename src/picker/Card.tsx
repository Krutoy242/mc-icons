import type { PickerOption } from './types'
import chalk from 'chalk'
import { Box, Text } from 'ink'

interface Props {
  option: PickerOption
  width: number
}

function truncate(s: string, w: number): string {
  if (s.length <= w)
    return s
  if (w <= 1)
    return s.slice(0, w)
  return `${s.slice(0, w - 1)}…`
}

export function Card({ option, width }: Props) {
  const lines: string[] = [
    chalk.green(truncate(option.name, width)),
    chalk.rgb(0, 98, 143)(truncate(option.modname ?? '', width)),
    chalk.rgb(0, 158, 145)(truncate(option.caption ?? '', width)),
    chalk.rgb(33, 173, 204)(truncate(option.footnote ?? '', width)),
  ]

  return (
    <Box flexDirection="column" width={width} flexShrink={0}>
      {lines.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
    </Box>
  )
}
