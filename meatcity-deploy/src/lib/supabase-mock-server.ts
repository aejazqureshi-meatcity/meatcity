import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'mock_db.json');

// Helper to read DB
export function readDb() {
  try {
    if (!fs.existsSync(dbPath)) {
      return { users: [], products: [], orders: [], categories: [], coupons: [], wishlists: [], addresses: [] };
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read mock db:', error);
    return { users: [], products: [], orders: [], categories: [], coupons: [], wishlists: [], addresses: [] };
  }
}

// Helper to write DB
export function writeDb(data: any) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to write mock db:', error);
    return false;
  }
}

// Helper to generate UUID
function generateUUID() {
  return 'uuid-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
}

// Core server-side query executor
export function executeServerQuery(query: any) {
  const db = readDb();
  const table = query.table;
  let data = db[table] || [];

  try {
    // 1. Handle INSERT
    if (query.isInsert) {
      const payloads = Array.isArray(query.payload) ? query.payload : [query.payload];
      const insertedRows = payloads.map((row: any) => {
        const newRow = { 
          id: row.id || generateUUID(), 
          created_at: new Date().toISOString(),
          ...row 
        };
        data.push(newRow);
        return newRow;
      });

      db[table] = data;
      writeDb(db);

      return { data: Array.isArray(query.payload) ? insertedRows : insertedRows[0], error: null };
    }

    // 2. Handle UPDATE
    if (query.isUpdate) {
      let updatedCount = 0;
      const updatedRows: any[] = [];
      data = data.map((row: any) => {
        // Apply filters
        let matches = true;
        for (const filter of query.filters || []) {
          if (filter.type === 'eq' && row[filter.column] !== filter.value) {
            matches = false;
            break;
          }
        }

        if (matches) {
          const updatedRow = { ...row, ...query.payload };
          updatedCount++;
          updatedRows.push(updatedRow);
          return updatedRow;
        }
        return row;
      });

      db[table] = data;
      writeDb(db);

      return { data: query.isSingle ? updatedRows[0] : updatedRows, error: null };
    }

    // 3. Handle DELETE
    if (query.isDelete) {
      const deletedRows: any[] = [];
      const remainingRows = data.filter((row: any) => {
        let matches = true;
        for (const filter of query.filters || []) {
          if (filter.type === 'eq' && row[filter.column] !== filter.value) {
            matches = false;
            break;
          }
        }
        if (matches) {
          deletedRows.push(row);
        }
        return !matches;
      });

      db[table] = remainingRows;
      writeDb(db);

      return { data: deletedRows, error: null };
    }

    // 4. Handle SELECT (Filter operations)
    let filteredData = [...data];

    // Apply eq filters
    for (const filter of query.filters || []) {
      if (filter.type === 'eq') {
        filteredData = filteredData.filter((row: any) => row[filter.column] === filter.value);
      }
    }

    // Apply sorting
    if (query.orderByColumn) {
      const col = query.orderByColumn;
      const asc = query.orderByAsc;
      filteredData.sort((a: any, b: any) => {
        let valA = a[col];
        let valB = b[col];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (query.limitCount !== null && query.limitCount !== undefined) {
      filteredData = filteredData.slice(0, query.limitCount);
    }

    // Apply single
    if (query.isSingle) {
      return { data: filteredData[0] || null, error: filteredData[0] ? null : { message: 'Row not found' } };
    }

    return { data: filteredData, error: null };
  } catch (err: any) {
    console.error('Error executing mock query:', err);
    return { data: null, error: { message: err.message || 'Database error' } };
  }
}
