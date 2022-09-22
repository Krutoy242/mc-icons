import { Reducer, TrieSearch } from '@committed/trie-search'

import { DictEntry } from './searcher'

export function getTrieSearch(
  s: string,
  subTrie: TrieSearch<DictEntry>
): DictEntry[] {
  return subTrie.get(
    s.split(/\s/),
    TrieSearch.UNION_REDUCER as unknown as Reducer<DictEntry>
  )
}
