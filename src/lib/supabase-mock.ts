// Custom Mock Supabase Client drop-in replacement
export class QueryBuilder {
  table: string;
  filters: Array<{ type: 'eq'; column: string; value: any }> = [];
  orderByColumn: string | null = null;
  orderByAsc: boolean = true;
  limitCount: number | null = null;
  isSingle: boolean = false;
  isInsert: boolean = false;
  isUpdate: boolean = false;
  isDelete: boolean = false;
  payload: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string) {
    return this;
  }

  insert(values: any) {
    this.isInsert = true;
    this.payload = values;
    return this;
  }

  update(values: any) {
    this.isUpdate = true;
    this.payload = values;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderByColumn = column;
    this.orderByAsc = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  // Thenable interface to support await
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const result = await this.execute();
      if (onfulfilled) return onfulfilled(result);
      return result;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }

  async execute() {
    if (typeof window === 'undefined') {
      // Server-side
      const { executeServerQuery } = require('./supabase-mock-server');
      return executeServerQuery(this);
    } else {
      // Client-side: POST query options to mock API endpoint
      const res = await fetch('/api/mock/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this.table,
          filters: this.filters,
          orderByColumn: this.orderByColumn,
          orderByAsc: this.orderByAsc,
          limitCount: this.limitCount,
          isSingle: this.isSingle,
          isInsert: this.isInsert,
          isUpdate: this.isUpdate,
          isDelete: this.isDelete,
          payload: this.payload
        })
      });
      return await res.json();
    }
  }
}

export class MockSupabaseClient {
  private cookieGetter: () => string | null;

