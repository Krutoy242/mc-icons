import type { Reducer } from '@committed/trie-search'
import type { DictEntry } from './searcher'

import { TrieSearch } from '@committed/trie-search'

export function getTrieSearch(
  s: string,
  subTrie: TrieSearch<DictEntry>,
): DictEntry[] {
  return subTrie.get(
    s.split(/\s/),
    TrieSearch.UNION_REDUCER as unknown as Reducer<DictEntry>,
  )
}
