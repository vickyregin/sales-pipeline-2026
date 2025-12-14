import React, { useState, useEffect, useMemo } from 'react';
import { 
  Deal, 
  DealStage, 
  SalesRep, 
  SalesMetrics,
  DealCategory
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
  IndianRupee,
  Table2,
  Trash2,
  Target,
  Trophy,
  BarChart2,
  Search,
  PieChart as PieChartIcon,
  Database,
  Filter,
  Calendar
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
  Cell,
  Legend
} from 'recharts';
import { DealCard } from './components/DealCard';
import { IncentiveCalculator } from './components/IncentiveCalculator';
import { AddDealModal } from './components/AddDealModal';
import { analyzePipeline } from './services/geminiService';
import { api } from './services/api';
import { supabase, isSupabaseConfigured } from './services/supabase';

const App = () => {
  // State
  const [deals, setDeals] = useState<Deal[]>([]);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'pipeline' | 'incentives' | 'customers'>('dashboard');
  const [selectedRepId, setSelectedRepId] = useState<string>('');
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  
  // Pipeline Filters
  const [pipelineSearchTerm, setPipelineSearchTerm] = useState('');
  const [pipelineCategoryFilter, setPipelineCategoryFilter] = useState<string>('all');
  const [pipelineRepFilter, setPipelineRepFilter] = useState<string>('all');

  // Customer Filters
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerStageFilter, setCustomerStageFilter] = useState<string>('all');
  const [customerCategoryFilter, setCustomerCategoryFilter] = useState<string>('all');
  const [customerRepFilter, setCustomerRepFilter] = useState<string>('all');

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
        const key = date.toLocaleString('default', { month: 'short', year: '2-digit' }); // e.g., Nov 23
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
    }).sort((a, b) => b.achievement - a.achievement); // Rank by achievement
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

  // Filtered Deals for Customer Search
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

  // Handlers
  const handleUpdateQuota = async (repId: string, newQuota: number) => {
    // Optimistic Update
    setReps(prev => prev.map(r => r.id === repId ? { ...r, quota: newQuota } : r));
    
    // API Call
    try {
      await api.updateRepQuota(repId, newQuota);
    } catch (e) {
      // Revert if failed
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
        stageHistory: {
            ...deal.stageHistory,
            [newStage]: timestamp
        }
    };

    // Optimistic Update
    setDeals(prev => prev.map(d => d.id === dealId ? updatedDeal : d));

    try {
      await api.updateDeal(updatedDeal);
    } catch (e) {
      console.error("Failed to move stage", e);
      setDeals(prev => prev.map(d => d.id === dealId ? deal : d)); // Revert
    }
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setIsAddModalOpen(true);
  };

  const handleDeleteDeal = async (dealId: string) => {
    // Optimistic
    const previousDeals = [...deals];
    setDeals(prev => prev.filter(d => d.id !== dealId));
    setIsAddModalOpen(false);
    setEditingDeal(null);

    try {
      await api.deleteDeal(dealId);
    } catch (e) {
      setDeals(previousDeals); // Revert
      alert("Failed to delete deal");
    }
  };

  const handleNoteUpdate = async (dealId: string, newNotes: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

    const updatedDeal = { ...deal, notes: newNotes, lastUpdated: new Date().toISOString() };
    
    // Optimistic Update
    setDeals(prev => prev.map(d => d.id === dealId ? updatedDeal : d));
    
    try {
        await api.updateDeal(updatedDeal);
    } catch (e) {
        console.error("Failed to update note", e);
        // Silently revert or show toast - reverting for now
        setDeals(prev => prev.map(d => d.id === dealId ? deal : d));
    }
  };

  const handleSaveDeal = async (dealData: Omit<Deal, 'id' | 'lastUpdated' | 'closeDate'>, stageDate?: string) => {
    // If a specific date is provided (YYYY-MM-DD from modal), append time and use it.
    // Otherwise use current timestamp.
    const specificDate = stageDate 
        ? new Date(stageDate + 'T12:00:00Z').toISOString() // Add noon time to avoid timezone shifts affecting date
        : new Date().toISOString();

    const currentTimestamp = new Date().toISOString();

    if (editingDeal) {
      // Use the provided date for the new stage entry/update
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
      
      // Optimistic
      const previousDeals = [...deals];
      setDeals(prev => prev.map(d => d.id === editingDeal.id ? updatedDeal : d));
      
      try {
        await api.updateDeal(updatedDeal);
      } catch (e) {
        setDeals(previousDeals);
        alert("Failed to update deal");
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      const newDealPayload = {
        ...dealData,
        closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        stageHistory: {
            [dealData.stage]: specificDate
        }
      };
      
      // Temporary UI update
      const tempDeal: Deal = {
        ...newDealPayload,
        id: tempId,
        lastUpdated: currentTimestamp
      };
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

  // Live Mode: Real-time (Supabase) or Simulation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let channel: any;

    if (isLiveMode) {
      if (supabase) {
        // Real-time Supabase Subscription
        channel = supabase
          .channel('realtime-deals')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'deals' },
            (payload) => {
              // Refresh data on any change for consistency
              api.fetchDeals().then(setDeals);
            }
          )
          .subscribe();
      } else {
        // Simulation Mode (Demo)
        interval = setInterval(() => {
          const random = Math.random();
          
          if (random < 0.3) {
            setDeals(prev => {
               const activeDeals = prev.filter(d => d.stage !== DealStage.CLOSED_WON && d.stage !== DealStage.CLOSED_LOST);
               if (activeDeals.length === 0) return prev;
               
               const randomDeal = activeDeals[Math.floor(Math.random() * activeDeals.length)];
               if (editingDeal && randomDeal.id === editingDeal.id) return prev;
  
               const updatedDeals = prev.map(d => {
                 if (d.id === randomDeal.id) {
                   const change = Math.random() > 0.5 ? 5 : -5;
                   const newProb = Math.min(Math.max(d.probability + change, 0), 100);
                   return { ...d, probability: newProb, lastUpdated: new Date().toISOString() };
                 }
                 return d;
               });
               return updatedDeals;
            });
          } 
        }, 3000);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [isLiveMode, editingDeal]);

  if (isLoadingData) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading SalesFlow...</p>
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
          {isSupabaseConfigured ? (
             <span className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
               <Database size={10} /> Connected
             </span>
          ) : (
             <span className="text-[10px] text-amber-400 font-mono mt-1 flex items-center gap-1">
               <Database size={10} /> Demo Mode
             </span>
          )}
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('pipeline')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'pipeline' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800'}`}
          >
            <Kanban size={20} /> Pipeline
          </button>
          <button 
            onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'customers' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800'}`}
          >
            <Table2 size={20} /> Customers
          </button>
          <button 
            onClick={() => setActiveTab('incentives')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'incentives' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800'}`}
          >
            <Users size={20} /> Rep Incentives
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="bg-slate-800 rounded-lg p-3">
             <div className="flex items-center justify-between mb-2">
               <span className="text-xs font-semibold text-slate-400">LIVE DATA FEED</span>
               <button 
                onClick={toggleLiveMode}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isLiveMode ? 'bg-emerald-500' : 'bg-slate-600'}`}
               >
                 <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isLiveMode ? 'translate-x-5' : 'translate-x-1'}`} />
               </button>
             </div>
             <div className="flex items-center gap-2 text-xs">
               <Activity size={14} className={isLiveMode ? "text-emerald-400 animate-pulse" : "text-slate-500"} />
               {isLiveMode ? (supabase ? "Real-time Sync" : "Simulating Updates") : "Feed paused"}
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab} Overview</h2>
          <div className="flex items-center gap-4">
             <button 
               onClick={() => {
                 setEditingDeal(null);
                 setIsAddModalOpen(true);
               }}
               className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
             >
               <Plus size={16} /> Add Deal
             </button>
             <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold border-2 border-white shadow-sm">
               SF
             </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-auto p-8">
          
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Total Revenue', value: formatINR(metrics.totalRevenue), color: 'text-emerald-600' },
                  { label: 'Pipeline Value', value: formatINR(metrics.totalPipelineValue), color: 'text-blue-600' },
                  { label: 'Win Rate', value: `${metrics.winRate.toFixed(1)}%`, color: 'text-indigo-600' },
                  { label: 'Avg Deal Size', value: formatINR(metrics.averageDealSize), color: 'text-purple-600' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 font-medium mb-1">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Charts Area */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Top Row Charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pipeline Value Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <BarChart2 size={20} className="text-slate-400"/> Pipeline by Stage
                      </h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={revenueByStageData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} interval={0} />
                            <Tooltip 
                              cursor={{fill: '#f1f5f9'}}
                              contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                              formatter={(value: number) => formatINR(value)}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {revenueByStageData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#94a3b8', '#60a5fa', '#818cf8', '#a78bfa', '#34d399', '#f87171'][index]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Revenue by Category Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                         <PieChartIcon size={20} className="text-purple-500"/> Revenue by Business Line
                      </h3>
                      <div className="h-48">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueByCategoryData} layout="vertical">
                               <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                               <XAxis type="number" hide />
                               <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10, fill: '#64748b'}} />
                               <Tooltip 
                                  cursor={{fill: '#f1f5f9'}}
                                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                  formatter={(value: number) => formatINR(value)}
                               />
                               <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Trend Chart */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                       <TrendingUp size={20} className="text-emerald-500"/> Monthly Revenue Report
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyRevenueData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(val) => `₹${(val/10000000).toFixed(1)}Cr`} />
                          <Tooltip 
                             contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                             formatter={(value: number) => formatINR(value)}
                          />
                          <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981'}} activeDot={{r: 6}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* AI Insights Panel */}
                <div className="flex flex-col gap-6">
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-xl shadow-lg text-white flex flex-col flex-1 max-h-[400px]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Sparkles className="text-yellow-300" /> AI Analyst
                      </h3>
                      <button 
                        onClick={runAiAnalysis}
                        disabled={isAnalyzing}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                      >
                        <RefreshCcw size={16} className={isAnalyzing ? "animate-spin" : ""} />
                      </button>
                    </div>
                    
                    <div className="flex-1 bg-white/10 rounded-lg p-4 text-sm leading-relaxed overflow-y-auto scrollbar-hide">
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 opacity-80">
                          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <p>Analyzing pipeline data...</p>
                        </div>
                      ) : aiAnalysis ? (
                        <div className="prose prose-invert prose-sm">
                          <pre className="whitespace-pre-wrap font-sans">{aiAnalysis}</pre>
                        </div>
                      ) : (
                        <div className="text-center opacity-70 mt-8">
                          <p>Click refresh to generate an executive summary of your current pipeline health.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Performance Matrix */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                   <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                     <Trophy className="text-amber-500" size={20} /> Team Efficiency & Performance Matrix
                   </h3>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200">
                         <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Representative</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Quota</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Revenue Closed</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Target Achievement</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Pipeline</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Win Rate</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {repPerformance.map((rep, idx) => (
                           <tr key={rep.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="relative">
                                       <img src={rep.avatar} alt={rep.name} className="w-8 h-8 rounded-full bg-slate-100" />
                                       {idx === 0 && <div className="absolute -top-1 -right-1 bg-amber-400 text-white rounded-full p-0.5"><Trophy size={10} fill="currentColor"/></div>}
                                    </div>
                                    <div>
                                       <div className="font-semibold text-slate-900">{rep.name}</div>
                                       {rep.teamMembers && <div className="text-xs text-slate-500">{rep.teamMembers.length} Members</div>}
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-right text-slate-500 font-mono text-xs">
                                 {formatINR(rep.quota)}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-slate-700">
                                 {formatINR(rep.revenue)}
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                                       <div 
                                         className={`h-full rounded-full ${rep.achievement >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                         style={{width: `${Math.min(rep.achievement, 100)}%`}}
                                       />
                                    </div>
                                    <span className={`text-xs font-bold ${rep.achievement >= 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                       {rep.achievement.toFixed(1)}%
                                    </span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-right text-slate-600">
                                 {formatINR(rep.pipeline)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    rep.winRate > 60 ? 'bg-emerald-100 text-emerald-700' :
                                    rep.winRate > 30 ? 'bg-blue-50 text-blue-700' :
                                    'bg-slate-100 text-slate-600'
                                 }`}>
                                    {rep.winRate.toFixed(1)}%
                                 </span>
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
            <div className="h-full flex flex-col">
              {/* Pipeline Filters */}
              <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col lg:flex-row gap-3 items-start lg:items-center">
                  <div className="relative flex-1 w-full lg:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search deals, notes..."
                      value={pipelineSearchTerm}
                      onChange={(e) => setPipelineSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full bg-slate-50 transition-shadow shadow-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                      <select 
                        value={pipelineCategoryFilter}
                        onChange={(e) => setPipelineCategoryFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
                      >
                        <option value="all">All Categories</option>
                        {Object.values(DealCategory).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>

                      <select 
                        value={pipelineRepFilter}
                        onChange={(e) => setPipelineRepFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
                      >
                        <option value="all">All Reps</option>
                        {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      
                      {(pipelineCategoryFilter !== 'all' || pipelineRepFilter !== 'all' || pipelineSearchTerm) && (
                        <button 
                          onClick={() => {
                            setPipelineCategoryFilter('all');
                            setPipelineRepFilter('all');
                            setPipelineSearchTerm('');
                          }}
                          className="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors font-medium ml-auto lg:ml-0"
                        >
                          Reset
                        </button>
                      )}
                  </div>
              </div>

              <div className="flex-1 overflow-x-auto p-4">
                <div className="flex gap-4 min-w-max h-full">
                  {STAGE_CONFIG.map(stage => (
                    <div key={stage.id} className="w-80 flex flex-col bg-slate-100 rounded-xl max-h-full">
                      <div className={`p-4 border-b border-slate-200 rounded-t-xl sticky top-0 bg-slate-100 z-10 flex justify-between items-center`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${stage.color.split(' ')[0].replace('bg-', 'bg-')}`} />
                          <h3 className="font-semibold text-slate-700">{stage.label}</h3>
                        </div>
                        <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                          {filteredPipelineDeals.filter(d => d.stage === stage.id).length}
                        </span>
                      </div>
                      
                      <div className="p-3 space-y-3 overflow-y-auto scrollbar-hide flex-1">
                        {filteredPipelineDeals
                          .filter(deal => deal.stage === stage.id)
                          .map(deal => (
                            <DealCard 
                              key={deal.id} 
                              deal={deal} 
                              onMoveStage={handleMoveStage}
                              onEdit={handleEditDeal}
                              onNoteUpdate={handleNoteUpdate}
                            />
                          ))
                        }
                        {filteredPipelineDeals.filter(d => d.stage === stage.id).length === 0 && (
                          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                             <p className="text-xs text-slate-400">No deals</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3 text-center border-t border-slate-200">
                         <p className="text-xs font-semibold text-slate-500">
                           Total: {formatINR(filteredPipelineDeals.filter(d => d.stage === stage.id).reduce((s, d) => s + d.value, 0))}
                         </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-6 border-b border-slate-200 flex flex-col gap-4">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Customer & Deal Projection</h3>
                      <p className="text-sm text-slate-500">Overview of all active and closed deals with projected weighted revenue.</p>
                    </div>
                 </div>
                 
                 {/* Filters Bar */}
                 <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="relative flex-1 w-full lg:w-auto">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search customers, projects..."
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full bg-white transition-shadow shadow-sm"
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                       <select 
                          value={customerStageFilter}
                          onChange={(e) => setCustomerStageFilter(e.target.value)}
                          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
                        >
                          <option value="all">All Stages</option>
                          {Object.values(DealStage).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <select 
                          value={customerCategoryFilter}
                          onChange={(e) => setCustomerCategoryFilter(e.target.value)}
                          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
                        >
                          <option value="all">All Categories</option>
                          {Object.values(DealCategory).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <select 
                          value={customerRepFilter}
                          onChange={(e) => setCustomerRepFilter(e.target.value)}
                          className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
                        >
                          <option value="all">All Reps</option>
                          {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>

                        {(customerStageFilter !== 'all' || customerCategoryFilter !== 'all' || customerRepFilter !== 'all' || customerSearchTerm) && (
                          <button 
                            onClick={() => {
                              setCustomerStageFilter('all');
                              setCustomerCategoryFilter('all');
                              setCustomerRepFilter('all');
                              setCustomerSearchTerm('');
                            }}
                            className="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors font-medium ml-auto lg:ml-0"
                          >
                            Reset
                          </button>
                        )}
                    </div>
                 </div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-50 border-b border-slate-200">
                     <tr>
                       <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                       <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                       <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Rep</th>
                       <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stage</th>
                       <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Deal Amount</th>
                       <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Prob.</th>
                       <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Proj. Volume</th>
                       <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {filteredCustomerDeals.map(deal => (
                       <tr key={deal.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleEditDeal(deal)}>
                         <td className="px-6 py-4">
                           <div className="font-semibold text-slate-900">{deal.customerName}</div>
                           <div className="text-xs text-slate-500">{deal.title}</div>
                         </td>
                         <td className="px-6 py-4">
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                              {deal.category}
                           </span>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                               <img 
                                 src={reps.find(r => r.id === deal.assignedRepId)?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown'} 
                                 className="w-6 h-6 rounded-full" 
                                 alt=""
                               />
                               <span className="text-sm text-slate-600">
                                 {reps.find(r => r.id === deal.assignedRepId)?.name || 'Unknown'}
                               </span>
                            </div>
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex flex-col items-start gap-1">
                               <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                 deal.stage === DealStage.CLOSED_WON ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                 deal.stage === DealStage.CLOSED_LOST ? 'bg-red-50 text-red-700 border-red-100' :
                                 'bg-blue-50 text-blue-700 border-blue-100'
                               }`}>
                                 {deal.stage}
                               </span>
                               {deal.stageHistory?.[deal.stage] && (
                                   <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                     <Calendar size={10} />
                                     {new Date(deal.stageHistory[deal.stage]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                   </span>
                               )}
                           </div>
                         </td>
                         <td className="px-6 py-4 text-right font-medium text-slate-700">
                           {formatINR(deal.value)}
                         </td>
                         <td className="px-6 py-4 text-right text-slate-600">
                           {deal.probability}%
                         </td>
                         <td className="px-6 py-4 text-right font-bold text-slate-900">
                           {formatINR(deal.value * (deal.probability / 100))}
                         </td>
                         <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditDeal(deal);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if(window.confirm(`Are you sure you want to delete the deal for ${deal.customerName}?`)) {
                                    handleDeleteDeal(deal.id);
                                  }
                                }}
                                className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                                title="Delete Deal"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {filteredCustomerDeals.length === 0 && (
                   <div className="text-center py-12 text-slate-500">
                     <div className="flex flex-col items-center gap-2">
                        <Filter className="text-slate-300 mb-2" size={32} />
                        <p>No customers found matching your filters.</p>
                        <button 
                            onClick={() => {
                              setCustomerStageFilter('all');
                              setCustomerCategoryFilter('all');
                              setCustomerRepFilter('all');
                              setCustomerSearchTerm('');
                            }}
                            className="text-blue-600 hover:underline text-sm"
                        >
                            Clear all filters
                        </button>
                     </div>
                   </div>
                 )}
               </div>
            </div>
          )}

          {activeTab === 'incentives' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                {reps.map(rep => (
                  <button
                    key={rep.id}
                    onClick={() => setSelectedRepId(rep.id)}
                    className={`flex items-center gap-3 px-6 py-4 rounded-xl border transition-all min-w-[200px] ${selectedRepId === rep.id ? 'bg-white border-blue-500 ring-2 ring-blue-100 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                  >
                    <img src={rep.avatar} alt={rep.name} className="w-10 h-10 rounded-full object-cover" />
                    <div className="text-left">
                      <div className={`font-bold ${selectedRepId === rep.id ? 'text-blue-700' : 'text-slate-700'}`}>{rep.name}</div>
                      <div className="text-xs text-slate-500">View Performance</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Incentive Calculator Component */}
              <IncentiveCalculator 
                rep={selectedRep} 
                deals={deals} 
                onUpdateQuota={handleUpdateQuota}
                key={selectedRep.id}
              />
            </div>
          )}
        </div>
      </main>
      
      {/* Add/Edit Deal Modal */}
      <AddDealModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSave={handleSaveDeal}
        onDelete={handleDeleteDeal}
        reps={reps}
        initialData={editingDeal}
      />
    </div>
  );
};

export default App;