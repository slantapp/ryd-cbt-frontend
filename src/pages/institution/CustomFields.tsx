import { useEffect, useState } from 'react';
import { customFieldAPI } from '../../services/api';
import { TestCustomField } from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function CustomFields() {
  const { account } = useAuthStore();
  const [customFields, setCustomFields] = useState<TestCustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingField, setEditingField] = useState<TestCustomField | null>(null);
  const [formData, setFormData] = useState({
    fieldName: '',
    fieldType: 'text',
    isRequired: false,
    options: [] as string[],
    order: 0,
  });
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    if (account && (account.role === 'SCHOOL' || account.role === 'SCHOOL_ADMIN')) {
      loadCustomFields();
    }
  }, [account?.role]);

  const loadCustomFields = async () => {
    try {
      const response = await customFieldAPI.getAll();
      setCustomFields(response.data);
    } catch (error: any) {
      toast.error('Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fieldName) {
      toast.error('Field name is required');
      return;
    }

    if (formData.fieldType === 'select' && formData.options.length === 0) {
      toast.error('At least one option is required for select fields');
      return;
    }

    try {
      const payload: any = {
        fieldName: formData.fieldName,
        fieldType: formData.fieldType,
        isRequired: formData.isRequired,
        order: formData.order,
      };

      if (formData.fieldType === 'select') {
        payload.options = formData.options;
      }

      if (editingField) {
        await customFieldAPI.update(editingField.id, payload);
        toast.success('Custom field updated');
      } else {
        await customFieldAPI.create(payload);
        toast.success('Custom field created');
      }

      setShowForm(false);
      setEditingField(null);
      setFormData({
        fieldName: '',
        fieldType: 'text',
        isRequired: false,
        options: [],
        order: 0,
      });
      loadCustomFields();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save custom field');
    }
  };

  const handleEdit = (field: TestCustomField) => {
    setEditingField(field);
    setFormData({
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      options: Array.isArray(field.options) ? field.options : [],
      order: field.order,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this custom field?')) {
      return;
    }

    try {
      await customFieldAPI.delete(id);
      toast.success('Custom field deleted');
      loadCustomFields();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete custom field');
    }
  };

  const addOption = () => {
    if (newOption.trim()) {
      setFormData({
        ...formData,
        options: [...formData.options, newOption.trim()],
      });
      setNewOption('');
    }
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  if (account && account.role !== 'SCHOOL' && account.role !== 'SCHOOL_ADMIN') {
    return (
      <div className="card">
        <p className="text-red-600">You don't have permission to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading custom fields...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary to-primary-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">Custom Test Fields</h1>
            <p className="text-primary-100 text-lg">Manage custom fields that appear when creating tests</p>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingField(null);
              setFormData({
                fieldName: '',
                fieldType: 'text',
                isRequired: false,
                options: [],
                order: customFields.length,
              });
            }}
            className="bg-white text-primary hover:bg-primary-50 font-semibold py-2.5 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            + Add Custom Field
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card border-2 border-primary-200 shadow-xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {editingField ? 'Edit Custom Field' : 'Create Custom Field'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Field Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="input-field"
                  placeholder="e.g., Subject Code, Chapter Number"
                  value={formData.fieldName}
                  onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Field Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={formData.fieldType}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      fieldType: e.target.value,
                      options: e.target.value === 'select' ? formData.options : [],
                    });
                  }}
                  required
                >
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Select (Dropdown)</option>
                  <option value="boolean">Boolean (Yes/No)</option>
                </select>
              </div>
            </div>

            {formData.fieldType === 'select' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Options <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        className="input-field flex-1"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...formData.options];
                          newOptions[index] = e.target.value;
                          setFormData({ ...formData, options: newOptions });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      className="input-field flex-1"
                      placeholder="Add new option"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addOption();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addOption}
                      className="btn-secondary"
                    >
                      Add Option
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.isRequired}
                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                    className="mr-3 w-5 h-5 text-primary focus:ring-primary rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Required Field</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-2">
              <button type="submit" className="btn-primary">
                {editingField ? 'Update Field' : 'Create Field'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingField(null);
                  setFormData({
                    fieldName: '',
                    fieldType: 'text',
                    isRequired: false,
                    options: [],
                    order: 0,
                  });
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Custom Fields ({customFields.length})</h2>
        {customFields.length === 0 ? (
          <p className="text-gray-500">No custom fields defined. Create one to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Field Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Required
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customFields.map((field) => (
                  <tr key={field.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {field.fieldName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {field.fieldType}
                      {field.fieldType === 'select' && field.options && (
                        <span className="ml-2 text-xs text-gray-400">
                          ({Array.isArray(field.options) ? field.options.length : 0} options)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {field.isRequired ? (
                        <span className="text-red-600 font-medium">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {field.order}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(field)}
                        className="text-primary hover:text-primary-600 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(field.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

