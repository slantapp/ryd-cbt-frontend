import { useEffect, useState } from 'react';
import { gradingSchemeAPI, subjectAPI, testGroupAPI, sessionAPI, classroomAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface GradingScheme {
  id: string;
  subjectId: string;
  sessionClassId: string;
  subject?: { id: string; name: string };
  sessionClass?: {
    id: string;
    session?: { id: string; name: string };
    classroom?: { id: string; name: string };
  };
  weights?: Array<{
    id: string;
    testGroupId: string;
    weight: number;
    testGroup?: { id: string; name: string };
  }>;
  createdAt: string;
  updatedAt: string;
}

interface SessionClass {
  id: string;
  sessionId: string;
  classroomId: string;
  session: { id: string; name: string };
  classroom: { id: string; name: string };
}

export default function GradingSchemes() {
  const [gradingSchemes, setGradingSchemes] = useState<GradingScheme[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [testGroups, setTestGroups] = useState<any[]>([]);
  const [sessionClasses, setSessionClasses] = useState<SessionClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    subjectId: '',
    sessionClassId: '',
    weights: [] as Array<{ testGroupId: string; weight: number }>,
  });
  const [totalWeight, setTotalWeight] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Calculate total weight whenever weights change
    const total = formData.weights.reduce((sum, w) => sum + (w.weight || 0), 0);
    setTotalWeight(total);
  }, [formData.weights]);

  useEffect(() => {
    // Initialize weights when subject is selected and test groups are loaded
    if (formData.subjectId && testGroups.length > 0 && !editingId) {
      const activeTestGroups = testGroups.filter(tg => tg.isActive);
      const existingWeightIds = new Set(formData.weights.map(w => w.testGroupId));
      const missingTestGroups = activeTestGroups.filter(tg => !existingWeightIds.has(tg.id));
      
      if (missingTestGroups.length > 0) {
        setFormData(prev => ({
          ...prev,
          weights: [
            ...prev.weights,
            ...missingTestGroups.map(tg => ({ testGroupId: tg.id, weight: 0 }))
          ],
        }));
      }
    }
  }, [formData.subjectId, testGroups, editingId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadGradingSchemes(),
        loadSubjects(),
        loadTestGroups(),
        loadSessionClasses(),
      ]);
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadGradingSchemes = async () => {
    try {
      const response = await gradingSchemeAPI.getAll();
      setGradingSchemes(response.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load grading schemes');
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await subjectAPI.getAll();
      setSubjects(response.data);
    } catch (error: any) {
      console.error('Failed to load subjects');
    }
  };

  const loadTestGroups = async () => {
    try {
      const response = await testGroupAPI.getAll();
      setTestGroups(response.data);
    } catch (error: any) {
      console.error('Failed to load test groups');
    }
  };

  const loadSessionClasses = async () => {
    try {
      // Load sessions with their class assignments
      const sessionsResponse = await sessionAPI.getAll();
      const sessions = sessionsResponse.data || [];
      
      // Flatten session-class combinations
      const sessionClassList: SessionClass[] = [];
      sessions.forEach((session: any) => {
        if (session.classAssignments && Array.isArray(session.classAssignments)) {
          session.classAssignments.forEach((ca: any) => {
            sessionClassList.push({
              id: ca.id,
              sessionId: session.id,
              classroomId: ca.classroomId,
              session: { id: session.id, name: session.name },
              classroom: ca.classroom || { id: ca.classroomId, name: ca.classroom?.name || 'Unknown' },
            });
          });
        }
      });
      
      setSessionClasses(sessionClassList);
    } catch (error: any) {
      console.error('Failed to load session classes');
      toast.error('Failed to load session-class combinations');
    }
  };

  const initializeWeights = () => {
    // Initialize weights for all active test groups
    if (testGroups.length > 0) {
      const activeTestGroups = testGroups.filter(tg => tg.isActive);
      const existingWeights = formData.weights || [];
      
      // Create weights array with existing values or 0 for new test groups
      const newWeights = activeTestGroups.map(tg => {
        const existing = existingWeights.find(w => w.testGroupId === tg.id);
        return existing || { testGroupId: tg.id, weight: 0 };
      });
      
      setFormData({
        ...formData,
        weights: newWeights,
      });
    }
  };

  const handleWeightChange = (testGroupId: string, value: string) => {
    // Allow empty string for typing, but store 0 for empty/invalid values
    let numValue: number;
    if (value === '' || value === '.') {
      numValue = 0;
    } else {
      const parsed = parseFloat(value);
      numValue = isNaN(parsed) ? 0 : parsed;
    }
    
    const clampedValue = Math.max(0, Math.min(100, numValue));
    
    // Ensure weight entry exists for this test group
    const existingIndex = formData.weights.findIndex(w => w.testGroupId === testGroupId);
    
    if (existingIndex >= 0) {
      // Update existing weight
      setFormData({
        ...formData,
        weights: formData.weights.map((w, idx) =>
          idx === existingIndex ? { ...w, weight: clampedValue } : w
        ),
      });
    } else {
      // Add new weight entry
      setFormData({
        ...formData,
        weights: [...formData.weights, { testGroupId, weight: clampedValue }],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subjectId) {
      toast.error('Please select a subject');
      return;
    }

    if (!formData.sessionClassId) {
      toast.error('Please select a class-session combination');
      return;
    }

    // Filter out test groups with 0 weight
    const nonZeroWeights = formData.weights.filter(w => w.weight > 0);

    if (nonZeroWeights.length === 0) {
      toast.error('At least one test group must have a weight greater than 0');
      return;
    }

    // Validate total weight is 100%
    const total = nonZeroWeights.reduce((sum, w) => sum + w.weight, 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`Total weight must equal 100%. Current total: ${total.toFixed(2)}%`);
      return;
    }

    try {
      if (editingId) {
        await gradingSchemeAPI.update(editingId, {
          weights: nonZeroWeights,
        });
        toast.success('Grading scheme updated successfully');
      } else {
        await gradingSchemeAPI.create({
          subjectId: formData.subjectId,
          sessionClassId: formData.sessionClassId,
          weights: nonZeroWeights,
        });
        toast.success('Grading scheme created successfully');
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({ subjectId: '', sessionClassId: '', weights: [] });
      loadGradingSchemes();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save grading scheme');
    }
  };

  const handleEdit = async (scheme: GradingScheme) => {
    setEditingId(scheme.id);
    const existingWeights = scheme.weights?.map(w => ({
      testGroupId: w.testGroupId,
      weight: w.weight,
    })) || [];
    
    // Ensure all active test groups have weight entries (fill missing ones with 0)
    const activeTestGroups = testGroups.filter(tg => tg.isActive);
    const allWeights = activeTestGroups.map(tg => {
      const existing = existingWeights.find(w => w.testGroupId === tg.id);
      return existing || { testGroupId: tg.id, weight: 0 };
    });
    
    setFormData({
      subjectId: scheme.subjectId,
      sessionClassId: scheme.sessionClassId,
      weights: allWeights,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grading scheme?')) {
      return;
    }

    try {
      await gradingSchemeAPI.delete(id);
      toast.success('Grading scheme deleted successfully');
      loadGradingSchemes();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete grading scheme');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ subjectId: '', sessionClassId: '', weights: [] });
  };

  const getSessionClassName = (sessionClassId: string) => {
    const sc = sessionClasses.find(s => s.id === sessionClassId);
    if (!sc) return 'Unknown';
    return `${sc.classroom.name} - ${sc.session.name}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading grading schemes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Grading Schemes</h1>
          <p className="mt-2 text-gray-600">Define how test groups contribute to final scores for subjects and classes</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Create Grading Scheme
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {editingId ? 'Edit Grading Scheme' : 'Create Grading Scheme'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={formData.subjectId}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      subjectId: e.target.value, 
                      sessionClassId: '', 
                      weights: [] 
                    });
                  }}
                  required
                  disabled={!!editingId}
                >
                  <option value="">Select Subject</option>
                  {subjects.filter(s => s.isActive).map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class-Session <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={formData.sessionClassId}
                  onChange={(e) => setFormData({ ...formData, sessionClassId: e.target.value })}
                  required
                  disabled={!!editingId}
                >
                  <option value="">Select Class-Session</option>
                  {sessionClasses.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.classroom.name} - {sc.session.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formData.subjectId && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Test Group Weights <span className="text-red-500">*</span>
                  </label>
                  <div className={`text-sm font-semibold ${Math.abs(totalWeight - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    Total: {totalWeight.toFixed(2)}% {Math.abs(totalWeight - 100) < 0.01 && '✓'}
                  </div>
                </div>
                <div className="space-y-3">
                  {testGroups.filter(tg => tg.isActive).map((tg) => {
                    const weightEntry = formData.weights.find(w => w.testGroupId === tg.id);
                    const weight = weightEntry?.weight ?? 0;
                    // Show empty string when 0 to allow easy typing, otherwise show the value
                    const displayValue = weight === 0 ? '' : (weight % 1 === 0 ? weight.toString() : weight.toFixed(2));
                    return (
                      <div key={tg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <label className="flex-1 text-sm font-medium text-gray-700">
                          {tg.name}
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-24 input-field text-right"
                            value={displayValue}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              // Allow typing (including empty string and partial numbers like "2" or "2.")
                              handleWeightChange(tg.id, inputValue);
                            }}
                            onBlur={(e) => {
                              // On blur, ensure we have a valid number (default to 0 if empty)
                              const value = e.target.value.trim();
                              if (value === '' || value === '.' || isNaN(parseFloat(value))) {
                                handleWeightChange(tg.id, '0');
                              } else {
                                // Re-validate and clamp the value
                                handleWeightChange(tg.id, value);
                              }
                            }}
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-600 w-8">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {Math.abs(totalWeight - 100) > 0.01 && (
                  <p className="mt-3 text-sm text-red-600">
                    Total weight must equal 100%. Current: {totalWeight.toFixed(2)}%
                  </p>
                )}
              </div>
            )}

            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button 
                type="submit" 
                className="btn-primary"
                disabled={Math.abs(totalWeight - 100) > 0.01}
              >
                {editingId ? 'Update' : 'Create'} Grading Scheme
              </button>
              <button type="button" onClick={handleCancel} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grading Schemes List */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">All Grading Schemes</h2>
        {gradingSchemes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No grading schemes yet. Create your first grading scheme to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Class-Session</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Test Groups & Weights</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {gradingSchemes.map((scheme) => {
                  const total = scheme.weights?.reduce((sum, w) => sum + w.weight, 0) || 0;
                  return (
                    <tr key={scheme.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {scheme.subject?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {scheme.sessionClass?.classroom?.name || 'Unknown'} - {scheme.sessionClass?.session?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="space-y-1">
                          {scheme.weights?.map((w) => (
                            <div key={w.id} className="flex items-center space-x-2">
                              <span className="font-medium">{w.testGroup?.name || 'Unknown'}:</span>
                              <span>{w.weight.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          Math.abs(total - 100) < 0.01
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {total.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(scheme)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(scheme.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

