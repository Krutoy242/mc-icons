import type { PickerOption } from './types'
import chalk from 'chalk'
import { Text } from 'ink'

interface Props {
  option: PickerOption
  selected: boolean
}

export function CompactRow({ option, selected }: Props) {
  const name = chalk.green(option.name)
  const caption = option.caption ? chalk.rgb(0, 158, 145)(option.caption) : ''
  const foot = option.footnote ? ` ${chalk.rgb(33, 173, 204)(option.footnote)}` : ''
  const text = `[${name}] <${caption}>${foot}`
  if (selected) {
    return <Text inverse>{`›${text}`}</Text>
  }
  return <Text>{` ${text}`}</Text>
}
