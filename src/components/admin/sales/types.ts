export interface SalesLead {
  id: string;
  business_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  category: string; // Restaurant, Biryani Shop, Hotel, Caterer, Cloud Kitchen, Food Business, Dhaba, Canteen
  area: string;     // Vashi, Nerul, Belapur, Turbhe, Kopar Khairane, Kharghar, Panvel, etc.
  address?: string;
  source_url?: string;
  status: 'New' | 'Contacted' | 'Interested' | 'Quoted' | 'Trial Order' | 'Active Customer' | 'Not Interested' | 'Opted Out';
  estimated_daily_kg?: number;
  preferred_items?: string;
  notes?: string;
  opt_out?: boolean;
  last_contacted_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface SalesMessage {
  id: string;
  lead_id?: string;
  customer_id?: string;
  recipient_type: 'b2b' | 'b2c';
  recipient_name: string;
  recipient_phone?: string;
  channel: 'whatsapp' | 'call' | 'email';
  purpose: string; // Introduction, Wholesale Enquiry, Trial Order Proposal, Quotation Follow-up, Repeat Order Reminder, Cart Recovery, Promotion
  language: 'hinglish' | 'english';
  content: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SENT_MANUALLY';
  rejection_reason?: string;
  approved_at?: string;
  sent_at?: string;
  sent_by_user_id?: string;
  created_at: string;
}

export interface QuotationItem {
  product_id?: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

export interface SalesQuotation {
  id: string;
  quotation_number: string;
  lead_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_area?: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  payment_terms: string;
  delivery_slot: string;
  valid_until?: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
  notes?: string;
  created_at: string;
}

export interface SalesFollowUp {
  id: string;
  lead_id: string;
  lead_name?: string;
  lead_phone?: string;
  due_date: string;
  title: string;
  notes?: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Completed' | 'Cancelled' | 'Rescheduled';
  completed_at?: string;
  created_at: string;
}

export interface SalesSettingsMap {
  business_name?: string;
  business_hub?: string;
  official_whatsapp?: string;
  min_b2b_order_kg?: string;
  wholesale_payment_terms?: string;
  preferred_tone?: string;
  delivery_slots?: string;
}
