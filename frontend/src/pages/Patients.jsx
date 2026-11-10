import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  AlertCircle, 
  X,
  CheckCircle2,
  Calendar,
  Heart
} from 'lucide-react';
import { getPatients, createPatient, updatePatient, deletePatient } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [formData, setFormData] = useState({
    patient_name: '',
    age: '',
    gender: 'Other',
    notes: ''
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [error, setError] = useState(null);

  const fetchPatients = async (query = '') => {
    try {
      const res = await getPatients(query);
      setPatients(res.data);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPatients(search);
  };

  const handleOpenCreate = () => {
    setEditingPatient(null);
    setFormData({ patient_name: '', age: '', gender: 'Female', notes: '' });
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingPatient(p);
    setFormData({
      patient_name: p.patient_name,
      age: p.age ?? '',
      gender: p.gender ?? 'Other',
      notes: p.notes ?? ''
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const payload = {
        patient_name: formData.patient_name,
        age: formData.age ? parseInt(formData.age, 10) : null,
        gender: formData.gender,
        notes: formData.notes
      };

      if (editingPatient) {
        await updatePatient(editingPatient.patient_id, payload);
      } else {
        await createPatient(payload);
      }

      setModalOpen(false);
      fetchPatients(search);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save profile.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePatient(id);
      setDeleteConfirmId(null);
      fetchPatients(search);
    } catch (err) {
      alert('Failed to delete profile.');
    }
  };

  if (loading) return <LoadingSpinner message="Loading your saved profiles..." />;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Family & Member Profiles
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Organize and track skin spot photos for yourself and your loved ones in one secure place.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Member / Profile</span>
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by profile name..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Profiles List Table */}
      {patients.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-4">Profile ID</th>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Checked Spots</th>
                  <th className="py-3 px-4">Comparisons</th>
                  <th className="py-3 px-4">Added On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.patient_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {p.patient_id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <Link to={`/patients/${p.patient_id}`} className="hover:text-brand-600">
                        {p.patient_name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {p.age ? `${p.age} yrs` : 'Age N/A'}, {p.gender || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">
                        {p.analyses_count} checks
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        {p.monitoring_count} comparisons
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <Link
                        to={`/patients/${p.patient_id}`}
                        title="View profile & history"
                        className="inline-flex items-center p-1.5 rounded-lg text-slate-500 hover:text-brand-700 hover:bg-brand-50"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        title="Edit profile"
                        className="inline-flex items-center p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(p.patient_id)}
                        title="Delete profile"
                        className="inline-flex items-center p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Member Profiles Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create a profile (e.g. "Myself" or family members) to organize and track photos of different spots over time.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold"
          >
            Create My Profile
          </button>
        </div>
      )}

      {/* Modal: Create / Edit Profile */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingPatient ? 'Edit Profile' : 'Add New Member Profile'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Name / Nickname *
                </label>
                <input
                  type="text"
                  required
                  value={formData.patient_name}
                  onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                  placeholder="e.g. Myself, Sarah, or Dad"
                  className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50 p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Age (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="125"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="e.g. 38"
                    className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50 p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50 p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Skin History
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Fair skin, sunburns easily, has family history of moles..."
                  className="w-full text-xs rounded-xl border border-slate-300 bg-slate-50 p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                  {error}
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm"
                >
                  {editingPatient ? 'Save Changes' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Delete Profile?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove profile <b>{deleteConfirmId}</b> and all associated spot check records?
              </p>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;
