'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  Plus, X, Bookmark, RefreshCw,
  Upload, Trash2, Check, Sparkles, BookOpen, Image
} from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string;
  completed: boolean;
  image_url: string | null;
  sort_order: number;
}

interface Photo {
  id: string;
  url: string;
  caption: string | null;
}

interface SavedAffirmation {
  id: string;
  type: 'scripture' | 'affirmation';
  content: string;
  reference: string | null;
}

interface Props {
  userId: string;
  initialGoals: Goal[];
  initialPhotos: Photo[];
  savedAffirmations: SavedAffirmation[];
}

const MY_DREAMS = [
  { title: 'Consistent & Insane Money', description: '$100K+ a month from trading', category: 'financial', emoji: '💰' },
  { title: 'Dream Home', description: 'The home I always envisioned', category: 'lifestyle', emoji: '🏡' },
  { title: 'Marry Rachel', description: 'Build a life together forever', category: 'love', emoji: '💍' },
  { title: 'More Kids', description: 'Grow my family with love', category: 'family', emoji: '👨‍👩‍👧‍👦' },
  { title: 'Start My Own Company', description: 'Something I can pass down to my kids', category: 'legacy', emoji: '🏢' },
  { title: 'Travel the Entire World', description: 'Every country, every culture', category: 'lifestyle', emoji: '✈️' },
  { title: 'Dream Body', description: 'Strong, healthy, disciplined', category: 'health', emoji: '💪' },
  { title: 'Retire Mom & Dad', description: 'They deserve to rest', category: 'family', emoji: '❤️' },
  { title: 'Retire Rachel', description: 'She never has to work again', category: 'love', emoji: '💝' },
  { title: 'Give Back', description: 'To people who truly need it', category: 'purpose', emoji: '🤲' },
  { title: 'Love Everyone Including Myself', description: 'Lead with love always', category: 'purpose', emoji: '🌟' },
  { title: 'Put God First Every Day', description: 'Strengthen my relationship with Him', category: 'faith', emoji: '🙏' },
];

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  financial: { bg: 'rgba(34,197,94,0.08)', color: '#22c55e' },
  lifestyle: { bg: 'rgba(79,126,248,0.08)', color: '#4f7ef8' },
  love: { bg: 'rgba(236,72,153,0.08)', color: '#ec4899' },
  family: { bg: 'rgba(249,115,22,0.08)', color: '#f97316' },
  legacy: { bg: 'rgba(168,85,247,0.08)', color: '#a855f7' },
  health: { bg: 'rgba(20,184,166,0.08)', color: '#14b8a6' },
  purpose: { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b' },
  faith: { bg: 'rgba(99,102,241,0.08)', color: '#6366f1' },
  dream: { bg: 'rgba(79,126,248,0.08)', color: '#4f7ef8' },
};

