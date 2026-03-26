import { useCallback, useState } from 'react';

export interface AlumniRecord {
  id: string;
  student_id: string;
  student_name?: string;
  student_email?: string;
  branch?: string;
  passing_year?: string;
  cgpa?: number;
  job_id?: string | null;
  application_id?: string | null;
  placement_date: string;
  salary?: number | null;
  package_currency: string;
  company: string;
  designation?: string | null;
  location?: string | null;
  placement_type: 'Full-time' | 'Internship' | 'Placement';
  status: 'active' | 'inactive' | 'resigned';
  notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('campusconnect_token') || ''}`,
});

export const useAlumni = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlumni = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/alumni`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch alumni');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e: any) {
      setError(e.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createAlumni = useCallback(async (alumniData: any) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/alumni`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(alumniData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create alumni');
      }
      return await res.json();
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAlumni = useCallback(async (id: string, updates: Partial<AlumniRecord>) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/alumni/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update alumni');
      return await res.json();
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAlumni = useCallback(async (id: string) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/alumni/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete alumni');
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAlumniStatistics = useCallback(async () => {
    const data = await fetchAlumni();
    return {
      totalAlumni: data.length,
      activeAlumni: data.filter((a: AlumniRecord) => a.status === 'active').length,
      averageSalary: data.filter((a: AlumniRecord) => a.salary).length > 0
        ? Math.round(data.filter((a: AlumniRecord) => a.salary)
            .reduce((s: number, a: AlumniRecord) => s + (a.salary || 0), 0) /
            data.filter((a: AlumniRecord) => a.salary).length)
        : 0,
      topCompanies: [...new Set(data.map((a: AlumniRecord) => a.company))],
      placementBreakdown: {
        fullTime: data.filter((a: AlumniRecord) => a.placement_type === 'Full-time').length,
        internship: data.filter((a: AlumniRecord) => a.placement_type === 'Internship').length,
        placement: data.filter((a: AlumniRecord) => a.placement_type === 'Placement').length,
      },
    };
  }, [fetchAlumni]);

  return { fetchAlumni, createAlumni, updateAlumni, deleteAlumni, getAlumniStatistics, loading, error };
};