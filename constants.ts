import { Deal, DealStage, SalesRep, DealCategory } from './types';

// 1 Crore = 10,000,000
const CR = 10000000;

export const MOCK_REPS: SalesRep[] = [
  {
    id: 'george',
    name: 'George',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=George',
    quota: 4 * CR, // 4 Cr
    variablePayPool: 0.2 * 4 * CR * 0.1, // Approx variable component calculation for demo
  },
  {
    id: 'hari',
    name: 'Hari',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hari',
    quota: 4.5 * CR, // 4.5 Cr
    variablePayPool: 0.2 * 4.5 * CR * 0.1,
  },
  {
    id: 'team-dva',
    name: 'Team DVA',
    teamMembers: ['Dinesh', 'Venkat', 'Arjun'],
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=DVA',
    quota: 4.5 * CR,
    variablePayPool: 0.2 * 4.5 * CR * 0.1,
  },
  {
    id: 'team-la',
    name: 'Team LA',
    teamMembers: ['Logesh', 'Ajay'],
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=LA',
    quota: 4.5 * CR,
    variablePayPool: 0.2 * 4.5 * CR * 0.1,
  },
  {
    id: 'team-snv',
    name: 'Team SNV',
    teamMembers: ['Sasi', 'Nirupama', 'Vicky'],
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=SNV',
    quota: 4.5 * CR,
    variablePayPool: 0.2 * 4.5 * CR * 0.1,
  }
];

export const INITIAL_DEALS: Deal[] = [
  {
    id: 'd-1',
    customerName: 'Tech Mahindra',
    title: 'Enterprise License',
    value: 0.4 * CR,
    stage: DealStage.CLOSED_WON,
    category: DealCategory.SOFTWARE,
    assignedRepId: 'george',
    closeDate: '2023-11-15',
    probability: 100,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'd-2',
    customerName: 'Infosys Ltd',
    title: 'Cloud Transformation',
    value: 0.8 * CR,
    stage: DealStage.NEGOTIATION,
    category: DealCategory.CLOUD,
    assignedRepId: 'hari',
    closeDate: '2023-11-20',
    probability: 80,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'd-3',
    customerName: 'Wipro',
    title: 'Hardware Upgrade',
    value: 1.2 * CR,
    stage: DealStage.PROPOSAL,
    category: DealCategory.HARDWARE,
    assignedRepId: 'team-dva',
    closeDate: '2023-12-01',
    probability: 60,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'd-4',
    customerName: 'HCL Tech',
    title: 'AI Integration',
    value: 2.5 * CR,
    stage: DealStage.LEAD,
    category: DealCategory.SERVICES,
    assignedRepId: 'team-la',
    closeDate: '2024-01-15',
    probability: 20,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'd-5',
    customerName: 'TCS',
    title: 'Security Audit',
    value: 0.35 * CR,
    stage: DealStage.CLOSED_WON,
    category: DealCategory.CONSULTING,
    assignedRepId: 'team-snv',
    closeDate: '2023-10-01',
    probability: 100,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'd-6',
    customerName: 'Mindtree',
    title: 'Consulting Retainer',
    value: 0.65 * CR,
    stage: DealStage.NEGOTIATION,
    category: DealCategory.CONSULTING,
    assignedRepId: 'george',
    closeDate: '2023-12-10',
    probability: 75,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'd-7',
    customerName: 'L&T Infotech',
    title: 'Infrastructure Deal',
    value: 1.5 * CR,
    stage: DealStage.PROPOSAL,
    category: DealCategory.HARDWARE,
    assignedRepId: 'hari',
    closeDate: '2024-02-15',
    probability: 50,
    lastUpdated: new Date().toISOString()
  }
];

export const STAGE_CONFIG = [
  { id: DealStage.LEAD, label: 'Lead', color: 'bg-slate-100 border-slate-200' },
  { id: DealStage.QUALIFIED, label: 'Qualified', color: 'bg-blue-50 border-blue-200' },
  { id: DealStage.PROPOSAL, label: 'Proposal', color: 'bg-indigo-50 border-indigo-200' },
  { id: DealStage.NEGOTIATION, label: 'Negotiation', color: 'bg-purple-50 border-purple-200' },
  { id: DealStage.CLOSED_WON, label: 'Closed Won', color: 'bg-emerald-50 border-emerald-200' },
  { id: DealStage.CLOSED_LOST, label: 'Closed Lost', color: 'bg-red-50 border-red-200' },
];