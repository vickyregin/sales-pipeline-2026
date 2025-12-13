import React, { useState, useEffect } from 'react';
import { SalesRep, Deal, DealStage } from '../types';
import { DollarSign, TrendingUp, Award, Users, Target, CheckCircle2, Pencil, Check, X } from 'lucide-react';

interface IncentiveCalculatorProps {
  rep: SalesRep;
  deals: Deal[];
  onUpdateQuota: (id: string, newQuota: number) => void;
}

export const IncentiveCalculator: React.FC<IncentiveCalculatorProps> = ({ rep, deals, onUpdateQuota }) => {
  const CR = 10000000;
  const [isEditingQuota, setIsEditingQuota] = useState(false);
  const [quotaEditValue, setQuotaEditValue] = useState(rep.quota.toString());

  useEffect(() => {
    setQuotaEditValue(rep.quota.toString());
  }, [rep.quota]);

  const handleSaveQuota = () => {
    const val = parseFloat(quotaEditValue);
    if (!isNaN(val) && val > 0) {
      onUpdateQuota(rep.id, val);
      setIsEditingQuota(false);
    }
  };

  // -- Financial Calculation --
  const closedDeals = deals.filter(d => d.assignedRepId === rep.id && d.stage === DealStage.CLOSED_WON);
  const totalRevenue = closedDeals.reduce((sum, d) => sum + d.value, 0);
  const quotaPercentage = (totalRevenue / rep.quota) * 100;

  // Variable Pay Logic
  let variablePayPayoutPercent = 0;
  let variablePayLabel = "0%";
  
  if (quotaPercentage >= 100) {
    variablePayPayoutPercent = 20; // 20% Variable Pay (Full)
    variablePayLabel = "20%";
  } else if (quotaPercentage >= 51) {
    variablePayPayoutPercent = 15; // 15% Variable Pay
    variablePayLabel = "15%";
  } else if (quotaPercentage >= 31) {
    variablePayPayoutPercent = 10; // 10% Variable Pay
    variablePayLabel = "10%";
  } else if (quotaPercentage >= 10) {
    variablePayPayoutPercent = 5;  // 5% Variable Pay
    variablePayLabel = "5%";
  } else {
    variablePayPayoutPercent = 0;
    variablePayLabel = "0%";
  }

  // Calculate actual monetary payout based on the pool allocated to this rep
  const payoutRatio = variablePayPayoutPercent / 20;
  const estimatedVariablePay = rep.variablePayPool * payoutRatio;

  // Incentive Logic (Only if 100% plan executed)
  const isIncentiveEligible = quotaPercentage >= 100;
  const incentiveAmount = isIncentiveEligible ? (rep.variablePayPool * 0.5) : 0; // Bonus incentive logic
  
  const totalEarnings = estimatedVariablePay + incentiveAmount;

  // -- Plan Structure Health (N Logic) --
  // Use rep quota as base for targets if needed, but for now we stick to absolute values or we can scale them.
  // Assuming Plan Structure targets are scaled based on Quota size?
  // Let's assume standard targets are static for this view or proportional?
  // Since the user asked for formulas to reflect, usually pipeline targets are ratios of the quota (e.g., 3x coverage).
  // Let's make the targets dynamic based on the Quota!
  // N (Won) -> ~8% of Quota/Quarter? 
  // For simplicity, let's keep them proportional to the quota.
  // Original mock had Quota 4Cr.
  // Targets were: N=0.3Cr (7.5%), N+1=0.6Cr (15%), N+2=1.2Cr (30%), N+3=2.4Cr (60%).
  // Let's use these ratios.
  
  const planTargets = [
    { label: 'N (PO/Won)', target: rep.quota * 0.075, stage: [DealStage.CLOSED_WON], subLabel: 'Current Month' },
    { label: 'N+1 (Neg)', target: rep.quota * 0.15, stage: [DealStage.NEGOTIATION], subLabel: 'Negotiation' },
    { label: 'N+2 (Quote)', target: rep.quota * 0.30, stage: [DealStage.PROPOSAL], subLabel: 'Offer Submitted' },
    { label: 'N+3 (Lead)', target: rep.quota * 0.60, stage: [DealStage.LEAD, DealStage.QUALIFIED], subLabel: 'Pipeline' },
  ];

  const planHealth = planTargets.map(p => {
    const value = deals
      .filter(d => d.assignedRepId === rep.id && p.stage.includes(d.stage))
      .reduce((sum, d) => sum + d.value, 0);
    return { ...p, value, achieved: value >= p.target };
  });

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <img src={rep.avatar} alt={rep.name} className="w-16 h-16 rounded-full bg-slate-100 p-1 border-2 border-slate-200" />
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {rep.name}
              {rep.teamMembers && <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full flex items-center gap-1"><Users size={12}/> Team</span>}
            </h3>
            {rep.teamMembers ? (
               <p className="text-sm text-slate-500">{rep.teamMembers.join(', ')}</p>
            ) : (
               <p className="text-sm text-slate-500">Sales Representative</p>
            )}
          </div>
        </div>
        <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 min-w-[160px]">
           <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Annual Target</div>
           {isEditingQuota ? (
             <div className="flex items-center gap-1">
               <input 
                 type="number"
                 value={quotaEditValue}
                 onChange={(e) => setQuotaEditValue(e.target.value)}
                 className="w-28 px-1 py-0.5 text-base border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                 autoFocus
                 onKeyDown={(e) => {
                    if(e.key === 'Enter') handleSaveQuota();
                    if(e.key === 'Escape') setIsEditingQuota(false);
                 }}
               />
               <button onClick={handleSaveQuota} className="text-emerald-600 hover:bg-emerald-100 p-1 rounded transition-colors"><Check size={16}/></button>
               <button onClick={() => setIsEditingQuota(false)} className="text-slate-400 hover:bg-slate-200 p-1 rounded transition-colors"><X size={16}/></button>
             </div>
           ) : (
             <div className="flex items-center justify-between gap-2 group cursor-pointer" onClick={() => {
                setQuotaEditValue(rep.quota.toString());
                setIsEditingQuota(true);
             }}>
               <div className="text-xl font-bold text-slate-900">{formatINR(rep.quota)}</div>
               <Pencil size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Variable Pay & Incentive */}
        <div className="space-y-6">
          
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-700 font-medium">Revenue Achievement</span>
              <span className={`font-bold ${quotaPercentage >= 100 ? 'text-emerald-600' : 'text-slate-900'}`}>
                {quotaPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative">
               {/* Markers for slabs */}
               <div className="absolute top-0 bottom-0 w-px bg-white z-10 left-[10%] opacity-50"></div>
               <div className="absolute top-0 bottom-0 w-px bg-white z-10 left-[31%] opacity-50"></div>
               <div className="absolute top-0 bottom-0 w-px bg-white z-10 left-[51%] opacity-50"></div>
               <div className="absolute top-0 bottom-0 w-px bg-white z-10 left-[100%] opacity-50"></div>

               <div 
                 className={`h-full rounded-full transition-all duration-700 ${quotaPercentage >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-blue-600'}`} 
                 style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
               />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>0%</span>
              <span className="pl-4">10%</span>
              <span className="pl-6">31%</span>
              <span className="pl-8">51%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Slabs Info */}
          <div className="grid grid-cols-2 gap-3">
             <div className={`p-3 rounded-lg border ${variablePayPayoutPercent >= 5 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                <div className="text-xs text-slate-500 mb-1">10-30% Achieved</div>
                <div className="font-bold text-slate-700">5% Payout</div>
             </div>
             <div className={`p-3 rounded-lg border ${variablePayPayoutPercent >= 10 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                <div className="text-xs text-slate-500 mb-1">31-50% Achieved</div>
                <div className="font-bold text-slate-700">10% Payout</div>
             </div>
             <div className={`p-3 rounded-lg border ${variablePayPayoutPercent >= 15 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                <div className="text-xs text-slate-500 mb-1">51-99% Achieved</div>
                <div className="font-bold text-slate-700">15% Payout</div>
             </div>
             <div className={`p-3 rounded-lg border ${variablePayPayoutPercent >= 20 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                <div className="text-xs text-slate-500 mb-1">100% Achieved</div>
                <div className="font-bold text-emerald-700">20% Payout</div>
             </div>
          </div>

          {/* Earning Summary */}
          <div className="bg-slate-900 rounded-xl p-5 text-white relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-slate-400 text-sm">Estimated Variable Pay</div>
                    <div className="text-2xl font-bold flex items-baseline gap-2">
                       {formatINR(totalEarnings)}
                       {isIncentiveEligible && <span className="text-xs font-normal text-emerald-400 bg-emerald-400/20 px-2 py-0.5 rounded">+10% Incentive Active</span>}
                    </div>
                  </div>
                  <div className="p-2 bg-white/10 rounded-lg">
                    <DollarSign className="text-emerald-400" size={24} />
                  </div>
                </div>
                <div className="text-xs text-slate-400 border-t border-slate-700 pt-3 flex flex-col gap-1">
                  <div className="flex justify-between">
                     <span>Base Variable ({variablePayLabel})</span>
                     <span>{formatINR(estimatedVariablePay)}</span>
                  </div>
                  {isIncentiveEligible && (
                    <div className="flex justify-between text-emerald-400">
                       <span>Performance Incentive</span>
                       <span>+ {formatINR(incentiveAmount)}</span>
                    </div>
                  )}
                </div>
             </div>
             <Award className="absolute -bottom-6 -right-6 text-slate-800 w-32 h-32 rotate-12" />
          </div>

        </div>

        {/* Right Column: Plan Structure Health */}
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
           <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
             <Target size={18} className="text-blue-600"/>
             {formatINR(rep.quota)} Plan Structure
           </h4>
           <p className="text-xs text-slate-500 mb-6">Dynamic rolling pipeline targets based on quota</p>

           <div className="space-y-5">
             {planHealth.map((item, idx) => (
               <div key={idx} className="relative">
                 <div className="flex justify-between items-end mb-1">
                   <div>
                     <div className="font-semibold text-sm text-slate-700">{item.label}</div>
                     <div className="text-xs text-slate-500">{item.subLabel}</div>
                   </div>
                   <div className="text-right">
                      <div className={`font-bold text-sm ${item.achieved ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {formatINR(item.value)}
                      </div>
                      <div className="text-[10px] text-slate-400">Target: {formatINR(item.target)}</div>
                   </div>
                 </div>
                 
                 {/* Progress Bar */}
                 <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${item.achieved ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min((item.value / item.target) * 100, 100)}%` }}
                    />
                 </div>
                 
                 {/* Status Icon */}
                 <div className="absolute -left-6 top-2">
                   {item.achieved ? (
                     <CheckCircle2 size={16} className="text-emerald-500" />
                   ) : (
                     <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>
                   )}
                 </div>
               </div>
             ))}
           </div>
           
           <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500 text-center italic">
             "Plan N-3 to N must be covered to unlock incentives"
           </div>
        </div>
      </div>
    </div>
  );
};