type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue }

interface JSONObject {
  [k: string]: JSONValue
}
type JSONArray = Array<JSONValue>

declare module '*.json' {
  const value: JSONValue | JSONArray
  export default value
}
