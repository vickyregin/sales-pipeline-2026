import { supabase, isSupabaseConfigured } from './supabase';
import { Deal, SalesRep, DealStage, DealCategory } from '../types';
import { INITIAL_DEALS, MOCK_REPS } from '../constants';

// --- Data Mapping (DB Snake_case -> App CamelCase) ---

const mapDealFromDB = (data: any): Deal => ({
  id: data.id,
  customerName: data.customer_name,
  title: data.title,
  value: Number(data.value),
  stage: data.stage as DealStage,
  category: data.category as DealCategory,
  assignedRepId: data.assigned_rep_id,
  closeDate: data.close_date,
  probability: Number(data.probability),
  lastUpdated: data.last_updated,
  stageHistory: data.stage_history || {},
  notes: data.notes || ''
});

const mapRepFromDB = (data: any): SalesRep => ({
  id: data.id,
  name: data.name,
  avatar: data.avatar,
  quota: Number(data.quota),
  variablePayPool: Number(data.variable_pay_pool),
  teamMembers: data.team_members
});

// --- API Methods ---

export const api = {
  
  fetchReps: async (): Promise<SalesRep[]> => {
    if (!isSupabaseConfigured || !supabase) {
      // Fallback to Mock
      return Promise.resolve(MOCK_REPS);
    }
    
    const { data, error } = await supabase.from('sales_reps').select('*');
    if (error) {
      console.error('Error fetching reps:', error);
      return MOCK_REPS;
    }
    return data.map(mapRepFromDB);
  },

  fetchDeals: async (): Promise<Deal[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return Promise.resolve(INITIAL_DEALS);
    }

    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('last_updated', { ascending: false });

    if (error) {
      console.error('Error fetching deals:', error);
      return INITIAL_DEALS;
    }
    return data.map(mapDealFromDB);
  },

  createDeal: async (deal: Omit<Deal, 'id' | 'lastUpdated'>): Promise<Deal | null> => {
    if (!isSupabaseConfigured || !supabase) {
      // Mock Implementation
      const newDeal = {
        ...deal,
        id: `local-${Date.now()}`,
        lastUpdated: new Date().toISOString()
      };
      return Promise.resolve(newDeal);
    }

    const dbPayload = {
      customer_name: deal.customerName,
      title: deal.title,
      value: deal.value,
      stage: deal.stage,
      category: deal.category,
      assigned_rep_id: deal.assignedRepId,
      close_date: deal.closeDate,
      probability: deal.probability,
      stage_history: deal.stageHistory,
      notes: deal.notes
    };

    const { data, error } = await supabase
      .from('deals')
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.error('Error creating deal:', error);
      throw error;
    }
    return mapDealFromDB(data);
  },

  updateDeal: async (deal: Deal): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      return Promise.resolve();
    }

    const dbPayload = {
      customer_name: deal.customerName,
      title: deal.title,
      value: deal.value,
      stage: deal.stage,
      category: deal.category,
      assigned_rep_id: deal.assignedRepId,
      close_date: deal.closeDate,
      probability: deal.probability,
      last_updated: new Date().toISOString(),
      stage_history: deal.stageHistory,
      notes: deal.notes
    };

    const { error } = await supabase
      .from('deals')
      .update(dbPayload)
      .eq('id', deal.id);

    if (error) {
      console.error('Error updating deal:', error);
      throw error;
    }
  },

  deleteDeal: async (dealId: string): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      return Promise.resolve();
    }

    const { error } = await supabase.from('deals').delete().eq('id', dealId);
    if (error) throw error;
  },

  updateRepQuota: async (repId: string, quota: number): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      return Promise.resolve();
    }

    const { error } = await supabase
      .from('sales_reps')
      .update({ quota: quota })
      .eq('id', repId);
      
    if (error) throw error;
  }
};