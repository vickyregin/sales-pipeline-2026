import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Deal, 
  DealStage, 
  SalesRep, 
  SalesMetrics,
  DealCategory,
  BusinessType
} from './types';
import { 
  MOCK_REPS, 
  INITIAL_DEALS, 
  STAGE_CONFIG 
} from './constants';
import { 
  LayoutDashboard, 
  Kanban, 
  Users, 
  TrendingUp, 
  Plus, 
  Activity, 
  Sparkles,
  RefreshCcw,
  Table2,
  Trash2,
  Target,
  Trophy,
  BarChart2,
  Search,
  PieChart as PieChartIcon,
  Database,
  Filter,
  Calendar,
  Zap,
  ChevronLeft,
  ChevronRight,
  Briefcase
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { DealCard } from './components/DealCard';
import { IncentiveCalculator } from './components/IncentiveCalculator';
import { AddDealModal } from './components/AddDealModal';
import { SchemaModal } from './components/SchemaModal';
import { analyzePipeline } from './services/geminiService';
import { api } from './services/api';
import { supabase, isSupabaseConfigured } from './services/supabase';

const ITEMS_PER_PAGE = 8;

const App = () => {
  // State
  const [deals, setDeals] = useState<Deal[]>([]);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'pipeline' | 'incentives' | 'customers'>('dashboard');
  const [selectedRepId, setSelectedRepId] = useState<string>('');
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [lastPulse, setLastPulse] = useState<string>('');
  
  // Pipeline Filters
  const [pipelineSearchTerm, setPipelineSearchTerm] = useState('');
  const [pipelineCategoryFilter, setPipelineCategoryFilter] = useState<string>('all');
  const [pipelineRepFilter, setPipelineRepFilter] = useState<string>('all');

  // Customer Filters & Pagination
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerStageFilter, setCustomerStageFilter] = useState<string>('all');
  const [customerCategoryFilter, setCustomerCategoryFilter] = useState<string>('all');
  const [customerRepFilter, setCustomerRepFilter] = useState<string>('all');
  const [customerPage, setCustomerPage] = useState(1);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const [repsData, dealsData] = await Promise.all([
          api.fetchReps(),
          api.fetchDeals()
        ]);
        setReps(repsData);
        setDeals(dealsData);
        if (repsData.length > 0 && !selectedRepId) {
          setSelectedRepId(repsData[0].id);
        }
      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCustomerPage(1);
  }, [customerSearchTerm, customerStageFilter, customerCategoryFilter, customerRepFilter]);

  // Pulse simulation function for manual or automatic trigger
  const triggerPulse = useCallback(() => {
    setDeals(prev => {
        const activeDeals = prev.filter(d => d.stage !== DealStage.CLOSED_WON && d.stage !== DealStage.CLOSED_LOST);
        if (activeDeals.length === 0) return prev;
        
        const randomIdx = Math.floor(Math.random() * activeDeals.length);
        const randomDeal = activeDeals[randomIdx];
        
        if (editingDeal && randomDeal.id === editingDeal.id) return prev;

        const updatedDeals = prev.map(d => {
          if (d.id === randomDeal.id) {
            const change = Math.random() > 0.5 ? 2 : -2;
            const newProb = Math.min(Math.max(d.probability + change, 5), 95);
            return { ...d, probability: newProb, lastUpdated: new Date().toISOString() };
          }
          return d;
        });
        setLastPulse(new Date().toLocaleTimeString());
        return updatedDeals;
    });
  }, [editingDeal]);

  // Derived State
  const selectedRep = useMemo(() => 
    reps.find(r => r.id === selectedRepId) || reps[0] || MOCK_REPS[0], 
  [reps, selectedRepId]);

  // Helper formatter for INR
  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Derived Metrics
  const metrics = useMemo<SalesMetrics>(() => {
    const closedWon = deals.filter(d => d.stage === DealStage.CLOSED_WON);
    const activeDeals = deals.filter(d => d.stage !== DealStage.CLOSED_WON && d.stage !== DealStage.CLOSED_LOST);
    
    return {
      totalRevenue: closedWon.reduce((acc, d) => acc + d.value, 0),
      totalPipelineValue: activeDeals.reduce((acc, d) => acc + d.value, 0),
      winRate: (closedWon.length / (deals.filter(d => d.stage === DealStage.CLOSED_WON || d.stage === DealStage.CLOSED_LOST).length || 1)) * 100,
      averageDealSize: closedWon.length ? closedWon.reduce((acc, d) => acc + d.value, 0) / closedWon.length : 0
    };
  }, [deals]);

  // Chart Data: Revenue by Stage
  const revenueByStageData = STAGE_CONFIG.map(stage => ({
    name: stage.label,
    value: deals.filter(d => d.stage === stage.id).reduce((sum, d) => sum + d.value, 0),
    color: stage.color.split(' ')[0].replace('bg-', '') 
  }));

  // Chart Data: Revenue by Business Type (New vs Existing)
  const revenueByBusinessTypeData = useMemo(() => {
    return [BusinessType.NEW, BusinessType.EXISTING].map(type => ({
        name: type,
        value: deals.filter(d => d.businessType === type).reduce((sum, d) => sum + d.value, 0)
    })).filter(item => item.value > 0);
  }, [deals]);

  // Chart Data: Revenue by Category
  const revenueByCategoryData = useMemo(() => {
    return Object.values(DealCategory).map(cat => ({
      name: cat,
      value: deals.filter(d => d.category === cat).reduce((sum, d) => sum + d.value, 0),
    })).filter(item => item.value > 0);
  }, [deals]);

  // Chart Data: Monthly Trends
  const monthlyRevenueData = useMemo(() => {
    const data: Record<string, number> = {};
    const sortedDeals = [...deals]
        .filter(d => d.stage === DealStage.CLOSED_WON)
        .sort((a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime());

    sortedDeals.forEach(d => {
        const date = new Date(d.closeDate);
        const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        data[key] = (data[key] || 0) + d.value;
    });

    return Object.keys(data).map(key => ({
        name: key,
        revenue: data[key]
    }));
  }, [deals]);

  // Team Performance Data
  const repPerformance = useMemo(() => {
    return reps.map(rep => {
      const repDeals = deals.filter(d => d.assignedRepId === rep.id);
      const won = repDeals.filter(d => d.stage === DealStage.CLOSED_WON);
      const lost = repDeals.filter(d => d.stage === DealStage.CLOSED_LOST);
      const active = repDeals.filter(d => d.stage !== DealStage.CLOSED_WON && d.stage !== DealStage.CLOSED_LOST);
      const revenue = won.reduce((acc, d) => acc + d.value, 0);
      const pipeline = active.reduce((acc, d) => acc + d.value, 0);
      const totalClosed = won.length + lost.length;
      const winRate = totalClosed > 0 ? (won.length / totalClosed) * 100 : 0;
      const achievement = (revenue / rep.quota) * 100;
      return { ...rep, revenue, pipeline, winRate, achievement };
    }).sort((a, b) => b.achievement - a.achievement);
  }, [deals, reps]);

  // Filtered Deals for Pipeline View
  const filteredPipelineDeals = useMemo(() => {
    return deals.filter(deal => {
      const term = pipelineSearchTerm.toLowerCase();
      const matchesSearch = (
        deal.customerName.toLowerCase().includes(term) ||
        deal.title.toLowerCase().includes(term) ||
        (deal.notes && deal.notes.toLowerCase().includes(term))
      );
      const matchesCategory = pipelineCategoryFilter === 'all' || deal.category === pipelineCategoryFilter;
      const matchesRep = pipelineRepFilter === 'all' || deal.assignedRepId === pipelineRepFilter;
      return matchesSearch && matchesCategory && matchesRep;
    });
  }, [deals, pipelineSearchTerm, pipelineCategoryFilter, pipelineRepFilter]);

  // Filtered & Paginated Deals for Customer View
  const filteredCustomerDeals = useMemo(() => {
    return deals.filter(deal => {
      const term = customerSearchTerm.toLowerCase();
      const matchesSearch = (
        deal.customerName.toLowerCase().includes(term) ||
        deal.title.toLowerCase().includes(term) ||
        deal.category.toLowerCase().includes(term)
      );
      const matchesStage = customerStageFilter === 'all' || deal.stage === customerStageFilter;
      const matchesCategory = customerCategoryFilter === 'all' || deal.category === customerCategoryFilter;
      const matchesRep = customerRepFilter === 'all' || deal.assignedRepId === customerRepFilter;
      return matchesSearch && matchesStage && matchesCategory && matchesRep;
    }).sort((a,b) => b.value - a.value);
  }, [deals, customerSearchTerm, customerStageFilter, customerCategoryFilter, customerRepFilter]);

  const paginatedCustomerDeals = useMemo(() => {
    const startIndex = (customerPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomerDeals.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCustomerDeals, customerPage]);

  const totalCustomerPages = Math.ceil(filteredCustomerDeals.length / ITEMS_PER_PAGE);

  // Handlers
  const handleUpdateQuota = async (repId: string, newQuota: number) => {
    setReps(prev => prev.map(r => r.id === repId ? { ...r, quota: newQuota } : r));
    try {
      await api.updateRepQuota(repId, newQuota);
    } catch (e) {
      console.error("Failed to update quota", e);
      const originalReps = await api.fetchReps();
      setReps(originalReps);
    }
  };

  const handleMoveStage = async (dealId: string, direction: 'next' | 'prev') => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    const stages = Object.values(DealStage);
    const currentIndex = stages.indexOf(deal.stage);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= stages.length) newIndex = stages.length - 1;
    const newStage = stages[newIndex];
    const timestamp = new Date().toISOString();
    const updatedDeal = { 
        ...deal, 
        stage: newStage, 
        lastUpdated: timestamp,
        stageHistory: { ...(deal.stageHistory || {}), [newStage]: timestamp }
    };
    setDeals(prev => prev.map(d => d.id === dealId ? updatedDeal : d));
    try {
      await api.updateDeal(updatedDeal);
    } catch (e) {
      console.error("Failed to move stage", e);
      setDeals(prev => prev.map(d => d.id === dealId ? deal : d));
    }
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setIsAddModalOpen(true);
  };

  const handleDeleteDeal = async (dealId: string) => {
    const previousDeals = [...deals];
    setDeals(prev => prev.filter(d => d.id !== dealId));
    setIsAddModalOpen(false);
    setEditingDeal(null);
    try {
      await api.deleteDeal(dealId);
    } catch (e) {
      setDeals(previousDeals);
      alert("Failed to delete deal");
    }
  };

  const handleNoteUpdate = async (dealId: string, newNotes: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    const updatedDeal = { ...deal, notes: newNotes, lastUpdated: new Date().toISOString() };
    setDeals(prev => prev.map(d => d.id === dealId ? updatedDeal : d));
    try {
        await api.updateDeal(updatedDeal);
    } catch (e) {
        console.error("Failed to update note", e);
        setDeals(prev => prev.map(d => d.id === dealId ? deal : d));
    }
  };

  const handleSaveDeal = async (dealData: Omit<Deal, 'id' | 'lastUpdated' | 'closeDate'>, stageDate?: string) => {
    const specificDate = stageDate 
        ? new Date(stageDate + 'T12:00:00Z').toISOString()
        : new Date().toISOString();
    const currentTimestamp = new Date().toISOString();

    if (editingDeal) {
      const updatedHistory = { 
          ...(editingDeal.stageHistory || {}),
          [dealData.stage]: specificDate
      };
      const updatedDeal = { 
          ...editingDeal, 
          ...dealData, 
          lastUpdated: currentTimestamp,
          stageHistory: updatedHistory
      };
      const previousDeals = [...deals];
      setDeals(prev => prev.map(d => d.id === editingDeal.id ? updatedDeal : d));
      try {
        await api.updateDeal(updatedDeal as Deal);
      } catch (e) {
        setDeals(previousDeals);
        alert("Failed to update deal");
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      const newDealPayload = {
        ...dealData,
        closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        stageHistory: { [dealData.stage]: specificDate }
      };
      const tempDeal: Deal = { ...newDealPayload, id: tempId, lastUpdated: currentTimestamp } as Deal;
      setDeals(prev => [...prev, tempDeal]);
      try {
        const savedDeal = await api.createDeal(newDealPayload);
        if (savedDeal) {
            setDeals(prev => prev.map(d => d.id === tempId ? savedDeal : d));
        }
      } catch (e) {
        setDeals(prev => prev.filter(d => d.id !== tempId));
        alert("Failed to create deal");
      }
    }
  };

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    const analysis = await analyzePipeline(deals, reps);
    setAiAnalysis(analysis);
    setIsAnalyzing(false);
  };

  const toggleLiveMode = () => {
    setIsLiveMode(!isLiveMode);
  };

  // Live Mode Setup
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let channel: any;
    if (isLiveMode) {
      if (supabase) {
        channel = supabase
          .channel('realtime-deals')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => { api.fetchDeals().then(setDeals); })
          .subscribe();
      } else {
        interval = setInterval(() => { if (Math.random() < 0.25) triggerPulse(); }, 5000);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [isLiveMode, triggerPulse]);

  if (isLoadingData) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Synchronizing SalesFlow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-blue-500" /> SalesFlow
          </h1>
          <button onClick={() => setIsSchemaModalOpen(true)} className={`text-[10px] font-mono mt-1 flex items-center gap-1 hover:underline cursor-pointer ${isSupabaseConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
             <Database size={10} /> {isSupabaseConfigured ? "Live Sync Enabled" : "Mock Mode (Click Setup)"}
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'pipeline', label: 'Pipeline', icon: Kanban },
            { id: 'customers', label: 'Customers', icon: Table2 },
            { id: 'incentives', label: 'Incentives', icon: Users },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className={`bg-slate-800/50 rounded-lg p-3 border transition-colors ${isLiveMode ? 'border-emerald-500/30' : 'border-slate-700'}`}>
             <div className="flex items-center justify-between mb-2">
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Engine</span>
               <button onClick={toggleLiveMode} className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${isLiveMode ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                 <span className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${isLiveMode ? 'translate-x-5' : 'translate-x-1'}`} />
               </button>
             </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px]">
                  <Activity size={12} className={isLiveMode ? "text-emerald-400 animate-pulse-subtle" : "text-slate-500"} />
                  <span className={isLiveMode ? "text-emerald-400 font-medium" : "text-slate-500"}>{isLiveMode ? "Active" : "Paused"}</span>
                </div>
                {isLiveMode && !supabase && (
                  <button onClick={triggerPulse} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Force Data Pulse">
                    <Zap size={12} />
                  </button>
                )}
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab}</h2>
            {activeTab === 'pipeline' && (
              <div className="flex items-center gap-2 text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
                 <Target size={14} /> {deals.filter(d => d.stage !== DealStage.CLOSED_WON && d.stage !== DealStage.CLOSED_LOST).length} Open Deals
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => { setEditingDeal(null); setIsAddModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-blue-500/20 active:scale-95">
               <Plus size={16} /> New Deal
             </button>
             <div className="h-9 w-9 bg-gradient-to-tr from-slate-200 to-slate-100 rounded-full flex items-center justify-center text-slate-700 font-bold border-2 border-white shadow-sm ring-1 ring-slate-200">SF</div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Total Revenue', value: formatINR(metrics.totalRevenue), color: 'text-emerald-600', sub: 'Closed Won' },
                  { label: 'Pipeline Value', value: formatINR(metrics.totalPipelineValue), color: 'text-blue-600', sub: 'Open Opportunities' },
                  { label: 'Win Rate', value: `${metrics.winRate.toFixed(1)}%`, color: 'text-indigo-600', sub: 'Historical' },
                  { label: 'Avg Deal Size', value: formatINR(metrics.averageDealSize), color: 'text-purple-600', sub: 'Per Won Deal' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition-colors cursor-default group">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color} group-hover:scale-105 transition-transform origin-left`}>{stat.value}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium italic">{stat.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2 uppercase tracking-wide">
                        <BarChart2 size={18} className="text-blue-500"/> Pipeline Stage Mix
                      </h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={revenueByStageData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} interval={0} />
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0'}} formatter={(value: number) => formatINR(value)} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {revenueByStageData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#cbd5e1', '#60a5fa', '#818cf8', '#a78bfa', '#10b981', '#ef4444'][index]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2 uppercase tracking-wide">
                         <Briefcase size={18} className="text-orange-500"/> New vs Existing Business
                      </h3>
                      <div className="h-48">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueByBusinessTypeData} layout="vertical">
                               <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                               <XAxis type="number" hide />
                               <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10, fill: '#64748b'}} />
                               <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0'}} formatter={(value: number) => formatINR(value)} />
                               <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                  <Cell fill="#f97316" />
                                  <Cell fill="#94a3b8" />
                               </Bar>
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2 uppercase tracking-wide">
                       <TrendingUp size={18} className="text-emerald-500"/> Revenue Trajectory
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyRevenueData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(val) => `₹${(val/10000000).toFixed(1)}Cr`} />
                          <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} formatter={(value: number) => formatINR(value)} />
                          <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} dot={{r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 p-6 rounded-xl shadow-xl text-white flex flex-col flex-1 max-h-[440px] border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Sparkles className="text-yellow-400" size={20} /> AI Strategy
                      </h3>
                      <button onClick={runAiAnalysis} disabled={isAnalyzing} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all active:scale-90">
                        <RefreshCcw size={16} className={isAnalyzing ? "animate-spin" : ""} />
                      </button>
                    </div>
                    <div className="flex-1 bg-black/20 rounded-lg p-4 text-sm leading-relaxed overflow-y-auto scrollbar-hide border border-white/5">
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 opacity-80">
                          <div className="w-8 h-8 border-3 border-white/10 border-t-yellow-400 rounded-full animate-spin"></div>
                          <p className="font-medium text-xs tracking-wider animate-pulse uppercase">Syncing AI Brain...</p>
                        </div>
                      ) : aiAnalysis ? (
                        <div className="prose prose-invert prose-sm">
                          <pre className="whitespace-pre-wrap font-sans text-indigo-50">{aiAnalysis}</pre>
                        </div>
                      ) : (
                        <div className="text-center opacity-70 mt-12 flex flex-col items-center gap-4">
                          <Sparkles className="text-indigo-300" size={32} />
                          <p className="text-xs">Launch AI insights for real-time risk assessment and next-best-action guidance for your pipeline.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                   <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                     <Trophy className="text-amber-500" size={18} /> Rep Performance Matrix
                   </h3>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead className="bg-white border-b border-slate-100">
                         <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Representative</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Quota</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Revenue</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Achievement</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Pipeline</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Win Rate</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {repPerformance.map((rep, idx) => (
                           <tr key={rep.id} className="hover:bg-slate-50 group transition-colors">
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="relative">
                                       <img src={rep.avatar} alt={rep.name} className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200" />
                                       {idx === 0 && <div className="absolute -top-1 -right-1 bg-amber-400 text-white rounded-full p-0.5 shadow-sm"><Trophy size={10} fill="currentColor"/></div>}
                                    </div>
                                    <div>
                                       <div className="font-bold text-slate-900 text-sm">{rep.name}</div>
                                       {rep.teamMembers && <div className="text-[10px] text-slate-500 font-medium">Team: {rep.teamMembers.join(', ')}</div>}
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-right text-slate-500 font-mono text-xs">{formatINR(rep.quota)}</td>
                              <td className="px-6 py-4 text-right font-bold text-slate-800 text-sm">{formatINR(rep.revenue)}</td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                                       <div className={`h-full rounded-full transition-all duration-1000 ${rep.achievement >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{width: `${Math.min(rep.achievement, 100)}%`}} />
                                    </div>
                                    <span className={`text-xs font-bold ${rep.achievement >= 100 ? 'text-emerald-600' : 'text-slate-600'}`}>{rep.achievement.toFixed(1)}%</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-right text-slate-600 text-xs font-medium">{formatINR(rep.pipeline)}</td>
                              <td className="px-6 py-4 text-right">
                                 <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight ${rep.winRate > 60 ? 'bg-emerald-100 text-emerald-700' : rep.winRate > 30 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{rep.winRate.toFixed(1)}%</span>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="h-full flex flex-col animate-in slide-in-from-right duration-500">
              <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col lg:flex-row gap-3 items-start lg:items-center">
                  <div className="relative flex-1 w-full lg:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Filter pipeline deals..." value={pipelineSearchTerm} onChange={(e) => setPipelineSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full bg-slate-50" />
                  </div>
                  <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                      <select value={pipelineCategoryFilter} onChange={(e) => setPipelineCategoryFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-600">
                        <option value="all">All Sectors</option>
                        {Object.values(DealCategory).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select value={pipelineRepFilter} onChange={(e) => setPipelineRepFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-600">
                        <option value="all">All Owners</option>
                        {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                  </div>
              </div>

              <div className="flex-1 overflow-x-auto p-4">
                <div className="flex gap-4 min-w-max h-full">
                  {STAGE_CONFIG.map(stage => (
                    <div key={stage.id} className="w-80 flex flex-col bg-slate-100 rounded-xl max-h-full border border-slate-200">
                      <div className={`p-4 border-b border-slate-200 rounded-t-xl sticky top-0 bg-slate-100/90 backdrop-blur-sm z-10 flex justify-between items-center`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${stage.color.split(' ')[0].replace('bg-', 'bg-')}`} />
                          <h3 className="font-bold text-xs uppercase tracking-widest text-slate-600">{stage.label}</h3>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-sm">
                          {filteredPipelineDeals.filter(d => d.stage === stage.id).length}
                        </span>
                      </div>
                      <div className="p-3 space-y-3 overflow-y-auto scrollbar-hide flex-1">
                        {filteredPipelineDeals.filter(deal => deal.stage === stage.id).map(deal => (
                          <DealCard key={deal.id} deal={deal} onMoveStage={handleMoveStage} onEdit={handleEditDeal} onNoteUpdate={handleNoteUpdate} />
                        ))}
                      </div>
                      <div className="p-3 bg-white/50 border-t border-slate-200 rounded-b-xl">
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Total {formatINR(filteredPipelineDeals.filter(d => d.stage === stage.id).reduce((s, d) => s + d.value, 0))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="flex flex-col h-full animate-in zoom-in-95 duration-500">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                <div className="p-6 border-b border-slate-200 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                     <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Customer Registry & Projected Yields</h3>
                     <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded border border-slate-100">Showing {paginatedCustomerDeals.length} of {filteredCustomerDeals.length} Customers</span>
                  </div>
                  <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="relative flex-1 w-full lg:w-auto">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input type="text" placeholder="Search accounts..." value={customerSearchTerm} onChange={(e) => setCustomerSearchTerm(e.target.value)} className="pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none w-full bg-white shadow-sm" />
                    </div>
                    <div className="flex gap-2">
                       <select value={customerStageFilter} onChange={(e) => setCustomerStageFilter(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-200 rounded-md outline-none bg-white font-medium text-slate-500">
                          <option value="all">Any Stage</option>
                          {Object.values(DealStage).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={customerCategoryFilter} onChange={(e) => setCustomerCategoryFilter(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-200 rounded-md outline-none bg-white font-medium text-slate-500">
                          <option value="all">Any Sector</option>
                          {Object.values(DealCategory).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={customerRepFilter} onChange={(e) => setCustomerRepFilter(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-200 rounded-md outline-none bg-white font-medium text-slate-500">
                          <option value="all">Any Owner</option>
                          {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sector</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Value</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Prob.</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Proj. Vol</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedCustomerDeals.map(deal => (
                        <tr key={deal.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{deal.customerName}</div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">{deal.title}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded ${deal.businessType === BusinessType.NEW ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                              {deal.businessType === BusinessType.NEW ? 'New' : 'Existing'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase tracking-tighter">
                               {deal.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-700 text-sm">{formatINR(deal.value)}</td>
                          <td className="px-6 py-4 text-right text-slate-600 text-sm">{deal.probability}%</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900 text-sm">{formatINR(deal.value * (deal.probability / 100))}</td>
                          <td className="px-6 py-4 text-center">
                             <button onClick={() => handleEditDeal(deal)} className="text-blue-600 hover:text-blue-800 text-[11px] font-bold uppercase tracking-wider px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded transition-colors">Review</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {paginatedCustomerDeals.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
                      <Filter size={48} className="text-slate-200" />
                      <p className="text-sm font-medium">No customers found matching these criteria.</p>
                    </div>
                  )}
                </div>

                {/* Pagination Controls */}
                <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
                   <div className="text-xs text-slate-500 font-medium">
                     Page {customerPage} of {Math.max(1, totalCustomerPages)}
                   </div>
                   <div className="flex items-center gap-1">
                      <button 
                        disabled={customerPage === 1}
                        onClick={() => setCustomerPage(p => p - 1)}
                        className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      
                      {Array.from({ length: Math.max(1, totalCustomerPages) }).map((_, i) => (
                        <button 
                          key={i}
                          onClick={() => setCustomerPage(i + 1)}
                          className={`w-8 h-8 rounded-md text-xs font-bold transition-all ${customerPage === i + 1 ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'hover:bg-slate-100 text-slate-500'}`}
                        >
                          {i + 1}
                        </button>
                      ))}

                      <button 
                        disabled={customerPage >= totalCustomerPages}
                        onClick={() => setCustomerPage(p => p + 1)}
                        className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600"
                      >
                        <ChevronRight size={18} />
                      </button>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'incentives' && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-700">
              <div className="flex gap-4 mb-8 overflow-x-auto pb-4 scrollbar-hide">
                {reps.map(rep => (
                  <button key={rep.id} onClick={() => setSelectedRepId(rep.id)} className={`flex items-center gap-4 px-6 py-4 rounded-xl border transition-all min-w-[220px] ${selectedRepId === rep.id ? 'bg-white border-blue-500 ring-4 ring-blue-500/10 shadow-lg -translate-y-1' : 'bg-white border-slate-200 opacity-60 hover:opacity-100'}`}>
                    <img src={rep.avatar} alt={rep.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                    <div className="text-left">
                      <div className={`font-bold text-sm ${selectedRepId === rep.id ? 'text-blue-700' : 'text-slate-700'}`}>{rep.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Plan Status</div>
                    </div>
                  </button>
                ))}
              </div>
              <IncentiveCalculator rep={selectedRep} deals={deals} onUpdateQuota={handleUpdateQuota} key={selectedRep.id} />
            </div>
          )}
        </div>
      </main>
      
      <AddDealModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={handleSaveDeal} onDelete={handleDeleteDeal} reps={reps} initialData={editingDeal} />
      <SchemaModal isOpen={isSchemaModalOpen} onClose={() => setIsSchemaModalOpen(false)} />
    </div>
  );
};

export default App;