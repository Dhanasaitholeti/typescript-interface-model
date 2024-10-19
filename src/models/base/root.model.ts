import { pool } from "../../utils/Database";

interface IGetAllOptions<T> {
  filters?: Partial<{
    [K in keyof T]: T[K] | { jsonPath: string; value: any };
  }>;
  select?: Array<Partial<keyof T>>;
  sortBy?: keyof T;
  sortOrder?: "asc" | "desc";
  limit?: number;
  currentPage?: number;
  offset?: number;
  searchIn?: number[];
}

export interface IBaseModel<T> {
  getAll(options?: Partial<T>): Promise<IgetAllReturnType<T>>;
  getById(id: number): Promise<T | null>;
  getOne(options?: Partial<T>): Promise<T | null>;
  create(data: Omit<T, "id" | "created_at" | "updated_at">): Promise<T>;
  update(id: number, updates: Partial<T>): Promise<T | null>;
  delete(id: number): Promise<boolean>;
  createMany(dataArray: T[]): Promise<T[]>;
  updateMany(updates: Partial<T>, filter: Partial<T>): Promise<number>;
}

interface IgetAllReturnType<T> {
  rows: T[];
  pagination?: {
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
    totalItems: number;
  };
}

abstract class BaseModel<T> implements IBaseModel<T> {
  abstract tableName: string;

  async getAll(options?: IGetAllOptions<T>): Promise<IgetAllReturnType<T>> {
    const selectedFields = options?.select
      ? options.select
          .map((field) =>
            typeof field === "string"
              ? field.replace(/([A-Z])/g, "_$1").toLowerCase()
              : field
          )
          .join(", ")
      : "*";

    let query = `SELECT ${selectedFields} FROM ${this.tableName}`;
    let totalItemsQuery = `SELECT COUNT(*) FROM ${this.tableName}`;

    const values: any[] = [];
    let index = 1;

    if (options?.filters) {
      const conditions = [];
      for (const [key, value] of Object.entries(options.filters)) {
        if (typeof value === "object" && "jsonPath" in value) {
          conditions.push(`${value.jsonPath} = $${index}`);
          values.push((value as any).value);
        } else if (value !== undefined) {
          conditions.push(
            `${key.replace(/([A-Z])/g, "_$1").toLowerCase()} = $${index}`
          );
          values.push(value);
        }
        index++;
      }
      if (conditions.length > 0) {
        const whereClause = " WHERE " + conditions.join(" AND ");
        query += whereClause;
        totalItemsQuery += whereClause; // Apply the same filters to the totalItemsQuery
      }
    }

    if (options?.searchIn && options.searchIn?.length > 0) {
      const whereClause = ` WHERE id IN (${options.searchIn.join(",")})`;
      query += whereClause;
      totalItemsQuery += whereClause;
    }

    if (options?.sortBy) {
      query += ` ORDER BY ${String(options.sortBy)
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase()} ${options.sortOrder || "asc"}`;
    }

    let offset: number | undefined;
    if (options?.currentPage && options?.limit) {
      offset = (options.currentPage - 1) * options.limit;
    } else if (options?.offset) {
      offset = options.offset;
    }

    if (offset !== undefined) {
      query += ` OFFSET ${offset}`;
    }

    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    const result = await pool.query(query, values);

    const totalItemsResult = await pool.query(totalItemsQuery, values);
    const totalItems = parseInt(totalItemsResult.rows[0].count, 10);

    const resultObj: IgetAllReturnType<T> = {
      rows: result.rows as Array<T>,
      pagination: options?.limit
        ? {
            currentPage:
              options?.currentPage ||
              Math.floor((offset ?? 0) / options.limit) + 1,
            itemsPerPage: options?.limit,
            totalItems: totalItems,
            totalPages: Math.ceil(totalItems / options.limit),
          }
        : undefined,
    };

    return resultObj;
  }

  async getOne(options: IGetAllOptions<T>): Promise<T | null> {
    const selectedFields = options?.select
      ? options.select
          .map((field) =>
            typeof field === "string"
              ? field.replace(/([A-Z])/g, "_$1").toLowerCase()
              : field
          )
          .join(", ")
      : "*";

    let query = `SELECT ${selectedFields} FROM ${this.tableName}`;
    const values: any[] = [];

    if (options?.filters) {
      const conditions = [];
      let index = 1;
      for (const [key, value] of Object.entries(options.filters)) {
        if (typeof value === "object" && "jsonPath" in value) {
          conditions.push(`${value.jsonPath} = $${index}`);
          values.push((value as any).value);
        } else if (value !== undefined) {
          conditions.push(
            `${key.replace(/([A-Z])/g, "_$1").toLowerCase()} = $${index}`
          );
          values.push(value);
        }
        index++;
      }
      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }
    }

