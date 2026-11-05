import React, { useState, useEffect } from 'react';
import { 
  StickyNote as NoteIcon, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check, 
  Edit3,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { StickyNote, WorkerUser } from '../types';

interface StickyNotesWidgetProps {
  currentUser?: WorkerUser | null;
}

export default function StickyNotesWidget({ currentUser }: StickyNotesWidgetProps) {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Modal para Crear Nota
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newPriority, setNewPriority] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media');
  const [isSaving, setIsSaving] = useState(false);

  // Modal para Ver y Editar Nota
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('sticky_notes')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotes(data.map((n: any) => ({
          id: n.id,
          content: n.content,
          priority: n.priority || 'media',
          createdBy: n.created_by || 'Admin',
          createdAt: n.created_at,
          isArchived: n.is_archived
        })));
      }
    } catch (e) {
      console.error('Error cargando sticky notes:', e);
    }
  };

  useEffect(() => {
    fetchNotes();

    const channel = supabase
      .channel('sticky-notes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sticky_notes' }, () => {
        fetchNotes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || isSaving) return;

    setIsSaving(true);
    const authorName = currentUser?.name || 'Administrador';

    try {
      const { error } = await supabase.from('sticky_notes').insert([{
        content: newContent.trim(),
        priority: newPriority,
        created_by: authorName,
        is_archived: false
      }]);

      if (error) throw error;

      await supabase.from('notifications').insert([{
        title: `📌 NOTA [${newPriority.toUpperCase()}]`,
        message: `${authorName}: "${newContent.trim().slice(0, 75)}${newContent.length > 75 ? '...' : ''}"`,
        priority: newPriority === 'urgente' ? 'high' : 'normal'
      }]);

      setNewContent('');
      setNewPriority('media');
      setIsCreateModalOpen(false);
      setCurrentIndex(0);
      fetchNotes();
    } catch (err: any) {
      alert('Error al crear nota: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDetailModal = (note: StickyNote) => {
    setEditContent(note.content);
    setEditPriority(note.priority);
    setIsDetailModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeNote = notes[currentIndex];
    if (!activeNote || !editContent.trim() || isUpdating) return;

    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('sticky_notes')
        .update({
          content: editContent.trim(),
          priority: editPriority
        })
        .eq('id', activeNote.id);

      if (error) throw error;

      setNotes(prev => prev.map(n => n.id === activeNote.id ? {
        ...n,
        content: editContent.trim(),
        priority: editPriority
      } : n));

      setIsDetailModalOpen(false);
    } catch (err: any) {
      alert('Error al actualizar nota: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArchiveNote = async (noteId: string) => {
    try {
      await supabase
        .from('sticky_notes')
        .update({ is_archived: true })
        .eq('id', noteId);

      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
      if (isDetailModalOpen) setIsDetailModalOpen(false);
    } catch (err) {
      console.error('Error archivando nota:', err);
    }
  };

  const priorityStyles = {
    urgente: {
      badge: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      dot: 'bg-rose-500 animate-pulse'
    },
    alta: {
      badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      dot: 'bg-amber-400'
    },
    media: {
      badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-400'
    },
    baja: {
      badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      dot: 'bg-blue-400'
    }
  };

  const currentNote = notes[currentIndex];
  const pStyle = currentNote ? priorityStyles[currentNote.priority] || priorityStyles.media : priorityStyles.media;

  return (
    <>
      {/* Widget en cabecera */}
      <div className="flex-1 max-w-xl mx-2 min-h-[46px] bg-[#080d0a] border border-[#1a2a1e] rounded-2xl px-3 py-1.5 flex items-center justify-between gap-2 shadow-inner">
        {notes.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-500 text-xs font-mono">
            <NoteIcon size={14} className="text-gray-600" />
            <span className="text-[11px]">Sin notas pendientes</span>
          </div>
        ) : (
          /* Zona interactiva de la nota: clic para abrir pop-up */
          <div 
            onClick={() => handleOpenDetailModal(currentNote)}
            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer hover:bg-[#101b13] p-1 rounded-xl transition-all group"
            title="Haz clic para ver o editar esta nota"
          >
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-wider border shrink-0 flex items-center gap-1 ${pStyle.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`} />
              {currentNote.priority}
            </span>

            <p className="text-xs text-gray-200 truncate font-sans min-w-0 flex-1 group-hover:text-white transition-colors">
              {currentNote.content}
            </p>

            <span className="text-[9px] font-mono text-gray-500 shrink-0 hidden sm:inline-block">
              {currentNote.createdBy}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {notes.length > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setCurrentIndex(prev => (prev === 0 ? notes.length - 1 : prev - 1))}
                className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#1a2a1e] transition-colors"
                title="Nota anterior"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="text-[9px] font-mono text-gray-500 font-bold px-0.5">
                {currentIndex + 1}/{notes.length}
              </span>
              <button
                type="button"
                onClick={() => setCurrentIndex(prev => (prev === notes.length - 1 ? 0 : prev + 1))}
                className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#1a2a1e] transition-colors"
                title="Siguiente nota"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}

          {currentNote && (
            <button
              type="button"
              onClick={() => handleArchiveNote(currentNote.id)}
              className="p-1 text-gray-500 hover:text-rose-400 rounded hover:bg-[#1a2a1e] transition-colors ml-0.5"
              title="Completar / Archivar nota"
            >
              <Trash2 size={12} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-6 px-2 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 hover:text-white text-[10px] font-bold uppercase rounded-lg flex items-center gap-1 transition-all ml-1"
            title="Crear nueva nota"
          >
            <Plus size={11} /> <span className="hidden sm:inline">Nota</span>
          </button>
        </div>
      </div>

      {/* POP-UP: DETALLE Y EDICIÓN DE LA NOTA AL HACER CLIC */}
      {isDetailModalOpen && currentNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-6 max-w-md w-full relative space-y-4 shadow-2xl">
            <button 
              type="button"
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center justify-between border-b border-[#1a2a1e] pb-3 pr-6">
              <div className="flex items-center gap-2">
                <Edit3 className="text-emerald-400" size={18} />
                <h3 className="text-sm font-bold text-white uppercase">Editar Nota de Equipo</h3>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 bg-[#080d0a] p-2.5 rounded-xl border border-[#1a2a1e]">
              <span className="flex items-center gap-1.5">
                <User size={12} className="text-emerald-400" />
                Por: <strong className="text-gray-200">{currentNote.createdBy}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-gray-500" />
                {new Date(currentNote.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1.5">
                  Nivel de Urgencia / Importancia
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['baja', 'media', 'alta', 'urgente'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditPriority(p)}
                      className={`h-8 rounded-xl text-[9px] font-mono font-bold uppercase border transition-all ${
                        editPriority === p 
                          ? priorityStyles[p].badge + ' ring-1 ring-white/30 shadow' 
                          : 'bg-[#080d0a] border-[#1a2a1e] text-gray-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1.5">
                  Texto de la Nota
                </label>
                <textarea
                  required
                  rows={5}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full p-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 resize-none font-sans leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all"
                >
                  <Check size={15} />
                  <span>{isUpdating ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleArchiveNote(currentNote.id)}
                  className="h-11 px-3.5 bg-rose-500/15 hover:bg-rose-600 border border-rose-500/30 text-rose-400 hover:text-white rounded-xl transition-all"
                  title="Eliminar / Archivar esta nota"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR NUEVA NOTA */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-5 max-w-sm w-full relative space-y-3.5 shadow-2xl">
            <button 
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 border-b border-[#1a2a1e] pb-2.5">
              <NoteIcon className="text-emerald-400" size={17} />
              <h3 className="text-xs font-bold text-white uppercase">Nueva Nota / Aviso Rápido</h3>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">
                  Nivel de Urgencia / Importancia
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['baja', 'media', 'alta', 'urgente'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className={`h-7 rounded-lg text-[9px] font-mono font-bold uppercase border transition-all ${
                        newPriority === p 
                          ? priorityStyles[p].badge + ' ring-1 ring-white/30' 
                          : 'bg-[#080d0a] border-[#1a2a1e] text-gray-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">
                  Mensaje de la Nota *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Ej: Avisar al socio de renovación de cuota..."
                  className="w-full p-2.5 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 resize-none font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5"
              >
                <Check size={14} />
                <span>{isSaving ? 'Guardando...' : 'Publicar Nota'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}