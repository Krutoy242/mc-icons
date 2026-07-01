import type { Database as Db } from 'better-sqlite3'
import type { Tree } from './types'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

/** Canonical asset database, sibling of the compiled `build/` dir. */
export const DB_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../assets/assets.db',
)

/**
 * In-memory shape of the whole asset store — the same objects the codebase
 * used to read out of the JSON files.
 */
export interface StoreData {
  images: { [imgHash: string]: string }
  items: Tree<string>
  nbt: { [nbtHash: string]: string }
  mods: { [modId: string]: string }
  modpacks: { [shorthand: string]: string[] }
  names: { [name: string]: string[] }
}

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS images   (hash TEXT PRIMARY KEY, path TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS items    (source TEXT, entry TEXT, meta TEXT, nbtkey TEXT, imghash TEXT);
  CREATE TABLE IF NOT EXISTS nbt      (hash TEXT PRIMARY KEY, snbt TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS mods     (id TEXT PRIMARY KEY, name TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS modpacks (shorthand TEXT, source TEXT);
  CREATE TABLE IF NOT EXISTS names    (name TEXT, id TEXT);
  CREATE INDEX IF NOT EXISTS idx_items_se ON items (source, entry);
  CREATE INDEX IF NOT EXISTS idx_nbt_snbt ON nbt (snbt);
`

// ──────────────────────────────────────────────────────────────────────────
// Connections
// ──────────────────────────────────────────────────────────────────────────

let readDb: Db | undefined
let writeDb: Db | undefined

/** Read-only connection used by the shipped `getIcon` point-lookups. */
export function getReadDb(): Db {
  return (readDb ??= new Database(DB_PATH, { readonly: true, fileMustExist: true }))
}

/** Writable connection used by `saveAssets` / migration. */
export function getWriteDb(): Db {
  if (!writeDb) {
    writeDb = new Database(DB_PATH)
    // Single-file journal so the shipped DB is one artifact (no WAL sidecars)
    writeDb.pragma('journal_mode = DELETE')
    writeDb.exec(SCHEMA)
  }
  return writeDb
}

// ──────────────────────────────────────────────────────────────────────────
// Point lookups for getIcon (production path)
// ──────────────────────────────────────────────────────────────────────────

function buildStmts(db: Db) {
  return {
    itemsByEntry: db.prepare<[string, string]>('SELECT meta, nbtkey, imghash FROM items WHERE source = ? AND entry = ? ORDER BY rowid'),
    imagePath: db.prepare<[string]>('SELECT path FROM images WHERE hash = ?'),
    nbtHash: db.prepare<[string]>('SELECT hash FROM nbt WHERE snbt = ?'),
  }
}
let stmts: ReturnType<typeof buildStmts> | undefined
function getStmts() {
  return (stmts ??= buildStmts(getReadDb()))
}

/**
 * All rows for one `source:entry`, grouped back into the nested
 * `{ meta: { nbtkey: imgHash } }` shape `getIcon` expects, or `undefined`
 * when the item is unknown.
 */
export function dbDefinition(source: string, entry: string): { [meta: string]: { [nbt: string]: string } } | undefined {
  const rows = getStmts().itemsByEntry.all(source, entry) as { meta: string, nbtkey: string, imghash: string }[]
  if (!rows.length)
    return undefined
  const def: { [meta: string]: { [nbt: string]: string } } = {}
  for (const { meta, nbtkey, imghash } of rows)
    ((def[meta] ??= {}))[nbtkey] = imghash
  return def
}

export function dbImagePath(hash: string): string | undefined {
  return (getStmts().imagePath.get(hash) as { path: string } | undefined)?.path
}

export function dbNbtHash(sNbt: string): string | undefined {
  return (getStmts().nbtHash.get(sNbt) as { hash: string } | undefined)?.hash
}

// ──────────────────────────────────────────────────────────────────────────
// Bulk load / save (preparse + full-object consumers)
// ──────────────────────────────────────────────────────────────────────────

type StoreKey = keyof StoreData

/** Rebuild a single asset's in-memory object from the database. */
export function loadFromDb<K extends StoreKey>(key: K): StoreData[K] {
  const db = getReadDb()
  switch (key) {
    case 'images': {
      const out: StoreData['images'] = {}
      for (const r of db.prepare('SELECT hash, path FROM images').iterate() as Iterable<{ hash: string, path: string }>)
        out[r.hash] = r.path
      return out as StoreData[K]
    }
    case 'nbt': {
      const out: StoreData['nbt'] = {}
      for (const r of db.prepare('SELECT hash, snbt FROM nbt').iterate() as Iterable<{ hash: string, snbt: string }>)
        out[r.hash] = r.snbt
      return out as StoreData[K]
    }
    case 'mods': {
      const out: StoreData['mods'] = {}
      for (const r of db.prepare('SELECT id, name FROM mods').iterate() as Iterable<{ id: string, name: string }>)
        out[r.id] = r.name
      return out as StoreData[K]
    }
    case 'modpacks': {
      const out: StoreData['modpacks'] = {}
      for (const r of db.prepare('SELECT shorthand, source FROM modpacks ORDER BY rowid').iterate() as Iterable<{ shorthand: string, source: string }>)
        (out[r.shorthand] ??= []).push(r.source)
      return out as StoreData[K]
    }
    case 'names': {
      const out: StoreData['names'] = {}
      for (const r of db.prepare('SELECT name, id FROM names ORDER BY rowid').iterate() as Iterable<{ name: string, id: string }>)
        (out[r.name] ??= []).push(r.id)
      return out as StoreData[K]
    }
    case 'items':
    default: {
      const out: Tree<string> = {}
      for (const r of db.prepare('SELECT source, entry, meta, nbtkey, imghash FROM items ORDER BY rowid').iterate() as Iterable<{ source: string, entry: string, meta: string, nbtkey: string, imghash: string }>)
        ((((out[r.source] ??= {})[r.entry] ??= {})[r.meta] ??= {}))[r.nbtkey] = r.imghash
      return out as StoreData[K]
    }
  }
}

/** Replace the entire database contents with the given in-memory store. */
export function writeStore(data: Partial<StoreData>): void {
  const db = getWriteDb()
  const tx = db.transaction(() => {
    if (data.images) {
      db.exec('DELETE FROM images')
      const ins = db.prepare('INSERT INTO images (hash, path) VALUES (?, ?)')
      for (const [hash, path] of Object.entries(data.images)) ins.run(hash, path)
    }
    if (data.items) {
      db.exec('DELETE FROM items')
      const ins = db.prepare('INSERT INTO items (source, entry, meta, nbtkey, imghash) VALUES (?, ?, ?, ?, ?)')
      for (const [source, entries] of Object.entries(data.items)) {
        for (const [entry, metas] of Object.entries(entries)) {
          for (const [meta, nbts] of Object.entries(metas)) {
            for (const [nbtkey, imghash] of Object.entries(nbts)) ins.run(source, entry, meta, nbtkey, imghash)
          }
        }
      }
    }
    if (data.nbt) {
      db.exec('DELETE FROM nbt')
      const ins = db.prepare('INSERT INTO nbt (hash, snbt) VALUES (?, ?)')
      for (const [hash, snbt] of Object.entries(data.nbt)) ins.run(hash, snbt)
    }
    if (data.mods) {
      db.exec('DELETE FROM mods')
      const ins = db.prepare('INSERT INTO mods (id, name) VALUES (?, ?)')
      for (const [id, name] of Object.entries(data.mods)) ins.run(id, name)
    }
    if (data.modpacks) {
      db.exec('DELETE FROM modpacks')
      const ins = db.prepare('INSERT INTO modpacks (shorthand, source) VALUES (?, ?)')
      for (const [shorthand, sources] of Object.entries(data.modpacks)) {
        for (const source of sources) ins.run(shorthand, source)
      }
    }
    if (data.names) {
      db.exec('DELETE FROM names')
      const ins = db.prepare('INSERT INTO names (name, id) VALUES (?, ?)')
      for (const [name, ids] of Object.entries(data.names)) {
        for (const id of ids) ins.run(name, id)
      }
    }
  })
  tx()
}
