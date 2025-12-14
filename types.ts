export enum DealStage {
  LEAD = 'Lead',
  QUALIFIED = 'Qualified',
  PROPOSAL = 'Proposal',
  NEGOTIATION = 'Negotiation',
  CLOSED_WON = 'Closed Won',
  CLOSED_LOST = 'Closed Lost'
}

export enum DealCategory {
  SOFTWARE = 'Software',
  HARDWARE = 'Hardware',
  SERVICES = 'Services',
  CLOUD = 'Cloud',
  CONSULTING = 'Consulting'
}

export interface Deal {
  id: string;
  customerName: string;
  title: string;
  value: number;
  stage: DealStage;
  category: DealCategory;
  assignedRepId: string;
  closeDate: string; // ISO Date string
  probability: number; // 0-100
  lastUpdated: string;
  stageHistory?: Record<string, string>; // Map of Stage -> ISO Date String
  notes?: string;
}

export interface SalesRep {
  id: string;
  name: string;
  avatar: string;
  quota: number; // Annual/Period Quota (e.g., 4.5 Cr)
  variablePayPool: number; // The max variable pay amount (20% of package)
  teamMembers?: string[]; // Names of team members if applicable
}

export interface SalesMetrics {
  totalRevenue: number;
  totalPipelineValue: number;
  winRate: number;
  averageDealSize: number;
}