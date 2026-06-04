'use client';
import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, X, Trash2, Camera, ChevronDown, ChevronUp } from 'lucide-react';

interface JournalEntry {
  id: string;
  date: string;
  time: string;
  content: string;
  screenshot_url: string | null;
  created_at: string;
}

interface Props { entries: JournalEntry[]; userId: string; }

export default function JournalClient({ entries: initial, userId }: Props) {
  const [entries, setEntries] = useState(initial);
  const [showNew, setShowNew] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [content, setContent] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  function openNew() {
    setEditEntry(null);
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toTimeString().slice(0, 5));
    setContent('');
    setScreenshot(null);
    setScreenshotPreview(null);
    setShowNew(true);
  }

  function openEdit(entry: JournalEntry) {
    setEditEntry(entry);
    setDate(entry.date);
    setTime(entry.time);
    setContent(entry.content);
    setScreenshot(null);
    setScreenshotPreview(entry.screenshot_url);
    setShowNew(true);
  }

  function handleScreenshot(file: File) {
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = e => setScreenshotPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!content.trim() && !screenshot) {
      toast.error('Write something or add a screenshot');
      return;
    }
    setSaving(true);
    try {
      let screenshotUrl = editEntry?.screenshot_url || null;

      // Upload screenshot if new one selected
      if (screenshot) {
        const ext = screenshot.name.split('.').pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('screenshots')
          .upload(path, screenshot);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(path);
        screenshotUrl = urlData.publicUrl;
      }

      const payload = {
        user_id: userId,
        date,
        time,
        content: content.trim(),
        screenshot_url: screenshotUrl,
        updated_at: new Date().toISOString(),
      };

      if (editEntry) {
        const { error } = await supabase.from('journal_entries').update(payload).eq('id', editEntry.id);
        if (error) throw error;
        toast.success('Entry updated');
      } else {
        const { error } = await supabase.from('journal_entries').insert(payload);
        if (error) throw error;
        toast.success('Entry saved');
      }

      // Reload
      const { data } = await supabase.from('journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      setEntries(data || []);
      setShowNew(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm('Delete this entry?')) return;
    await supabase.from('journal_entries').delete().eq('id', id);
    setEntries(e => e.filter(x => x.id !== id));
    setShowNew(false);
    toast.success('Entry deleted');
  }

  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[24px] font-semibold" style={{ color: 'var(--text)' }}>Journal</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-2)' }}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: '#4f7ef8', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,126,248,0.3)' }}>
          <Plus size={15} /> New Entry
        </button>
      </div>

      {/* Entries */}
      {entries.length === 0 && !showNew ? (
        <div className="rounded-2xl p-16 text-center card">
          <div className="text-5xl mb-4">📓</div>
          <p className="text-[16px] font-medium mb-2" style={{ color: 'var(--text)' }}>Your journal is empty</p>
          <p className="text-[13px] mb-6" style={{ color: 'var(--text-2)' }}>Start documenting your trading journey</p>
          <button onClick={openNew}
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: '#4f7ef8', border: 'none', cursor: 'pointer' }}>
            Write First Entry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => {
            const isExpanded = expandedId === entry.id;
            return (
              <div key={entry.id} className="rounded-2xl overflow-hidden card"
                style={{ transition: 'box-shadow 0.2s' }}>
                {/* Entry header */}
                <div className="flex items-center justify-between px-5 py-4"
                  style={{ borderBottom: isExpanded ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[13px]"
                      style={{ background: 'rgba(79,126,248,0.1)', color: '#4f7ef8' }}>
                      {new Date(entry.date + 'T12:00:00').getDate()}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{formatDate(entry.date)}</p>
                      <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>{entry.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.screenshot_url && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(79,126,248,0.1)', color: '#4f7ef8' }}>📸 Screenshot</span>
                    )}
                    {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-3)' }} />}
                  </div>
                </div>

                {/* Entry content */}
                {isExpanded && (
                  <div className="px-5 pb-5">
                    {entry.screenshot_url && (
                      <div className="mt-4 mb-4 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                        <img src={entry.screenshot_url} alt="Trade screenshot" className="w-full object-cover" style={{ maxHeight: 400 }} />
                      </div>
                    )}
                    {entry.content && (
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)', marginTop: entry.screenshot_url ? 0 : 16 }}>
                        {entry.content}
                      </p>
                    )}
                    <div className="flex gap-2 mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                      <button onClick={() => openEdit(entry)}
                        className="px-4 py-1.5 rounded-lg text-[12px] font-medium"
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>
                        Edit
                      </button>
                      <button onClick={() => del(entry.id)}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-[12px] font-medium"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl animate-fadeUp"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
                {editEntry ? 'Edit Entry' : 'New Journal Entry'}
              </h2>
              <button onClick={() => setShowNew(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5"
                    style={{ color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5"
                    style={{ color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Time</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} />
                </div>
              </div>

              {/* Screenshot upload */}
              <div>
                <label className="block text-[11px] font-semibold mb-1.5"
                  style={{ color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Screenshot</label>
                {screenshotPreview ? (
                  <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <img src={screenshotPreview} alt="Preview" className="w-full object-cover" style={{ maxHeight: 280 }} />
                    <button onClick={() => { setScreenshot(null); setScreenshotPreview(null); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', color: '#fff' }}>
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div onClick={() => fileRef.current?.click()}
                    className="rounded-xl flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition-colors"
                    style={{ border: '2px dashed var(--border)', background: 'var(--bg-hover)' }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleScreenshot(f); }}>
                    <Camera size={22} style={{ color: 'var(--text-3)' }} />
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>Drop screenshot or click to upload</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>PNG, JPG, WEBP</p>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleScreenshot(f); }} />
                  </div>
                )}
              </div>

              {/* Thoughts */}
              <div>
                <label className="block text-[11px] font-semibold mb-1.5"
                  style={{ color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Thoughts & Notes</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="How did the session go? What did you notice? How were you feeling? What would you do differently?"
                  rows={6}
                  style={{ lineHeight: 1.7, fontSize: 14 }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <div>
                {editEntry && (
                  <button onClick={() => del(editEntry.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px]"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNew(false)}
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13 }}>
                  Cancel
                </button>
                <button onClick={save} disabled={saving}
                  style={{ background: '#4f7ef8', border: 'none', color: '#fff', padding: '9px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1, boxShadow: '0 2px 8px rgba(79,126,248,0.3)' }}>
                  {saving ? 'Saving…' : editEntry ? 'Update' : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
