'use client';
import { useState } from 'react';
import { NotebookEntry } from '@/types';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, X, Trash2, FileText, Search } from 'lucide-react';

interface Props { entries: NotebookEntry[]; userId: string; }

export default function NotebookClient({ entries: initial, userId }: Props) {
  const [entries, setEntries] = useState(initial);
  const [selected, setSelected] = useState<NotebookEntry | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const filtered = entries.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.content.toLowerCase().includes(search.toLowerCase())
  );

  function openNew() { setSelected(null); setIsNew(true); setTitle(''); setContent(''); setTags(''); }
  function openEntry(e: NotebookEntry) { setSelected(e); setIsNew(true); setTitle(e.title); setContent(e.content); setTags(e.tags.join(', ')); }

  async function save() {
    setSaving(true);
    const payload = { user_id: userId, title: title || 'Untitled', content, tags: tags.split(',').map(t => t.trim()).filter(Boolean), updated_at: new Date().toISOString() };
    try {
      if (selected) {
        await supabase.from('notebook_entries').update(payload).eq('id', selected.id);
        toast.success('Note updated');
      } else {
        await supabase.from('notebook_entries').insert(payload);
        toast.success('Note saved');
      }
      const { data } = await supabase.from('notebook_entries').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
      setEntries(data || []);
      setIsNew(false);
      setSelected(null);
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm('Delete this note?')) return;
    await supabase.from('notebook_entries').delete().eq('id', id);
    setEntries(e => e.filter(x => x.id !== id));
    setIsNew(false);
    setSelected(null);
    toast.success('Deleted');
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#e2e8ff' }}>Notebook</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8892b8' }}>Journal thoughts, setups, and trading lessons</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-white"
          style={{ background: '#4f7ef8', border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> New Note
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-5" style={{ background: '#12151f', border: '1px solid #252b40' }}>
        <Search size={13} style={{ color: '#4a5270' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…"
          className="bg-transparent border-none outline-none text-[13px] w-full p-0" style={{ color: '#e2e8ff' }} />
      </div>

      {filtered.length === 0 && !isNew ? (
        <div className="rounded-xl p-12 text-center" style={{ background: '#12151f', border: '1px solid #252b40' }}>
          <FileText size={36} className="mx-auto mb-3" style={{ color: '#4a5270' }} />
          <p style={{ color: '#8892b8' }}>No notes yet. Write your first trading journal entry.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(e => (
            <div key={e.id} onClick={() => openEntry(e)} className="rounded-xl p-4 cursor-pointer"
              style={{ background: '#12151f', border: '1px solid #252b40' }}
              onMouseEnter={el => (el.currentTarget.style.borderColor = '#313856')}
              onMouseLeave={el => (el.currentTarget.style.borderColor = '#252b40')}>
              <h3 className="text-[14px] font-semibold mb-1 truncate" style={{ color: '#e2e8ff' }}>{e.title}</h3>
              <p className="text-[12px] mb-2" style={{ color: '#8892b8', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {e.content || 'Empty note…'}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {e.tags.slice(0, 2).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#1e2336', color: '#8892b8' }}>{t}</span>)}
                </div>
                <span className="text-[10px]" style={{ color: '#4a5270' }}>{new Date(e.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl" style={{ background: '#12151f', border: '1px solid #313856' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #252b40' }}>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title…"
                className="text-[16px] font-semibold bg-transparent border-none outline-none flex-1 p-0" style={{ color: '#e2e8ff' }} />
              <button onClick={() => setIsNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8892b8', marginLeft: 12 }}><X size={16} /></button>
            </div>
            <div className="p-6">
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="Write your thoughts, trade review, lessons learned…" rows={16}
                style={{ minHeight: 320, lineHeight: 1.7 }} />
              <div className="mt-3">
                <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (comma-separated)…" />
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #252b40' }}>
              <div>{selected && <button onClick={() => del(selected.id)}
                style={{ background: '#2a0f0f', border: '1px solid #b91c1c', color: '#ef4444', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                <Trash2 size={12} style={{ display: 'inline', marginRight: 4 }} />Delete</button>}</div>
              <div className="flex gap-2">
                <button onClick={() => setIsNew(false)}
                  style={{ background: 'transparent', border: '1px solid #252b40', color: '#8892b8', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button onClick={save} disabled={saving}
                  style={{ background: '#4f7ef8', border: 'none', color: '#fff', padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
