import _ from 'lodash'
import { NameMap } from 'mc-gatherer/build/main/from/jeie/NameMap'

import { getIcon } from '..'

export function generateNames(nameMap: NameMap) {
  const result: {
    [name: string]: string[]
  } = {}

  // Make a tree from all Item names
  Object.entries(nameMap).forEach(([k, v]) => {
    if (k === 'info') return
    const data = v as NameMap[keyof NameMap]
    const [source, entry, meta] = k.split(':')
    const snbt = data.tag ?? ''
    if (source === 'ore') return // Skip ores

    const display = data.name.replace(/§./g, '')
    const fullId =
      [source, entry].join(':') +
      (meta || snbt ? ':' + (meta ?? 0) : '') +
      (snbt ? ':' + snbt : '')
    ;(result[display] ??= []).push(fullId)
  })

  function getBase(fullId: string): Parameters<typeof getIcon>[0] {
    const [source, entry, meta, ...rest] = fullId.split(':')
    return [source, entry, meta, rest.join(':')]
  }

  // Remove duplicates
  Object.entries(result).forEach(([name, items]) => {
    const uniq = _.uniqBy(
      items.map((i) => ({ item: i, path: getIcon(getBase(i)) })),
      'path'
    )
    result[name] = uniq.map((u) => u.item)
  })

  return result
}
