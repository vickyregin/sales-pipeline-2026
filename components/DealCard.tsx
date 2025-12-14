import React, { useState } from 'react';
import { Deal, DealStage } from '../types';
import { MoreHorizontal, ArrowRight, AlertCircle, Sparkles, Pencil, Calendar, FileText } from 'lucide-react';
import { suggestNextStep } from '../services/geminiService';

interface DealCardProps {
  deal: Deal;
  onMoveStage: (dealId: string, direction: 'next' | 'prev') => void;
  onEdit: (deal: Deal) => void;
  onNoteUpdate: (dealId: string, note: string) => void;
}

export const DealCard: React.FC<DealCardProps> = ({ deal, onMoveStage, onEdit, onNoteUpdate }) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(deal.notes || '');

  const handleGetInsight = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAiLoading(true);
    const suggestion = await suggestNextStep(deal);
    setAiSuggestion(suggestion);
    setIsAiLoading(false);
  };

  const handleNoteBlur = () => {
    setIsEditingNote(false);
    if (noteDraft !== (deal.notes || '')) {
      onNoteUpdate(deal.id, noteDraft);
    }
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.currentTarget.blur();
    }
  };

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const currentStageDate = deal.stageHistory?.[deal.stage] 
    ? new Date(deal.stageHistory[deal.stage]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : null;

  return (
    <div 
      className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow group relative cursor-pointer"
      onClick={() => onEdit(deal)}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-slate-800 text-sm truncate pr-2">{deal.customerName}</h4>
        <button 
          className="text-slate-400 hover:text-blue-600 p-1 hover:bg-slate-100 rounded-full transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(deal);
          }}
        >
          <Pencil size={14} />
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-2 truncate">{deal.title}</p>
      
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-slate-900">{formatINR(deal.value)}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          deal.probability > 70 ? 'bg-emerald-100 text-emerald-700' :
          deal.probability > 30 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {deal.probability}%
        </span>
      </div>

      {currentStageDate && (
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-3 bg-slate-50 px-2 py-1 rounded w-fit">
           <Calendar size={10} />
           <span>In stage since {currentStageDate}</span>
        </div>
      )}

      {/* Editable Notes Section */}
      <div 
        className="mb-3 group/note"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 mb-1 text-[10px] uppercase font-semibold text-slate-400">
            <FileText size={10} /> Notes
        </div>
        {isEditingNote ? (
            <textarea
                className="w-full text-xs text-slate-700 bg-yellow-50 border border-yellow-200 rounded p-2 focus:ring-1 focus:ring-yellow-400 outline-none resize-none min-h-[60px]"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onBlur={handleNoteBlur}
                onKeyDown={handleNoteKeyDown}
                autoFocus
                placeholder="Add a note..."
            />
        ) : (
            <div 
                onClick={() => {
                    setIsEditingNote(true);
                    setNoteDraft(deal.notes || '');
                }}
                className={`text-xs p-2 rounded min-h-[28px] cursor-text transition-colors ${deal.notes ? 'bg-slate-50 text-slate-600 hover:bg-slate-100' : 'text-slate-400 italic bg-slate-50/50 hover:bg-slate-50'}`}
            >
                {deal.notes || "Click to add notes..."}
            </div>
        )}
      </div>

      {aiSuggestion && (
        <div className="mb-3 bg-indigo-50 p-2 rounded text-xs text-indigo-700 border border-indigo-100 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-1 font-semibold mb-1">
             <Sparkles size={10} /> AI Insight
          </div>
          {aiSuggestion}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
         <button 
           onClick={handleGetInsight}
           disabled={isAiLoading}
           className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
         >
           {isAiLoading ? (
             <span className="animate-pulse">Thinking...</span>
           ) : (
             <>
               <Sparkles size={12} />
               <span>Insight</span>
             </>
           )}
         </button>

         {deal.stage !== DealStage.CLOSED_LOST && deal.stage !== DealStage.CLOSED_WON && (
           <button 
             onClick={(e) => {
               e.stopPropagation();
               onMoveStage(deal.id, 'next');
             }}
             className="text-xs flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors"
           >
             Next <ArrowRight size={12} />
           </button>
         )}
      </div>
    </div>
  );
};