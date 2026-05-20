/**
 * @fileoverview In-memory SQLite stand-in for Jest (no native expo-sqlite).
 * @module data/persistence/sqlite/testInMemoryDatabase
 */

import type { KairoSqliteDatabase } from './databaseTypes';

type Row = Record<string, unknown>;

function splitParams(source: string, params: unknown[]): unknown[] {
  const named = params.length === 1 && params[0] != null && typeof params[0] === 'object' && !Array.isArray(params[0]);
  if (named) {
    const obj = params[0] as Record<string, unknown>;
    return source.match(/\$\w+/g)?.map((token) => obj[token] ?? obj[token.slice(1)]) ?? [];
  }
  if (params.length === 1 && Array.isArray(params[0])) return params[0] as unknown[];
  return params;
}

function placeholderCount(source: string): number {
  return (source.match(/\?/g) ?? []).length;
}

export function createInMemoryKairoDatabase(): KairoSqliteDatabase {
  const tables = new Map<string, Row[]>();
  const meta = new Map<string, number>();

  const ensureTable = (name: string): Row[] => {
    if (!tables.has(name)) tables.set(name, []);
    return tables.get(name)!;
  };

  const upsertRow = (tableName: string, row: Row, pkCol: string): void => {
    const table = ensureTable(tableName);
    const pk = String(row[pkCol]);
    const i = table.findIndex((r) => String(r[pkCol]) === pk);
    if (i >= 0) table[i] = row;
    else table.push(row);
  };

  const db: KairoSqliteDatabase = {
    async execAsync(source: string): Promise<void> {
      const statements = source
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);

      for (const stmt of statements) {
        if (/^PRAGMA\s+journal_mode/i.test(stmt)) continue;

        const userVersion = stmt.match(/PRAGMA\s+user_version\s*=\s*(\d+)/i);
        if (userVersion) {
          meta.set('user_version', Number(userVersion[1]));
          continue;
        }

        const create = stmt.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
        if (create) {
          ensureTable(create[1]!);
          continue;
        }

        if (/^CREATE INDEX/i.test(stmt)) continue;
      }
    },

    async runAsync(source: string, ...params: unknown[]): Promise<{ changes: number; lastInsertRowId: number }> {
      const bound = splitParams(source, params);
      const normalized = source.trim();

      const insertMatch = normalized.match(/^INSERT(?: OR REPLACE)? INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)\s*$/is);
      if (insertMatch) {
        const tableName = insertMatch[1]!;
        const cols = insertMatch[2]!.split(',').map((c) => c.trim());
        const qCount = placeholderCount(insertMatch[3]!);
        const vals = qCount > 0 ? bound.slice(0, qCount) : insertMatch[3]!.split(',').map((v) => v.trim().replace(/^'|'$/g, ''));
        const row: Row = {};
        cols.forEach((c, idx) => {
          row[c] = vals[idx];
        });

        if (/INSERT OR REPLACE/i.test(normalized)) {
          if (tableName === 'habit_selections') {
            const table = ensureTable(tableName);
            const i = table.findIndex((r) => r.date === row.date && r.habit_id === row.habit_id);
            if (i >= 0) table[i] = row;
            else table.push(row);
          } else {
            const pkCol =
              tableName === 'mood_entries' ? 'date' : tableName === 'goals' ? 'id' : 'key';
            upsertRow(tableName, row, pkCol);
          }
        } else {
          ensureTable(tableName).push(row);
        }
        return { changes: 1, lastInsertRowId: ensureTable(tableName).length };
      }

      if (/^DELETE FROM\s+(\w+)\s*$/i.test(normalized)) {
        const tableName = normalized.match(/^DELETE FROM\s+(\w+)\s*$/i)![1]!;
        const n = ensureTable(tableName).length;
        tables.set(tableName, []);
        return { changes: n, lastInsertRowId: 0 };
      }

      const delWhere = normalized.match(/^DELETE FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\?\s*$/i);
      if (delWhere) {
        const tableName = delWhere[1]!;
        const col = delWhere[2]!;
        const val = bound[0];
        const table = ensureTable(tableName);
        const before = table.length;
        const next = table.filter((r) => r[col] !== val);
        tables.set(tableName, next);
        return { changes: before - next.length, lastInsertRowId: 0 };
      }

      return { changes: 0, lastInsertRowId: 0 };
    },

    async getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> {
      const rows = await db.getAllAsync<T>(source, ...params);
      return rows[0] ?? null;
    },

    async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
      const bound = splitParams(source, params);
      const normalized = source.trim();

      if (/^PRAGMA\s+user_version\s*$/i.test(normalized)) {
        return [{ user_version: meta.get('user_version') ?? 0 } as T];
      }

      const countMatch = normalized.match(/^SELECT COUNT\(\*\)\s+as\s+cnt\s+FROM\s+(\w+)\s*$/i);
      if (countMatch) {
        return [{ cnt: ensureTable(countMatch[1]!).length } as T];
      }

      const metaMatch = normalized.match(/^SELECT value FROM kairo_meta WHERE key = \?\s*$/i);
      if (metaMatch) {
        const key = bound[0];
        const row = ensureTable('kairo_meta').find((r) => r.key === key);
        return row ? ([{ value: row.value }] as T[]) : [];
      }

      const selectPartial = normalized.match(/^SELECT (.+) FROM\s+(\w+)(?:\s+ORDER BY\s+(.+))?$/i);
      if (selectPartial && !/^SELECT \*/i.test(normalized)) {
        const tableName = selectPartial[2]!;
        const rows = [...ensureTable(tableName)];
        if (selectPartial[3]) {
          const desc = /DESC/i.test(selectPartial[3]!);
          const col = selectPartial[3]!.split(/\s+/)[0]!;
          rows.sort((a, b) => {
            const av = a[col];
            const bv = b[col];
            if (av === bv) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            const cmp = av < bv ? -1 : 1;
            return desc ? -cmp : cmp;
          });
        }
        return rows as T[];
      }

      const selectAll = normalized.match(/^SELECT \* FROM\s+(\w+)\s*$/i);
      if (selectAll) {
        return [...ensureTable(selectAll[1]!)] as T[];
      }

      return [];
    },

    async withTransactionAsync(task: () => Promise<void>): Promise<void> {
      await task();
    },
  };

  return db;
}

/** @internal Resets module singleton between tests. */
let sharedTestDb: KairoSqliteDatabase | null = null;

export function getSharedInMemoryKairoDatabase(): KairoSqliteDatabase {
  if (!sharedTestDb) sharedTestDb = createInMemoryKairoDatabase();
  return sharedTestDb;
}

export function resetSharedInMemoryKairoDatabase(): void {
  sharedTestDb = createInMemoryKairoDatabase();
}
