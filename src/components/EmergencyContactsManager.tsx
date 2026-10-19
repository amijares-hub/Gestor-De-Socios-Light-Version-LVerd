import React, { useState, useEffect } from 'react';
import { Phone, Plus, Trash2, Edit3, Check, X, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { EmergencyContact } from '../types';

export default function EmergencyContactsManager() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('+34');
  const [formRole, setFormRole] = useState('Propietario');
  const [formActive, setFormActive] = useState(true);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        setContacts(data.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          role: c.role || 'Propietario',
          isActive: c.is_active ?? true,
          createdAt: c.created_at
        })));
      }
    } catch (err) {
      console.error('Error cargando contactos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormName('');
    setFormPhone('+34');
    setFormRole('Propietario');
    setFormActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setFormName(contact.name);
    setFormPhone(contact.phone);
    setFormRole(contact.role);
    setFormActive(contact.isActive);
    setIsModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    let cleanPhone = formPhone.trim().replace(/\s+/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = `+34${cleanPhone}`;
    }

    const payload = {
      name: formName.trim(),
      phone: cleanPhone,
      role: formRole.trim(),
      is_active: formActive
    };

    try {
      if (editingContact) {
        const { error } = await supabase
          .from('emergency_contacts')
          .update(payload)
          .eq('id', editingContact.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('emergency_contacts')
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchContacts();
    } catch (err: any) {
      alert('Error guardando contacto: ' + err.message);
    }
  };

  const handleDeleteContact = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar a ${name} de los destinatarios de alerta WhatsApp?`)) return;
    try {
      const { error } = await supabase.from('emergency_contacts').delete().eq('id', id);
      if (error) throw error;
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert('Error eliminando contacto: ' + err.message);
    }
  };

  const handleToggleActive = async (contact: EmergencyContact) => {
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .update({ is_active: !contact.isActive })
        .eq('id', contact.id);
      if (error) throw error;
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, isActive: !c.isActive } : c));
    } catch (err: any) {
      alert('Error cambiando estado: ' + err.message);
    }
  };

  return (
    <div className="bg-panel-dark border border-border-dark rounded-3xl p-5 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-dark pb-4">
        <div>
          <h3 className="text-sm md:text-base font-bold text-white uppercase flex items-center gap-2">
            <Phone size={18} className="text-emerald-400" />
            Destinatarios de Alerta WhatsApp (Dueños & Seguridad)
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Los números listados aquí recibirán un WhatsApp instantáneo al activarse el botón de pánico o pulsar Ctrl + A.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all shadow"
        >
          <Plus size={15} /> Añadir Número
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2">
          <RefreshCw className="animate-spin" size={16} />
          <span className="text-xs font-mono">Cargando destinatarios...</span>
        </div>
      ) : contacts.length === 0 ? (
        <div className="p-6 text-center bg-brand-dark rounded-2xl border border-dashed border-border-dark text-gray-500 text-xs">
          No hay números configurados. Añade el teléfono del dueño para recibir alertas por WhatsApp.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {contacts.map(c => (
            <div key={c.id} className="p-4 bg-brand-dark border border-border-dark rounded-2xl flex flex-col justify-between space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white text-xs">{c.name}</h4>
                  <p className="text-[10px] font-mono text-emerald-400 font-bold mt-0.5">{c.phone}</p>
                  <span className="text-[9px] text-gray-400 font-mono uppercase">{c.role}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(c)}
                    className="p-1.5 text-gray-400 hover:text-emerald-400 rounded-lg hover:bg-panel-dark transition-colors"
                    title="Editar contacto"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteContact(c.id, c.name)}
                    className="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-panel-dark transition-colors"
                    title="Eliminar contacto"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-border-dark/60 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleActive(c)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase flex items-center gap-1 border ${
                    c.isActive 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' 
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                  }`}
                >
                  {c.isActive ? <Check size={11} /> : <X size={11} />}
                  {c.isActive ? 'Activo' : 'En Pausa'}
                </button>
                <span className="text-[10px] text-gray-500 font-mono">WhatsApp Listo</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Añadir / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-panel-dark border border-border-dark rounded-3xl p-6 max-w-sm w-full relative space-y-4 shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 border-b border-border-dark pb-3">
              <Phone className="text-emerald-400" size={18} />
              <h3 className="text-sm font-bold text-white uppercase">
                {editingContact ? 'Editar Contacto' : 'Nuevo Destinatario WhatsApp'}
              </h3>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ej: Armando (Dueño)"
                  className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">Teléfono Móvil (WhatsApp) *</label>
                <input
                  type="tel"
                  required
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[9px] text-gray-500 mt-0.5 block">Incluye siempre el prefijo del país (ej. +34 para España).</span>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">Rol / Cargo</label>
                <input
                  type="text"
                  value={formRole}
                  onChange={e => setFormRole(e.target.value)}
                  placeholder="Ej: Propietario / Encargado"
                  className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={formActive}
                  onChange={e => setFormActive(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <label htmlFor="activeCheck" className="text-xs text-gray-300 font-bold">
                  Recibir alertas de emergencia activas
                </label>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded-xl shadow-lg flex items-center justify-center gap-2 mt-2"
              >
                <Check size={16} />
                <span>Guardar Contacto</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