    if (options?.sortBy) {
      query += ` ORDER BY ${String(options.sortBy)
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase()} ${options.sortOrder || "asc"}`;
    }

    query += ` LIMIT 1`;

    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
      return result.rows[0] as T; // Return the first (and only) row
    }

    return null; // If no result, return null
  }

  async getById(
    id: number,
    select?: Array<Partial<keyof T>>
  ): Promise<T | null> {
    const selectedFields = select
      ? select
          .map((field) =>
            typeof field === "string"
              ? field.replace(/([A-Z])/g, "_$1").toLowerCase()
              : field
          )
          .join(", ")
      : "*";

    const result = await pool.query(
      `SELECT ${selectedFields} FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: Omit<T, "id" | "created_at" | "updated_at">): Promise<T> {
    const fields = Object.keys(data);
    const values = Object.values(data);

    const columns = fields.map((field) =>
      field.replace(/([A-Z])/g, "_$1").toLowerCase()
    );

    const placeholders = fields.map((_, index) => `$${index + 1}`);

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING *
    `;

    const formattedValues = values.map((value) =>
      typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : value
    );

    const result = await pool.query(query, formattedValues);
    return result.rows[0];
  }

  async update(id: number, updates: Partial<T>): Promise<T | null> {
    const fields = Object.keys(updates);
    if (fields.length === 0) {
      throw new Error("No valid fields provided for update.");
    }

    const setClauses: string[] = [];
    const values: any[] = [id];

    fields.forEach((field, index) => {
      const column = field.replace(/([A-Z])/g, "_$1").toLowerCase();
      const value = (updates as any)[field];
      values.push(
        typeof value === "object" && value !== null
          ? JSON.stringify(value)
          : value
      );
      setClauses.push(`${column} = $${index + 2}`);
    });

    const query = `
      UPDATE ${this.tableName} 
      SET ${setClauses.join(", ")} 
      WHERE id = $1 
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  async createMany(dataArray: T[]): Promise<T[]> {
    if (dataArray.length === 0) {
      return [];
    }

    const fields = Object.keys(dataArray[0]);
    const columns = fields.map((field) =>
      field.replace(/([A-Z])/g, "_$1").toLowerCase()
    );

    const queryValues: any[] = [];
    const valuePlaceholders: string[] = [];

    dataArray.forEach((data, rowIndex) => {
      const values = Object.values(data).map((value) =>
        typeof value === "object" && value !== null
          ? JSON.stringify(value)
          : value
      );

      const placeholders = fields.map(
        (_, colIndex) => `$${rowIndex * fields.length + colIndex + 1}`
      );
      valuePlaceholders.push(`(${placeholders.join(", ")})`);
      queryValues.push(...values);
    });

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(", ")})
      VALUES ${valuePlaceholders.join(", ")}
      RETURNING *
    `;

    const result = await pool.query(query, queryValues);
    return result.rows;
  }

  async updateMany(updates: Partial<T>, filter: Partial<T>): Promise<number> {
    const fields = Object.keys(updates);
    if (fields.length === 0) {
      throw new Error("No valid fields provided for update.");
    }

    const setClauses: string[] = [];
    const values: any[] = [];

    fields.forEach((field, index) => {
      const column = field.replace(/([A-Z])/g, "_$1").toLowerCase();
      const value = (updates as any)[field];
      values.push(
        typeof value === "object" && value !== null
          ? JSON.stringify(value)
          : value
      );
      setClauses.push(`${column} = $${index + 1}`);
    });

    const filterClauses: string[] = [];
    if (filter) {
      let index = fields.length + 1;
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined) {
          filterClauses.push(
            `${key.replace(/([A-Z])/g, "_$1").toLowerCase()} = $${index}`
          );
          values.push(value);
          index++;
        }
      }
    }

    const query = `
      UPDATE ${this.tableName}
      SET ${setClauses.join(", ")}
      ${filterClauses.length > 0 ? "WHERE " + filterClauses.join(" AND ") : ""}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rowCount;
  }

  async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  }
}

export default BaseModel;
