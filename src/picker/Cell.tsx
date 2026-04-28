import type { PickerOption } from './types'
import { Box } from 'ink'
import { Card } from './Card'
import { Image } from './Image'

interface Props {
  option: PickerOption
  selected: boolean
  cardW: number
  cellW: number
  cellH: number
}

export function Cell({ option, selected, cardW, cellW, cellH }: Props) {
  const inner = (
    <Box flexDirection="row">
      <Image path={option.imagePath} />
      <Box marginLeft={1}>
        <Card option={option} width={cardW} />
      </Box>
    </Box>
  )

  if (selected) {
    return (
      <Box
        width={cellW}
        height={cellH}
        marginRight={-1}
        borderStyle="round"
        borderColor="white"
      >
        {inner}
      </Box>
    )
  }

  return (
    <Box width={cellW} height={cellH} marginRight={-1} padding={1}>
      {inner}
    </Box>
  )
}
