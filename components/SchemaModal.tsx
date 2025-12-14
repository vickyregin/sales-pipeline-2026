import React from 'react';
import { X, Copy, Database, Check } from 'lucide-react';

interface SchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaModal: React.FC<SchemaModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const sqlQuery = `-- 1. Create Sales Reps Table
CREATE TABLE IF NOT EXISTS public.sales_reps (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT,
    quota NUMERIC DEFAULT 0,
    variable_pay_pool NUMERIC DEFAULT 0,
    team_members TEXT[]
);

-- 2. Create Deals Table
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_name TEXT NOT NULL,
    title TEXT,
    value NUMERIC DEFAULT 0,
    stage TEXT,
    category TEXT,
    assigned_rep_id TEXT REFERENCES public.sales_reps(id),
    close_date DATE,
    probability INTEGER,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    -- New Fields
    notes TEXT,
    stage_history JSONB DEFAULT '{}'::jsonb
);

-- 3. Add columns if table exists (Safe Update)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='notes') THEN
        ALTER TABLE public.deals ADD COLUMN notes TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='stage_history') THEN
        ALTER TABLE public.deals ADD COLUMN stage_history JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 4. Enable RLS (Security)
ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies (Public Access for Demo)
DROP POLICY IF EXISTS "Public Access Reps" ON public.sales_reps;
CREATE POLICY "Public Access Reps" ON public.sales_reps FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access Deals" ON public.deals;
CREATE POLICY "Public Access Deals" ON public.deals FOR ALL USING (true);

-- 6. Insert Mock Reps (Optional - Run once)
INSERT INTO public.sales_reps (id, name, avatar, quota, variable_pay_pool, team_members)
VALUES 
('george', 'George', 'https://api.dicebear.com/7.x/avataaars/svg?seed=George', 40000000, 800000, NULL),
('hari', 'Hari', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hari', 45000000, 900000, NULL),
('team-dva', 'Team DVA', 'https://api.dicebear.com/7.x/identicon/svg?seed=DVA', 45000000, 900000, ARRAY['Dinesh', 'Venkat', 'Arjun']),
('team-la', 'Team LA', 'https://api.dicebear.com/7.x/identicon/svg?seed=LA', 45000000, 900000, ARRAY['Logesh', 'Ajay']),
('team-snv', 'Team SNV', 'https://api.dicebear.com/7.x/identicon/svg?seed=SNV', 45000000, 900000, ARRAY['Sasi', 'Nirupama', 'Vicky'])
ON CONFLICT (id) DO NOTHING;
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Database size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">Supabase Setup</h3>
              <p className="text-xs text-slate-500">Run this SQL in your Supabase SQL Editor</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto bg-slate-900 p-4 relative group">
           <pre className="text-sm font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed selection:bg-blue-500/30">
             {sqlQuery}
           </pre>
           <button 
             onClick={handleCopy}
             className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-md border border-white/10 flex items-center gap-2 transition-all opacity-0 group-hover:opacity-100"
           >
             {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
             {copied ? 'Copied!' : 'Copy SQL'}
           </button>
        </div>

        <div className="p-4 bg-white border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
           <span>Updated to include <code>notes</code> and <code>stage_history</code> fields.</span>
           <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors">
             Close
           </button>
        </div>
      </div>
    </div>
  );
};