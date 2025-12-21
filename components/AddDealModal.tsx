import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { DealStage, SalesRep, Deal, DealCategory, BusinessType } from '../types';

interface AddDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deal: Omit<Deal, 'id' | 'lastUpdated' | 'closeDate'>, stageDate?: string) => void;
  onDelete?: (dealId: string) => void;
  reps: SalesRep[];
  initialData?: Deal | null;
}

export const AddDealModal: React.FC<AddDealModalProps> = ({ isOpen, onClose, onSave, onDelete, reps, initialData }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    title: '',
    value: '', // String to handle empty state better during input
    stage: DealStage.LEAD,
    category: DealCategory.SOFTWARE,
    businessType: BusinessType.NEW,
    assignedRepId: reps[0]?.id || '',
    probability: 20,
    notes: ''
  });

  const [stageDate, setStageDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Populate form when initialData changes (Edit Mode) or reset (Add Mode)
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          customerName: initialData.customerName,
          title: initialData.title,
          value: initialData.value.toString(),
          stage: initialData.stage,
          category: initialData.category,
          businessType: initialData.businessType || BusinessType.NEW,
          assignedRepId: initialData.assignedRepId,
          probability: initialData.probability,
          notes: initialData.notes || ''
        });
        
        // Extract date from history or default to today
        const historyDate = initialData.stageHistory?.[initialData.stage];
        if (historyDate) {
          // Format ISO string to YYYY-MM-DD for input[type="date"]
          setStageDate(historyDate.split('T')[0]);
        } else {
          setStageDate(new Date().toISOString().split('T')[0]);
        }
      } else {
        setFormData({
          customerName: '',
          title: '',
          value: '',
          stage: DealStage.LEAD,
          category: DealCategory.SOFTWARE,
          businessType: BusinessType.NEW,
          assignedRepId: reps[0]?.id || '',
          probability: 20,
          notes: ''
        });
        setStageDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, initialData, reps]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      value: Number(formData.value)
    }, stageDate);
    onClose();
  };

  const handleDelete = () => {
    if (initialData && onDelete) {
      if (window.confirm('Are you sure you want to delete this deal? This action cannot be undone.')) {
        onDelete(initialData.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">
            {initialData ? 'Edit Deal' : 'Add New Deal'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[85vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Acme Corp"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={formData.customerName}
              onChange={e => setFormData({...formData, customerName: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deal Title</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Software License Q3"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value as DealCategory})}
                >
                  {Object.values(DealCategory).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Type</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                  value={formData.businessType}
                  onChange={e => setFormData({...formData, businessType: e.target.value as BusinessType})}
                >
                  {Object.values(BusinessType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stage</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={formData.stage}
                  onChange={e => setFormData({...formData, stage: e.target.value as DealStage})}
                >
                  {Object.values(DealStage).map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stage Date</label>
                <input 
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={stageDate}
                  onChange={e => setStageDate(e.target.value)}
                />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Value (INR)</label>
              <input 
                required
                type="number" 
                min="0"
                placeholder="1000000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.value}
                onChange={e => setFormData({...formData, value: e.target.value})}
              />
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Probability (%)</label>
               <input 
                required
                type="number" 
                min="0" 
                max="100"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.probability}
                onChange={e => setFormData({...formData, probability: Number(e.target.value)})}
              />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Rep</label>
             <select 
               className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
               value={formData.assignedRepId}
               onChange={e => setFormData({...formData, assignedRepId: e.target.value})}
             >
               {reps.map(rep => (
                 <option key={rep.id} value={rep.id}>{rep.name}</option>
               ))}
             </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea 
              placeholder="Add initial notes or key details..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-24"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <div className="pt-4 flex items-center gap-3">
            {initialData && onDelete && (
               <button 
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors mr-auto flex items-center gap-2"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}

            <button 
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors ${!initialData ? 'flex-1' : ''}`}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className={`px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors shadow-sm shadow-blue-200 ${!initialData ? 'flex-1' : ''}`}
            >
              {initialData ? 'Save Changes' : 'Add Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};