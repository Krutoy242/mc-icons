import type { PickerOpts } from './types'
import { render } from 'ink'
import React from 'react'
import { Picker } from './Picker'

export type { PickerOption, PickerOpts } from './types'

export function pick(opts: PickerOpts): Promise<number | undefined> {
  return new Promise((resolve) => {
    let resolved = false
    let instance: ReturnType<typeof render> | undefined

    const finish = (value: number | undefined) => {
      if (resolved)
        return
      resolved = true
      resolve(value)
      instance?.unmount()
    }

    instance = render(
      React.createElement(Picker, {
        prompt: opts.prompt,
        options: opts.options,
        onResolve: finish,
      }),
      { exitOnCtrlC: false },
    )
  })
}
