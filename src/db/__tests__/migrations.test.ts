import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { SqlJsStatic, Database as SqlJsDatabase } from 'sql.js';
import type { SQLiteDatabase } from 'expo-sqlite';
import { migrateDbIfNeeded } from '../migrations';

function createExpoDb(sqlJsDb: SqlJsDatabase): SQLiteDatabase {
  return {
    getFirstAsync: async (sql: string) => {
      const results = sqlJsDb.exec(sql);
      if (!results.length || !results[0].values.length) return null;
      const { columns, values } = results[0];
      const row: Record<string, unknown> = {};
      columns.forEach((col, i) => { row[col] = values[0][i]; });
      return row;
    },
    execAsync: async (sql: string) => {
      sqlJsDb.exec(sql);
    },
    runAsync: async (sql: string, ...params: unknown[]) => {
      const stmt = sqlJsDb.prepare(sql);
      stmt.bind(params as any[]);
      stmt.step();
      stmt.free();
      return { lastInsertRowId: 0, changes: sqlJsDb.getRowsModified() };
    },
  } as SQLiteDatabase;
}

let sqlJsDb: SqlJsDatabase;

beforeAll(async () => {
  const SQL: SqlJsStatic = await initSqlJs();
  sqlJsDb = new SQL.Database();
});

afterAll(() => {
  sqlJsDb.close();
});

beforeEach(() => {
  sqlJsDb.exec('DROP TABLE IF EXISTS todos');
  sqlJsDb.exec('PRAGMA user_version = 0');
});

describe('migrateDbIfNeeded', () => {
  it('should create tables and seed data on first run', async () => {
    const db = createExpoDb(sqlJsDb);
    await migrateDbIfNeeded(db);

    const result = sqlJsDb.exec('SELECT * FROM todos');
    expect(result.length).toBe(1);
    const rows = result[0].values;
    expect(rows).toHaveLength(2);
    expect(rows[0][1]).toBe('hello');
    expect(rows[0][2]).toBe(1);
    expect(rows[1][1]).toBe('world');
    expect(rows[1][2]).toBe(2);
  });

  it('should set user_version to 1 after migration', async () => {
    const db = createExpoDb(sqlJsDb);
    await migrateDbIfNeeded(db);

    const result = sqlJsDb.exec('PRAGMA user_version');
    const version = result[0].values[0][0];
    expect(version).toBe(1);
  });

  it('should skip migration if already at latest version', async () => {
    sqlJsDb.exec('PRAGMA user_version = 1');
    sqlJsDb.exec('CREATE TABLE todos (id INTEGER PRIMARY KEY NOT NULL, value TEXT NOT NULL, intValue INTEGER)');

    const db = createExpoDb(sqlJsDb);
    await migrateDbIfNeeded(db);

    const result = sqlJsDb.exec('SELECT COUNT(*) FROM todos');
    const count = result[0].values[0][0];
    expect(count).toBe(0);
  });

  it('should not fail on second call', async () => {
    const db = createExpoDb(sqlJsDb);
    await migrateDbIfNeeded(db);
    await migrateDbIfNeeded(db);

    const result = sqlJsDb.exec('SELECT * FROM todos');
    expect(result[0].values).toHaveLength(2);
  });
});
