'use client';
import { useState } from 'react';
import { PlaybookEntry } from '@/types';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, X, Trash2, BookMarked } from 'lucide-react';

interface Props { playbooks: PlaybookEntry[]; userId: string; }

export default function PlaybookClient({ playbooks: initial, userId }: Props) {
  const [playbooks, setPlaybooks] = useState(initial);
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [rules, setRules] = useState<string[]>(['']);
  const [tags, setTags] = useState('');
  const supabase = createClient();

  function startNew() { setEditId(null); setName(''); setDesc(''); setRules(['']); setTags(''); setShowNew(true); }
  function startEdit(p: PlaybookEntry) { setEditId(p.id); setName(p.name); setDesc(p.description || ''); setRules(p.rules.length ? p.rules : ['']); setTags(p.tags.join(', ')); setShowNew(true); }

  async function save() {
    if (!name.trim()) { toast.error('Name is required'); return; }
    const payload = { user_id: userId, name: name.trim(), description: desc.trim() || null, rules: rules.filter(Boolean), tags: tags.split(',').map(t => t.trim()).filter(Boolean) };
    if (editId) { await supabase.from('playbooks').update(payload).eq('id', editId); }
    else { await supabase.from('playbooks').insert(payload); }
    toast.success(editId ? 'Playbook updated' : 'Playbook created');
    const { data } = await supabase.from('playbooks').select('*').eq('user_id', userId).order('created_at');
    setPlaybooks(data || []);
    setShowNew(false);
  }

  async function del(id: string) {
    if (!confirm('Delete this playbook?')) return;
    await supabase.from('playbooks').delete().eq('id', id);
    setPlaybooks(p => p.filter(x => x.id !== id));
    toast.success('Deleted');
    setShowNew(false);
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#e2e8ff' }}>Playbook</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8892b8' }}>Define and organize your trading setups and rules</p>
        </div>
        <button onClick={startNew} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-white"
          style={{ background: '#4f7ef8', border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> New Playbook
        </button>
      </div>

      {playbooks.length === 0 && !showNew ? (
        <div className="rounded-xl p-12 text-center" style={{ background: '#12151f', border: '1px solid #252b40' }}>
          <BookMarked size={36} className="mx-auto mb-3" style={{ color: '#4a5270' }} />
          <p className="font-medium mb-1" style={{ color: '#8892b8' }}>No playbooks yet</p>
          <p className="text-sm mb-4" style={{ color: '#4a5270' }}>Create your first trading setup.</p>
          <button onClick={startNew} className="px-4 py-2 rounded-lg text-[13px] font-medium text-white"
            style={{ background: '#4f7ef8', border: 'none', cursor: 'pointer' }}>Create Playbook</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {playbooks.map(p => (
            <div key={p.id} onClick={() => startEdit(p)} className="rounded-xl p-5 cursor-pointer"
              style={{ background: '#12151f', border: '1px solid #252b40' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#313856')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#252b40')}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-[14px] font-semibold" style={{ color: '#e2e8ff' }}>{p.name}</h3>
                <button onClick={e => { e.stopPropagation(); del(p.id); }}
                  style={{ color: '#4a5270', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={12} /></button>
              </div>
              {p.description && <p className="text-[12px] mb-3" style={{ color: '#8892b8' }}>{p.description}</p>}
              {p.rules.length > 0 && (
                <ul className="space-y-1 mb-3">
                  {p.rules.slice(0, 4).map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: '#8892b8' }}>
                      <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5"
                        style={{ background: '#0f2040', color: '#4f7ef8' }}>{i+1}</span>
                      {r}
                    </li>
                  ))}
                </ul>
              )}
              {p.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded" style={{ background: '#1e2336', color: '#8892b8' }}>{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-lg rounded-xl max-h-[90vh] overflow-y-auto" style={{ background: '#12151f', border: '1px solid #313856' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #252b40' }}>
              <h2 className="text-[15px] font-semibold" style={{ color: '#e2e8ff' }}>{editId ? 'Edit Playbook' : 'New Playbook'}</h2>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8892b8' }}><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. VWAP Pullback" />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe this setup…" rows={2} />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-2" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rules</label>
                <div className="space-y-2">
                  {rules.map((r, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="w-6 h-9 flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ color: '#4f7ef8' }}>{i+1}</span>
                      <input value={r} onChange={e => setRules(rs => rs.map((x, j) => j === i ? e.target.value : x))} placeholder={`Rule ${i+1}…`} />
                      {rules.length > 1 && <button onClick={() => setRules(rs => rs.filter((_, j) => j !== i))}
                        style={{ color: '#4a5270', background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>}
                    </div>
                  ))}
                  <button onClick={() => setRules(r => [...r, ''])}
                    style={{ color: '#4f7ef8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>+ Add rule</button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tags (comma-separated)</label>
                <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. Scalp, Futures, RTH" />
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #252b40' }}>
              <div>{editId && <button onClick={() => del(editId)}
                style={{ background: '#2a0f0f', border: '1px solid #b91c1c', color: '#ef4444', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Delete</button>}</div>
              <div className="flex gap-2">
                <button onClick={() => setShowNew(false)}
                  style={{ background: 'transparent', border: '1px solid #252b40', color: '#8892b8', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button onClick={save}
                  style={{ background: '#4f7ef8', border: 'none', color: '#fff', padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