export default function VisionClient({ userId, initialGoals, initialPhotos, savedAffirmations: initialSaved }: Props) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [saved, setSaved] = useState<SavedAffirmation[]>(initialSaved);
  const [scripture, setScripture] = useState<{ text: string; reference: string } | null>(null);
  const [loadingScripture, setLoadingScripture] = useState(true);
  const [affirmation, setAffirmation] = useState('');
  const [loadingAffirmation, setLoadingAffirmation] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('dream');
  const [savingGoal, setSavingGoal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'board' | 'saved'>('board');
  const [seeded, setSeeded] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const fetchScripture = useCallback(async () => {
    setLoadingScripture(true);
    try {
      const res = await fetch('/api/scripture', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setScripture({ text: data.text, reference: data.reference });
    } catch {
      setScripture({ text: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" });
    } finally {
      setLoadingScripture(false);
    }
  }, []);

  const generateAffirmation = useCallback(async () => {
    setLoadingAffirmation(true);
    try {
      const res = await fetch('/api/affirmation', { method: 'POST', cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.affirmation) setAffirmation(data.affirmation);
    } catch {
      setAffirmation("God has already written my victory — today I walk in discipline, faith, and purpose to claim everything He promised me.");
    } finally {
      setLoadingAffirmation(false);
    }
  }, []);

  const generateAffirmation = useCallback(async () => {
    setLoadingAffirmation(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          messages: [{
            role: 'user',
            content: `Write one powerful, personal daily affirmation for a futures trader named Joshua who has these dreams: make $100K+ a month trading, buy his dream home, marry Rachel, have more kids, start a company to pass down to his children, travel the world, get his dream body, retire his mom and dad, retire his girlfriend Rachel, give back to people in need, love everyone including himself, and put God first every day. The affirmation should be written in first person, deeply personal, faith-based, powerful and real — not generic. 2-3 sentences max. Return ONLY the affirmation text, nothing else.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text?.trim();
      if (text) setAffirmation(text);
    } catch {
      setAffirmation("God has already written my victory — today I walk in discipline, faith, and purpose to claim everything He promised me.");
    } finally {
      setLoadingAffirmation(false);
    }
  }, []);

  useEffect(() => {
    fetchScripture();
    generateAffirmation();
  }, []);

  useEffect(() => {
    if (initialGoals.length === 0 && !seeded) {
      setSeeded(true);
      const rows = MY_DREAMS.map((d, i) => ({
        user_id: userId, title: d.title, description: d.description,
        category: d.category, completed: false, sort_order: i,
      }));
      supabase.from('vision_goals').insert(rows).select().then(({ data }) => {
        if (data) setGoals(data);
      });
    }
  }, []);

  async function saveScripture() {
    if (!scripture) return;
    const { data } = await supabase.from('saved_affirmations').insert({
      user_id: userId, type: 'scripture', content: scripture.text, reference: scripture.reference,
    }).select().single();
    if (data) { setSaved(s => [data, ...s]); toast.success('Scripture saved! 🙏'); }
  }

  async function saveAffirmation() {
    if (!affirmation) return;
    const { data } = await supabase.from('saved_affirmations').insert({
      user_id: userId, type: 'affirmation', content: affirmation, reference: null,
    }).select().single();
    if (data) { setSaved(s => [data, ...s]); toast.success('Affirmation saved! ⭐'); }
  }

  async function deleteSaved(id: string) {
    await supabase.from('saved_affirmations').delete().eq('id', id);
    setSaved(s => s.filter(x => x.id !== id));
  }

  async function toggleGoal(id: string, completed: boolean) {
    await supabase.from('vision_goals').update({ completed: !completed }).eq('id', id);
    setGoals(g => g.map(x => x.id === id ? { ...x, completed: !completed } : x));
  }

  async function addGoal() {
    if (!newGoalTitle.trim()) { toast.error('Add a title'); return; }
    setSavingGoal(true);
    const { data } = await supabase.from('vision_goals').insert({
      user_id: userId, title: newGoalTitle.trim(), description: newGoalDesc.trim() || null,
      category: newGoalCategory, completed: false, sort_order: goals.length,
    }).select().single();
    if (data) {
      setGoals(g => [...g, data]);
      setShowGoalModal(false);
      setNewGoalTitle('');
      setNewGoalDesc('');
      toast.success('Dream added! 🌟');
    }
    setSavingGoal(false);
  }

  async function deleteGoal(id: string) {
    await supabase.from('vision_goals').delete().eq('id', id);
    setGoals(g => g.filter(x => x.id !== id));
  }

  function handlePhotoFile(file: File) {
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = e => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadPhoto() {
    if (!photoFile) { toast.error('Select a photo first'); return; }
    setUploading(true);
    try {
      const ext = photoFile.name.split('.').pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('vision').upload(path, photoFile);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('vision').getPublicUrl(path);
      const { data } = await supabase.from('vision_photos').insert({
        user_id: userId, url: urlData.publicUrl, caption: photoCaption.trim() || null,
      }).select().single();
      if (data) {
        setPhotos(p => [data, ...p]);
        setShowPhotoModal(false);
        setPhotoFile(null);
        setPhotoPreview(null);
        setPhotoCaption('');
        toast.success('Photo added! 📸');
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function deletePhoto(id: string) {
    await supabase.from('vision_photos').delete().eq('id', id);
    setPhotos(p => p.filter(x => x.id !== id));
  }

  const completedCount = goals.filter(g => g.completed).length;
  const progressPct = goals.length > 0 ? Math.round(completedCount / goals.length * 100) : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold mb-1" style={{ color: 'var(--text)' }}>Vision Board</h1>
        <p className="text-[14px]" style={{ color: 'var(--text-2)' }}>Your dreams, your why, your fuel. Come back here every day.</p>
      </div>

      {/* Scripture + Affirmation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(79,126,248,0.08) 100%)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={16} style={{ color: '#6366f1' }} />
              <span className="text-[11px] font-bold" style={{ color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today's Scripture</span>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchScripture} style={{ background: 'rgba(99,102,241,0.1)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#6366f1' }}>
                <RefreshCw size={13} />
              </button>
              <button onClick={saveScripture} style={{ background: 'rgba(99,102,241,0.1)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#6366f1' }}>
                <Bookmark size={13} />
              </button>
            </div>
          </div>
          {loadingScripture ? (
            <div className="flex items-center gap-2" style={{ color: '#6366f1' }}>
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[13px]">Loading scripture...</span>
            </div>
          ) : scripture ? (
            <>
              <p className="text-[16px] font-medium leading-relaxed mb-3" style={{ color: 'var(--text)', fontStyle: 'italic' }}>"{scripture.text}"</p>
              <p className="text-[12px] font-bold" style={{ color: '#6366f1' }}>{scripture.reference}</p>
            </>
          ) : null}
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(249,115,22,0.06) 100%)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} style={{ color: '#f59e0b' }} />
              <span className="text-[11px] font-bold" style={{ color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Daily Affirmation</span>
            </div>
            <div className="flex gap-2">
              <button onClick={generateAffirmation} disabled={loadingAffirmation} style={{ background: 'rgba(245,158,11,0.1)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#f59e0b' }}>
                <RefreshCw size={13} className={loadingAffirmation ? 'animate-spin' : ''} />
              </button>
              <button onClick={saveAffirmation} style={{ background: 'rgba(245,158,11,0.1)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#f59e0b' }}>
                <Bookmark size={13} />
              </button>
            </div>
          </div>
          {loadingAffirmation ? (
            <div className="flex items-center gap-2" style={{ color: '#f59e0b' }}>
              <Sparkles size={14} className="animate-pulse" />
              <span className="text-[13px]">Generating your affirmation...</span>
            </div>
          ) : (
            <p className="text-[15px] font-medium leading-relaxed" style={{ color: 'var(--text)' }}>{affirmation}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-hover)' }}>
        {(['board', 'saved'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-5 py-2 rounded-lg text-[13px] font-semibold transition-all"
            style={{ background: activeTab === tab ? 'var(--bg-card)' : 'transparent', color: activeTab === tab ? 'var(--text)' : 'var(--text-3)', border: 'none', cursor: 'pointer', boxShadow: activeTab === tab ? 'var(--shadow)' : 'none' }}>
            {tab === 'board' ? '🌟 My Dreams' : `📌 Saved (${saved.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'board' && (
        <>
          {goals.length > 0 && (
            <div className="rounded-2xl p-5 mb-6 card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>Life Progress</p>
                  <p className="text-[12px]" style={{ color: 'var(--text-2)' }}>{completedCount} of {goals.length} dreams manifested</p>
                </div>
                <span className="text-[28px] font-black" style={{ color: progressPct >= 50 ? '#22c55e' : '#4f7ef8' }}>{progressPct}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%`, background: 'linear-gradient(to right, #4f7ef8, #22c55e)' }} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {goals.map(goal => {
              const colors = CATEGORY_COLORS[goal.category] || CATEGORY_COLORS.dream;
              return (
                <div key={goal.id} className="rounded-2xl p-5 card" style={{ opacity: goal.completed ? 0.7 : 1, borderLeft: `3px solid ${colors.color}` }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 inline-block"
                        style={{ background: colors.bg, color: colors.color }}>{goal.category}</span>
                      {goal.completed && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>✓ Done</span>}
                      <h3 className="text-[15px] font-bold mt-1" style={{ color: 'var(--text)', textDecoration: goal.completed ? 'line-through' : 'none' }}>{goal.title}</h3>
                      {goal.description && <p className="text-[12px] mt-1" style={{ color: 'var(--text-2)' }}>{goal.description}</p>}
                    </div>
                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      <button onClick={() => toggleGoal(goal.id, goal.completed)}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: goal.completed ? 'rgba(34,197,94,0.15)' : 'var(--bg-hover)', border: `2px solid ${goal.completed ? '#22c55e' : 'var(--border)'}`, cursor: 'pointer' }}>
                        {goal.completed && <Check size={12} style={{ color: '#22c55e' }} />}
                      </button>
                      <button onClick={() => deleteGoal(goal.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-3)' }}>
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <button onClick={() => setShowGoalModal(true)}
              className="rounded-2xl p-5 flex flex-col items-center justify-center gap-2"
              style={{ border: '2px dashed var(--border)', background: 'transparent', cursor: 'pointer', minHeight: 100 }}>
              <Plus size={20} style={{ color: 'var(--text-3)' }} />
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-3)' }}>Add a dream</span>
            </button>
          </div>

          {/* Photos */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[17px] font-bold" style={{ color: 'var(--text)' }}>Vision Photos</h2>
                <p className="text-[12px]" style={{ color: 'var(--text-2)' }}>Upload photos of your dream life</p>
              </div>
              <button onClick={() => setShowPhotoModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold text-white"
                style={{ background: '#4f7ef8', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,126,248,0.3)' }}>
                <Upload size={14} /> Upload Photo
              </button>
            </div>

            {photos.length === 0 ? (
              <div onClick={() => setShowPhotoModal(true)}
                className="rounded-2xl p-12 flex flex-col items-center justify-center gap-3 cursor-pointer"
                style={{ border: '2px dashed var(--border)', background: 'var(--bg-hover)' }}>
                <Image size={32} style={{ color: 'var(--text-3)' }} />
                <p className="text-[14px] font-medium" style={{ color: 'var(--text-2)' }}>Add photos of your vision</p>
                <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>Your dream home, dream car, dream destinations</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {photos.map(photo => (
                  <div key={photo.id} className="relative rounded-2xl overflow-hidden group" style={{ aspectRatio: '4/3' }}>
                    <img src={photo.url} alt={photo.caption || 'Vision'} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }}>
                      {photo.caption && <p className="text-white text-[12px] font-medium px-3 pb-2">{photo.caption}</p>}
                      <button onClick={() => deletePhoto(photo.id)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: '#fff' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setShowPhotoModal(true)}
                  className="rounded-2xl flex items-center justify-center"
                  style={{ border: '2px dashed var(--border)', background: 'transparent', cursor: 'pointer', aspectRatio: '4/3' }}>
                  <Plus size={20} style={{ color: 'var(--text-3)' }} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'saved' && (
        <div className="space-y-3">
          {saved.length === 0 ? (
            <div className="rounded-2xl p-12 text-center card">
              <Bookmark size={32} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
              <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--text)' }}>No saved items yet</p>
              <p className="text-[13px]" style={{ color: 'var(--text-2)' }}>Bookmark scriptures and affirmations that speak to you</p>
            </div>
          ) : (
            saved.map(item => (
              <div key={item.id} className="rounded-2xl p-5 card"
                style={{ borderLeft: `3px solid ${item.type === 'scripture' ? '#6366f1' : '#f59e0b'}` }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 inline-block"
                      style={{ background: item.type === 'scripture' ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)', color: item.type === 'scripture' ? '#6366f1' : '#f59e0b' }}>
                      {item.type === 'scripture' ? '📖 Scripture' : '⭐ Affirmation'}
                    </span>
                    <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text)', fontStyle: item.type === 'scripture' ? 'italic' : 'normal' }}>
                      {item.type === 'scripture' ? `"${item.content}"` : item.content}
                    </p>
                    {item.reference && <p className="text-[12px] font-bold mt-2" style={{ color: item.type === 'scripture' ? '#6366f1' : '#f59e0b' }}>{item.reference}</p>}
                  </div>
                  <button onClick={() => deleteSaved(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', marginLeft: 12 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>Add a Dream</h2>
              <button onClick={() => setShowGoalModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dream / Goal</label>
                <input value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} placeholder="e.g. Buy a Lamborghini" />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</label>
                <textarea value={newGoalDesc} onChange={e => setNewGoalDesc(e.target.value)} placeholder="What does this mean to you?" rows={3} />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</label>
                <select value={newGoalCategory} onChange={e => setNewGoalCategory(e.target.value)}>
                  <option value="financial">Financial</option>
                  <option value="lifestyle">Lifestyle</option>
                  <option value="love">Love</option>
                  <option value="family">Family</option>
                  <option value="legacy">Legacy</option>
                  <option value="health">Health</option>
                  <option value="purpose">Purpose</option>
                  <option value="faith">Faith</option>
                  <option value="dream">Other</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowGoalModal(false)} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={addGoal} disabled={savingGoal} style={{ background: '#4f7ef8', border: 'none', color: '#fff', padding: '9px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, boxShadow: '0 2px 8px rgba(79,126,248,0.3)' }}>
                {savingGoal ? 'Saving...' : 'Add Dream 🌟'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>Add Vision Photo</h2>
              <button onClick={() => { setShowPhotoModal(false); setPhotoFile(null); setPhotoPreview(null); setPhotoCaption(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <img src={photoPreview} alt="Preview" className="w-full object-cover" style={{ maxHeight: 220 }} />
                  <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', color: '#fff' }}>
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div onClick={() => photoRef.current?.click()}
                  className="rounded-xl flex flex-col items-center justify-center gap-2 py-10 cursor-pointer"
                  style={{ border: '2px dashed var(--border)', background: 'var(--bg-hover)' }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handlePhotoFile(f); }}>
                  <Upload size={24} style={{ color: 'var(--text-3)' }} />
                  <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>Drop photo or click to upload</p>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); }} />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Caption (optional)</label>
                <input value={photoCaption} onChange={e => setPhotoCaption(e.target.value)} placeholder="e.g. My dream home in Miami" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setShowPhotoModal(false); setPhotoFile(null); setPhotoPreview(null); setPhotoCaption(''); }}
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-2)', padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={uploadPhoto} disabled={uploading || !photoFile}
                style={{ background: '#4f7ef8', border: 'none', color: '#fff', padding: '9px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: uploading || !photoFile ? 0.6 : 1, boxShadow: '0 2px 8px rgba(79,126,248,0.3)' }}>
                {uploading ? 'Uploading...' : 'Add to Board 📸'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
