export interface SqlClient {
  execute(sql: string, params?: unknown[]): Promise<void>;
  select<T>(sql: string, params?: unknown[]): Promise<T[]>;
  selectOne<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T>;
}