  constructor(cookieGetter?: () => string | null) {
    this.cookieGetter = cookieGetter || (() => {
      if (typeof document === 'undefined') return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; meatcity_session=`);
      if (parts.length === 2) return decodeURIComponent(parts.pop()!.split(';').shift()!);
      return null;
    });
  }

  from(table: string) {
    return new QueryBuilder(table);
  }

  auth = {
    signUp: async (params: { email: string; password?: string; options?: { data?: any } }) => {
      const email = params.email;
      const password = params.password || '';
      const metadata = params.options?.data || {};

      try {
        let db;
        let saveDb;
        
        if (typeof window === 'undefined') {
          const { readDb, writeDb } = require('./supabase-mock-server');
          db = readDb();
          saveDb = writeDb;
        } else {
          // Client side: fetch the whole database to append or use an insert operation
          const res = await fetch('/api/mock/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: 'users', filters: [] })
          });
          const json = await res.json();
          // To write, we can execute an insert query directly!
          const user_type = metadata.user_type || 'b2c';
          const newUser = {
            id: 'usr-' + Math.random().toString(36).substr(2, 9),
            email,
            password,
            full_name: metadata.full_name || 'Customer',
            phone: metadata.phone || '',
            user_type,
            status: user_type === 'b2b' ? 'pending' : 'active',
            business_name: metadata.business_name || '',
            gst_number: metadata.gst_number || '',
            fssai_license: metadata.fssai_license || '',
            shop_address: metadata.address || '',
            referral_code: metadata.referral_code || '',
            ...(user_type === 'b2b' ? {
              credit_limit: 50000,
              credit_used: 0,
              credit_available: 50000,
              outstanding_balance: 0,
              payment_due_date: '',
              last_payment_date: '',
              ledger: []
            } : {})
          };

          // Check if phone or email exists
          const exists = json.data?.some((u: any) => u.email === email || (newUser.phone && u.phone === newUser.phone));
          if (exists) {
            return { data: { user: null }, error: { message: 'User with this email or mobile number already exists.' } };
          }

          const insertRes = await fetch('/api/mock/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: 'users', isInsert: true, payload: newUser })
          });
          const insertData = await insertRes.json();

          if (newUser.user_type === 'b2c') {
            // Log B2C users in immediately
            const authenticatedUser = {
              ...newUser,
              user_metadata: {
                user_type: newUser.user_type,
                status: newUser.status,
                full_name: newUser.full_name,
                phone: newUser.phone,
                business_name: newUser.business_name
              }
            };
            await fetch('/api/mock/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'login', user: authenticatedUser })
            });
          }

          return { data: { user: newUser }, error: null };
        }

        // Server side sign up
        const user_type = metadata.user_type || 'b2c';
        const newUser = {
          id: 'usr-' + Math.random().toString(36).substr(2, 9),
          email,
          password,
          full_name: metadata.full_name || 'Customer',
          phone: metadata.phone || '',
          user_type,
          status: user_type === 'b2b' ? 'pending' : 'active',
          business_name: metadata.business_name || '',
          gst_number: metadata.gst_number || '',
          fssai_license: metadata.fssai_license || '',
          shop_address: metadata.address || '',
          referral_code: metadata.referral_code || '',
          created_at: new Date().toISOString(),
          ...(user_type === 'b2b' ? {
            credit_limit: 50000,
            credit_used: 0,
            credit_available: 50000,
            outstanding_balance: 0,
            payment_due_date: '',
            last_payment_date: '',
            ledger: []
          } : {})
        };

        if (db.users.some((u: any) => u.email === email || (newUser.phone && u.phone === newUser.phone))) {
          return { data: { user: null }, error: { message: 'User with this email or mobile number already exists.' } };
        }

        db.users.push(newUser);
        saveDb(db);

        return { data: { user: newUser }, error: null };
      } catch (err: any) {
        return { data: { user: null }, error: { message: err.message } };
      }
    },

    signInWithPassword: async (params: { email: string; password?: string }) => {
      const email = params.email;
      const password = params.password;

      try {
        console.log(`[AUTH LOG] Attempting login for: ${email}`);
        let users = [];
        if (typeof window === 'undefined') {
          const { readDb } = require('./supabase-mock-server');
          users = readDb().users;
        } else {
          const res = await fetch('/api/mock/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: 'users', filters: [] })
          });
          const json = await res.json();
          users = json.data || [];
        }

        const userByEmail = users.find((u: any) => 
          u.email.toLowerCase() === email.toLowerCase() || 
          (u.phone && u.phone === email) ||
          (u.mobile && u.mobile === email)
        );
        console.log(`[AUTH LOG] User found by email/mobile? ${userByEmail ? 'YES' : 'NO'}`);

        if (!userByEmail) {
          return { data: { user: null }, error: { message: 'Invalid email, mobile or password.' } };
        }

        const passwordMatched = userByEmail.password === password;
        console.log(`[AUTH LOG] Password matched? ${passwordMatched ? 'YES' : 'NO'}`);

        if (!passwordMatched) {
          return { data: { user: null }, error: { message: 'Invalid email or password.' } };
        }

        const user = userByEmail;

        if (user.status === 'suspended') {
          console.log(`[AUTH LOG] Suspended user block hit`);
          return { data: { user: null }, error: { message: 'Your account has been suspended. Please contact customer support.' } };
        }

        const authenticatedUser = {
          ...user,
          user_metadata: {
            user_type: user.user_type,
            status: user.status,
            full_name: user.full_name,
            phone: user.phone,
            business_name: user.business_name
          }
        };

        if (typeof window !== 'undefined') {
          console.log(`[AUTH LOG] Setting browser session cookie via /api/mock/auth endpoint...`);
          // Set browser cookie via endpoint
          const authRes = await fetch('/api/mock/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', user: authenticatedUser })
          });
          const authJson = await authRes.json();
          console.log(`[AUTH LOG] Session cookie endpoint response success: ${authJson.success}`);
        }

        console.log(`[AUTH LOG] Login success. Returning authenticated user role=${user.user_type}`);
        return { data: { user: authenticatedUser, session: { user: authenticatedUser } }, error: null };
      } catch (err: any) {
        return { data: { user: null }, error: { message: err.message } };
      }
    },

    signOut: async () => {
      if (typeof window !== 'undefined') {
        await fetch('/api/mock/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout' })
        });
        document.cookie = 'meatcity_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      }
      return { error: null };
    },

    getUser: async () => {
      const cookieStr = this.cookieGetter();
      if (!cookieStr) {
        return { data: { user: null }, error: null };
      }
      try {
        const u = JSON.parse(cookieStr);
        const user = {
          ...u,
          user_metadata: {
            user_type: u.user_type,
            status: u.status,
            full_name: u.full_name,
            phone: u.phone,
            business_name: u.business_name
          }
        };
        return { data: { user }, error: null };
      } catch {
        return { data: { user: null }, error: null };
      }
    },

    getSession: async () => {
      const cookieStr = this.cookieGetter();
      if (!cookieStr) {
        return { data: { session: null }, error: null };
      }
      try {
        const u = JSON.parse(cookieStr);
        const user = {
          ...u,
          user_metadata: {
            user_type: u.user_type,
            status: u.status,
            full_name: u.full_name,
            phone: u.phone,
            business_name: u.business_name
          }
        };
        return { data: { session: { user } }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    }
  };
}
