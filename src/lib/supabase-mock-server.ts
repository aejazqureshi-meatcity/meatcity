import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'mock_db.json');

// Helper to read DB
export function readDb() {
  try {
    const defaultDb = { 
      users: [], 
      products: [], 
      orders: [], 
      categories: [], 
      coupons: [
        { code: 'WELCOME20', discount_percent: 20, flat_discount: 0, min_order_amount: 0, expiry_date: '2026-12-31', usage_limit: 1000, is_active: true },
        { code: 'EID25', discount_percent: 25, flat_discount: 0, min_order_amount: 500, expiry_date: '2026-12-31', usage_limit: 1000, is_active: true },
        { code: 'B2B10', discount_percent: 10, flat_discount: 0, min_order_amount: 1000, expiry_date: '2026-12-31', usage_limit: 1000, is_active: true }
      ], 
      wishlists: [], 
      addresses: [], 
      serviceable_pincodes: [
        { pincode: '400705', delivery_charge: 50 },
        { pincode: '400703', delivery_charge: 50 },
        { pincode: '400701', delivery_charge: 60 },
        { pincode: '400706', delivery_charge: 50 },
        { pincode: '400709', delivery_charge: 70 }
      ], 
      reviews: [
        { id: 'rev-1', customer_name: 'Aejaz Qureshi', rating: 5, comment: 'Fresh meat and fast delivery.', status: 'approved', created_at: new Date().toISOString() },
        { id: 'rev-2', customer_name: 'Altaf Shaikh', rating: 5, comment: 'Best wholesale rates in Navi Mumbai.', status: 'approved', created_at: new Date().toISOString() }
      ],
      admin_settings: [
        { key: 'whatsapp_notifications_enabled', value: 'true' },
        { key: 'admin_whatsapp_number', value: '917977630912' },
        { key: 'is_open', value: 'true' },
        { key: 'delivery_fee', value: '50' },
        { key: 'free_delivery_above', value: '999' },
        { key: 'minimum_b2c_order', value: '200' },
        { key: 'minimum_b2b_order', value: '1000' }
      ]
    };

    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify(defaultDb, null, 2), 'utf8');
      return defaultDb;
    }

    const data = fs.readFileSync(dbPath, 'utf8');
    const parsed = JSON.parse(data);
    let changed = false;

    if (!parsed.users) { parsed.users = []; changed = true; }
    if (!parsed.products) { parsed.products = []; changed = true; }
    if (!parsed.orders) { parsed.orders = []; changed = true; }
    if (!parsed.categories) { parsed.categories = []; changed = true; }
    if (!parsed.coupons) { parsed.coupons = defaultDb.coupons; changed = true; }
    if (!parsed.wishlists) { parsed.wishlists = []; changed = true; }
    if (!parsed.addresses) { parsed.addresses = []; changed = true; }
    if (!parsed.serviceable_pincodes) { parsed.serviceable_pincodes = defaultDb.serviceable_pincodes; changed = true; }
    if (!parsed.reviews) { parsed.reviews = defaultDb.reviews; changed = true; }
    if (!parsed.admin_settings) { parsed.admin_settings = defaultDb.admin_settings; changed = true; }

    if (changed) {
      fs.writeFileSync(dbPath, JSON.stringify(parsed, null, 2), 'utf8');
    }
    return parsed;
  } catch (error) {
    console.error('Failed to read mock db:', error);
    return { users: [], products: [], orders: [], categories: [], coupons: [], wishlists: [], addresses: [], serviceable_pincodes: [], reviews: [], admin_settings: [] };
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
