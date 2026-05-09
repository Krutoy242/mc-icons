import { Text } from 'ink'
import React, { useEffect, useState } from 'react'
import { PLACEHOLDER_LINES, renderImageLines } from './render'

interface Props {
  path?: string
}

export function Image({ path }: Props) {
  const [lines, setLines] = useState<string[]>(PLACEHOLDER_LINES)

  useEffect(() => {
    if (!path) {
      setLines(PLACEHOLDER_LINES)
      return
    }
    let cancelled = false
    renderImageLines(path).then((result) => {
      if (!cancelled)
        setLines(result)
    })
    return () => {
      cancelled = true
    }
  }, [path])

  return <Text>{lines.join('\n')}</Text>
}
