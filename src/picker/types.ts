export interface PickerOption {
  name: string
  modname?: string
  caption?: string
  footnote?: string
  imagePath?: string
}

export interface PickerOpts {
  prompt: string
  options: PickerOption[]
}
