import boxen from 'boxen'
import chalk from 'chalk'
import logUpdate from 'log-update'

const defBoxStyle = {
  borderStyle: 'round',
  borderColor: '#062838',
  width: 50,
  padding: { left: 1, right: 1, top: 0, bottom: 0 },
} as const

export function category(category: string) {
  logUpdate.done()
  return (...args: any[]) =>
    logUpdate(
      boxen(args.map(v => chalk.hex('#1d728f')(String(v))).join(' '), {
        ...defBoxStyle,
        title: chalk.hex('#0f5066')(category),
      }),
    )
}
