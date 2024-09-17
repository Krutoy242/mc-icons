import type { NameMap } from 'mc-gatherer/build/main/from/jeie/NameMap'
import _ from 'lodash'

import { getIcon } from '..'

import { asset } from './assets'

export function appendNames(nameMap: NameMap) {
  // Make a tree from all Item names
  Object.entries(nameMap).forEach(([k, v]) => {
    if (k === 'info')
      return
    const data = v as NameMap[keyof NameMap]
    const [source, entry, meta] = k.split(':')
    const snbt = data.tag ?? ''
    if (source === 'ore')
      return // Skip ores

    const display = data.name.replace(/§./g, '')
    const fullId
      = [source, entry].join(':')
      + (meta || snbt ? `:${meta ?? 0}` : '')
      + (snbt ? `:${snbt}` : '')
    ;(asset.names[display] ??= []).push(fullId)
  })

  function getBase(fullId: string): Parameters<typeof getIcon>[0] {
    const [source, entry, meta, ...rest] = fullId.split(':')
    return [source, entry, meta, rest.join(':')]
  }

  // Remove duplicates
  Object.entries(asset.names).forEach(([name, items]) => {
    const uniq = _.uniqBy(
      items.map(i => ({ item: i, path: getIcon(getBase(i)) })),
      'path',
    )
    asset.names[name] = uniq.map(u => u.item)
  })
}
