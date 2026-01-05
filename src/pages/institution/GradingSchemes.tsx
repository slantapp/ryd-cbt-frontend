import { useEffect, useState } from 'react';
import { gradingSchemeAPI, subjectAPI, testGroupAPI, sessionAPI, teacherAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
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
  const { account } = useAuthStore();
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
  const [bulkFormData, setBulkFormData] = useState({
    subjectIds: [] as string[],
    sessionClassIds: [] as string[],
    weights: [] as Array<{ testGroupId: string; weight: number }>,
  });
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [totalWeight, setTotalWeight] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Calculate total weight whenever weights change
    const weights = isBulkMode ? bulkFormData.weights : formData.weights;
    const total = weights.reduce((sum, w) => sum + (w.weight || 0), 0);
    setTotalWeight(total);
  }, [formData.weights, bulkFormData.weights, isBulkMode]);

  useEffect(() => {
    // Initialize weights when subject is selected and test groups are loaded (single mode)
    if (!isBulkMode && formData.subjectId && testGroups.length > 0 && !editingId) {
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
    
    // Initialize weights for bulk mode when test groups are loaded
    if (isBulkMode && testGroups.length > 0 && !editingId) {
      const activeTestGroups = testGroups.filter(tg => tg.isActive);
      const existingWeightIds = new Set(bulkFormData.weights.map(w => w.testGroupId));
      const missingTestGroups = activeTestGroups.filter(tg => !existingWeightIds.has(tg.id));
      
      if (missingTestGroups.length > 0) {
        setBulkFormData(prev => ({
          ...prev,
          weights: [
            ...prev.weights,
            ...missingTestGroups.map(tg => ({ testGroupId: tg.id, weight: 0 }))
          ],
        }));
      }
    }
  }, [formData.subjectId, testGroups, editingId, isBulkMode]);

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
      let sessions: any[] = [];
      let assignedClassroomIds: string[] = [];

      // If teacher, get their assignments and filter sessions
      if (account?.role === 'TEACHER') {
        const teacherResponse = await teacherAPI.dashboard();
        const teacherData = teacherResponse.data;
        
        // Get assigned classroom IDs
        if (teacherData?.assignments && Array.isArray(teacherData.assignments)) {
          assignedClassroomIds = teacherData.assignments
            .map((a: any) => a.classroom?.id || a.classroomId)
            .filter((id: string) => id);
        }
        
        // Get sessions from teacher dashboard (already filtered)
        if (teacherData?.sessions && Array.isArray(teacherData.sessions)) {
          sessions = teacherData.sessions;
        }
      } else {
        // For non-teachers, load all sessions
        const sessionsResponse = await sessionAPI.getAll();
        sessions = sessionsResponse.data || [];
      }
      
      // Flatten session-class combinations
      const sessionClassList: SessionClass[] = [];
      sessions.forEach((session: any) => {
        if (session.classAssignments && Array.isArray(session.classAssignments)) {
          session.classAssignments.forEach((ca: any) => {
            const classroomId = ca.classroomId || ca.classroom?.id;
            
            // Skip if no classroom ID
            if (!classroomId) {
              return;
            }
            
            // If teacher, only include session classes for assigned classrooms
            if (account?.role === 'TEACHER') {
              if (!assignedClassroomIds.includes(classroomId)) {
                return; // Skip this session class
              }
            }
            
            sessionClassList.push({
              id: ca.id,
              sessionId: session.id,
              classroomId: classroomId,
              session: { id: session.id, name: session.name },
              classroom: ca.classroom || { id: classroomId, name: ca.classroom?.name || 'Unknown' },
            });
          });
        }
      });
      
      setSessionClasses(sessionClassList);
    } catch (error: any) {
      console.error('Failed to load session classes:', error);
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
    
    if (isBulkMode) {
      // Bulk mode validation
      if (bulkFormData.subjectIds.length === 0) {
        toast.error('Please select at least one subject');
        return;
      }

      if (bulkFormData.sessionClassIds.length === 0) {
        toast.error('Please select at least one class-session combination');
        return;
      }

      // Filter out test groups with 0 weight
      const nonZeroWeights = bulkFormData.weights.filter(w => w.weight > 0);

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
        const response = await gradingSchemeAPI.bulkCreate({
          subjectIds: bulkFormData.subjectIds,
          sessionClassIds: bulkFormData.sessionClassIds,
          weights: nonZeroWeights,
        });
        
        const { created, skipped } = response.data;
        toast.success(
          `Created ${created.length} grading scheme(s)${skipped > 0 ? `, ${skipped} already existed` : ''}`
        );
        
        setShowForm(false);
        setBulkFormData({ subjectIds: [], sessionClassIds: [], weights: [] });
        loadGradingSchemes();
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Failed to create grading schemes');
      }
    } else {
      // Single mode validation
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
    setIsBulkMode(false);
    setFormData({ subjectId: '', sessionClassId: '', weights: [] });
    setBulkFormData({ subjectIds: [], sessionClassIds: [], weights: [] });
  };

  const handleBulkWeightChange = (testGroupId: string, value: string) => {
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
    const existingIndex = bulkFormData.weights.findIndex(w => w.testGroupId === testGroupId);
    
    if (existingIndex >= 0) {
      // Update existing weight
      setBulkFormData({
        ...bulkFormData,
        weights: bulkFormData.weights.map((w, idx) =>
          idx === existingIndex ? { ...w, weight: clampedValue } : w
        ),
      });
    } else {
      // Add new weight entry
      setBulkFormData({
        ...bulkFormData,
        weights: [...bulkFormData.weights, { testGroupId, weight: clampedValue }],
      });
    }
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingId ? 'Edit Grading Scheme' : 'Create Grading Scheme'}
            </h2>
            {!editingId && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Mode:</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkMode(false);
                    setFormData({ subjectId: '', sessionClassId: '', weights: [] });
                    setBulkFormData({ subjectIds: [], sessionClassIds: [], weights: [] });
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !isBulkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Single
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkMode(true);
                    setFormData({ subjectId: '', sessionClassId: '', weights: [] });
                    setBulkFormData({ subjectIds: [], sessionClassIds: [], weights: [] });
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isBulkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Bulk
                </button>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {isBulkMode ? (
              // Bulk Mode Form
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subjects <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input-field"
                    value=""
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (selectedId && !bulkFormData.subjectIds.includes(selectedId)) {
                        setBulkFormData({ 
                          ...bulkFormData, 
                          subjectIds: [...bulkFormData.subjectIds, selectedId] 
                        });
                        e.target.value = ''; // Reset dropdown
                      }
                    }}
                  >
                    <option value="">Select a subject to add...</option>
                    {subjects.filter(s => s.isActive && !bulkFormData.subjectIds.includes(s.id)).map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  
                  {/* Selected Subjects Display */}
                  {bulkFormData.subjectIds.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-600 font-medium">Selected Subjects:</p>
                      <div className="flex flex-wrap gap-2">
                        {bulkFormData.subjectIds.map((subjectId) => {
                          const subject = subjects.find(s => s.id === subjectId);
                          if (!subject) return null;
                          return (
                            <span
                              key={subjectId}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                            >
                              {subject.name}
                              <button
                                type="button"
                                onClick={() => {
                                  setBulkFormData({
                                    ...bulkFormData,
                                    subjectIds: bulkFormData.subjectIds.filter(id => id !== subjectId)
                                  });
                                }}
                                className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 focus:outline-none"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class-Sessions <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input-field"
                    value=""
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (selectedId && !bulkFormData.sessionClassIds.includes(selectedId)) {
                        setBulkFormData({ 
                          ...bulkFormData, 
                          sessionClassIds: [...bulkFormData.sessionClassIds, selectedId] 
                        });
                        e.target.value = ''; // Reset dropdown
                      }
                    }}
                  >
                    <option value="">Select a class-session to add...</option>
                    {sessionClasses.filter(sc => !bulkFormData.sessionClassIds.includes(sc.id)).map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.classroom.name} - {sc.session.name}
                      </option>
                    ))}
                  </select>
                  
                  {/* Selected Class-Sessions Display */}
                  {bulkFormData.sessionClassIds.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-600 font-medium">Selected Class-Sessions:</p>
                      <div className="flex flex-wrap gap-2">
                        {bulkFormData.sessionClassIds.map((sessionClassId) => {
                          const sc = sessionClasses.find(s => s.id === sessionClassId);
                          if (!sc) return null;
                          return (
                            <span
                              key={sessionClassId}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                            >
                              {sc.classroom.name} - {sc.session.name}
                              <button
                                type="button"
                                onClick={() => {
                                  setBulkFormData({
                                    ...bulkFormData,
                                    sessionClassIds: bulkFormData.sessionClassIds.filter(id => id !== sessionClassId)
                                  });
                                }}
                                className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200 focus:outline-none"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Single Mode Form
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
            )}

            {((!isBulkMode && formData.subjectId) || (isBulkMode && (bulkFormData.subjectIds.length > 0 || bulkFormData.sessionClassIds.length > 0))) && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Test Group Weights <span className="text-red-500">*</span>
                    {isBulkMode && (
                      <span className="text-xs text-gray-500 ml-2">
                        (Applied to all selected combinations)
                      </span>
                    )}
                  </label>
                  <div className={`text-sm font-semibold ${Math.abs(totalWeight - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    Total: {totalWeight.toFixed(2)}% {Math.abs(totalWeight - 100) < 0.01 && '✓'}
                  </div>
                </div>
                <div className="space-y-3">
                  {testGroups.filter(tg => tg.isActive).map((tg) => {
                    const weights = isBulkMode ? bulkFormData.weights : formData.weights;
                    const weightEntry = weights.find(w => w.testGroupId === tg.id);
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
                              if (isBulkMode) {
                                handleBulkWeightChange(tg.id, inputValue);
                              } else {
                                handleWeightChange(tg.id, inputValue);
                              }
                            }}
                            onBlur={(e) => {
                              // On blur, ensure we have a valid number (default to 0 if empty)
                              const value = e.target.value.trim();
                              if (value === '' || value === '.' || isNaN(parseFloat(value))) {
                                if (isBulkMode) {
                                  handleBulkWeightChange(tg.id, '0');
                                } else {
                                  handleWeightChange(tg.id, '0');
                                }
                              } else {
                                // Re-validate and clamp the value
                                if (isBulkMode) {
                                  handleBulkWeightChange(tg.id, value);
                                } else {
                                  handleWeightChange(tg.id, value);
                                }
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
                {isBulkMode && bulkFormData.subjectIds.length > 0 && bulkFormData.sessionClassIds.length > 0 && (
                  <p className="mt-3 text-sm text-blue-600">
                    This will create {bulkFormData.subjectIds.length * bulkFormData.sessionClassIds.length} grading scheme(s) 
                    for all combinations of selected subjects and class-sessions.
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
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Subject</th>
                    <th className="px-2 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden md:table-cell">Class-Session</th>
                    <th className="px-2 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Test Groups & Weights</th>
                    <th className="px-2 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden sm:table-cell">Total</th>
                    <th className="px-2 sm:px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                {gradingSchemes.map((scheme) => {
                  const total = scheme.weights?.reduce((sum, w) => sum + w.weight, 0) || 0;
                  return (
                    <tr key={scheme.id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 md:px-6 py-3 font-semibold text-gray-900 text-xs sm:text-sm">
                        {scheme.subject?.name || 'Unknown'}
                      </td>
                      <td className="px-2 sm:px-4 md:px-6 py-3 text-xs sm:text-sm text-gray-700 hidden md:table-cell">
                        {scheme.sessionClass?.classroom?.name || 'Unknown'} - {scheme.sessionClass?.session?.name || 'Unknown'}
                      </td>
                      <td className="px-2 sm:px-4 md:px-6 py-3 text-xs sm:text-sm text-gray-700">
                        <div className="space-y-1">
                          {scheme.weights?.map((w) => (
                            <div key={w.id} className="flex items-center space-x-2">
                              <span className="font-medium">{w.testGroup?.name || 'Unknown'}:</span>
                              <span>{w.weight.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 md:px-6 py-3 hidden sm:table-cell">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          Math.abs(total - 100) < 0.01
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {total.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 md:px-6 py-3">
                        <div className="flex space-x-1 sm:space-x-2">
                          <button
                            onClick={() => handleEdit(scheme)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors text-xs sm:text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(scheme.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors text-xs sm:text-sm"
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
          </div>
        )}
      </div>
    </div>
  );
}

