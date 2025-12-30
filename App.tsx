
import React, { useState, useEffect, useMemo } from 'react';
import { TextileRecord } from './types';
import { Dashboard } from './components/Dashboard';
import { RecordRow } from './components/RecordRow';
import { RecordForm } from './components/RecordForm';
import { analyzeRecords } from './services/geminiService';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const App: React.FC = () => {
  const [currentUserId] = useState(() => {
    let id = localStorage.getItem('textrack_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('textrack_user_id', id);
    }
    return id;
  });

  const [records, setRecords] = useState<TextileRecord[]>(() => {
    const saved = localStorage.getItem('textrack_records_simplified_v2');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TextileRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  useEffect(() => {
    localStorage.setItem('textrack_records_simplified_v2', JSON.stringify(records));
  }, [records]);

  const handleSaveRecord = (data: Omit<TextileRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (editingRecord) {
      if (editingRecord.createdBy !== currentUserId) {
        alert("Permission denied: You can only edit your own entries.");
        return;
      }
      setRecords(prev => prev.map(r => r.id === editingRecord.id ? {
        ...r,
        ...data,
        updatedAt: Date.now()
      } : r));
    } else {
      const newRecord: TextileRecord = {
        ...data,
        id: Math.random().toString(36).substring(2, 9),
        createdBy: currentUserId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setRecords(prev => [newRecord, ...prev]);
    }
    setIsFormOpen(false);
    setEditingRecord(null);
  };

  const handleDeleteRecord = (id: string) => {
    const recordToDelete = records.find(r => r.id === id);
    if (recordToDelete && recordToDelete.createdBy !== currentUserId) {
      alert("Permission denied: You can only delete your own entries.");
      return;
    }

    if (window.confirm('Are you sure you want to delete this entry from Hashir\'s Ledger?')) {
      setRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleEditRecord = (record: TextileRecord) => {
    if (record.createdBy !== currentUserId) {
      alert("This record is locked by the owner.");
      return;
    }
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const generateAiInsight = async () => {
    setIsAiAnalyzing(true);
    const insight = await analyzeRecords(records);
    setAiInsight(insight);
    setIsAiAnalyzing(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text('Hashir\'s Office: Daily Production Ledger', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`User ID: ${currentUserId}`, 14, 35);

    const tableData = filteredRecords.map(record => [
      record.entryDate,
      record.id.slice(0, 4).toUpperCase(),
      record.doriDetail,
      record.warpinDetail,
      record.bheemDetail,
      record.deliveryDetail,
      record.createdBy === currentUserId ? 'Me' : record.createdBy
    ]);

    (doc as any).autoTable({
      startY: 45,
      head: [['Log Date', 'Batch', 'Dori', 'Warpin', 'Bheem', 'Delivery Details', 'Operator']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 
        0: { cellWidth: 25 }, 
        1: { cellWidth: 15 },
        6: { cellWidth: 20 }
      },
    });

    doc.save(`Hashir_Office_Ledger_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const q = searchQuery.toLowerCase();
      return (
        r.doriDetail.toLowerCase().includes(q) || 
        r.warpinDetail.toLowerCase().includes(q) ||
        r.bheemDetail.toLowerCase().includes(q) ||
        r.deliveryDetail.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.entryDate.toLowerCase().includes(q)
      );
    }).sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt - a.createdAt);
  }, [records, searchQuery]);

  const groupedRecords = useMemo(() => {
    const groups: { [key: string]: TextileRecord[] } = {};
    filteredRecords.forEach(record => {
      const dateLabel = new Date(record.entryDate + 'T12:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[dateLabel]) groups[dateLabel] = [];
      groups[dateLabel].push(record);
    });
    return groups;
  }, [filteredRecords]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-inner">
              <i className="fa-solid fa-file-invoice"></i>
            </div>
            <h1 className="text-xl font-black tracking-tighter text-slate-800">
              HASHIR'S<span className="text-indigo-600">OFFICE</span>
            </h1>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                placeholder="Search by batch, date, or detail..."
                className="w-full bg-slate-100 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={exportToPDF}
              disabled={filteredRecords.length === 0}
              className="hidden sm:flex px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-sm transition-all items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              <i className="fa-solid fa-download text-indigo-500"></i>
              <span>Report</span>
            </button>
            <button 
              onClick={() => { setEditingRecord(null); setIsFormOpen(true); }}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-black text-sm transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95"
            >
              <i className="fa-solid fa-plus"></i>
              <span>New Entry</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 py-8 flex-grow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest shadow-sm self-start">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Session Active: {currentUserId}
          </div>
          <div className="sm:hidden w-full relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
          </div>
        </div>
        
        <Dashboard records={records} />

        <div className="mb-10 bg-indigo-950 border border-indigo-900 rounded-3xl p-8 shadow-2xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600 rounded-full -mr-32 -mt-32 opacity-10 blur-3xl group-hover:opacity-20 transition-opacity"></div>
          <div className="relative z-10 flex-1">
            <h2 className="text-white font-black text-xl flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-400/20">
                <i className="fa-solid fa-wand-magic-sparkles text-indigo-400 text-sm"></i>
              </div>
              Office Intelligence
            </h2>
            <p className="text-indigo-100/70 text-sm leading-relaxed max-w-2xl italic bg-indigo-900/40 p-4 rounded-2xl border border-indigo-800/50">
              {aiInsight || "Let Gemini analyze your production patterns across different batches and dates to find optimization opportunities."}
            </p>
          </div>
          <button
            onClick={generateAiInsight}
            disabled={isAiAnalyzing || records.length === 0}
            className="shrink-0 px-8 py-4 bg-indigo-500 text-white rounded-2xl font-black hover:bg-indigo-400 disabled:opacity-50 transition-all shadow-xl shadow-indigo-950/40 flex items-center gap-3 active:scale-95"
          >
            {isAiAnalyzing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-microchip"></i>}
            Analyze Trends
          </button>
        </div>

        <div className="space-y-10">
          {Object.entries(groupedRecords).length > 0 ? (
            Object.entries(groupedRecords).map(([dateLabel, items]) => (
              <section key={dateLabel} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-4 mb-5">
                  <div className="bg-slate-800 text-white px-4 py-1.5 rounded-lg shadow-sm">
                    <h3 className="font-black text-[11px] uppercase tracking-wider">{dateLabel}</h3>
                  </div>
                  <div className="h-px flex-1 bg-slate-200"></div>
                  <div className="px-3 py-1 bg-slate-100 rounded-md">
                     <span className="text-slate-500 font-bold text-[10px] uppercase tracking-tight">{items.length} Entries Today</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 w-28">Batch ID</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Dori Specification</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Warping Log</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Bheem Log</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Dispatch / Delivery</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map(record => (
                          <RecordRow 
                            key={record.id} 
                            record={record} 
                            currentUserId={currentUserId}
                            onEdit={handleEditRecord} 
                            onDelete={handleDeleteRecord} 
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ))
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-32 flex flex-col items-center justify-center text-slate-300">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <i className="fa-solid fa-calendar-day text-4xl text-slate-200"></i>
              </div>
              <p className="font-black text-slate-600 uppercase tracking-widest text-sm">Ledger Empty</p>
              <p className="text-sm mt-2 text-slate-400 max-w-xs text-center leading-relaxed">
                No logs matching your criteria were found. Start building Hashir's production database.
              </p>
              <button 
                onClick={() => setIsFormOpen(true)}
                className="mt-8 px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
              >
                Log First Batch
              </button>
            </div>
          )}
        </div>
      </main>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md transition-opacity">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                   <i className={`fa-solid ${editingRecord ? 'fa-pen-nib' : 'fa-clipboard-check'} text-lg`}></i>
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 leading-tight">
                    {editingRecord ? 'Edit Entry' : 'Daily Entry'}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Production Ledger System</p>
                </div>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-rose-500 p-2 rounded-full hover:bg-rose-50 transition-all">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <div className="p-8 max-h-[85vh] overflow-y-auto">
              <RecordForm 
                initialData={editingRecord} 
                onSave={handleSaveRecord} 
                onCancel={() => setIsFormOpen(false)} 
              />
            </div>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-slate-200 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 opacity-50">
            <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-shield-halved text-slate-500 text-xs"></i>
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
              Hashir's Office &copy; 2024 • Secured Production Hub
            </p>
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="text-slate-400 text-[10px] font-black uppercase tracking-tighter hover:text-indigo-500 transition-colors">Compliance</a>
            <a href="#" className="text-slate-400 text-[10px] font-black uppercase tracking-tighter hover:text-indigo-500 transition-colors">System Health</a>
            <div className="w-px h-4 bg-slate-200"></div>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
               <span className="text-slate-400 text-[10px] font-bold uppercase">Encrypted</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
