import type { PickerOpts } from './types'
import { render } from 'ink'
import React from 'react'
import { Picker } from './Picker'

export type { PickerOption, PickerOpts } from './types'

export function pick(opts: PickerOpts): Promise<number | undefined> {
  return new Promise((resolve) => {
    let resolved = false
    let value: number | undefined
    let instance: ReturnType<typeof render> | undefined

    const finish = (chosen: number | undefined) => {
      if (resolved)
        return
      resolved = true
      value = chosen
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

    // Resolve only after Ink has fully torn down (raw mode off, cursor
    // restored, final frame flushed). Otherwise downstream terminal output
    // interleaves with Ink's teardown escapes and renders as ANSI garbage.
    instance.waitUntilExit().then(() => resolve(value))
  })
}
