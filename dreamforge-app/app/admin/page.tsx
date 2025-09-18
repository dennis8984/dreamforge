'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface Model {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail_url: string;
  is_premium: boolean;
  is_featured: boolean;
  nano_banana_model: string;
  capabilities?: {
    max_resolution: string;
    styles: string[];
    speed: string;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userTier] = useState('admin');
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'models' | 'create' | 'settings'>('models');

  // Form state for new model
  const [newModel, setNewModel] = useState({
    name: '',
    description: '',
    category: 'realistic',
    thumbnail_url: '',
    is_premium: false,
    is_featured: false,
    nano_banana_model: 'gemini-2.5-flash-image-preview',
    max_resolution: '1024x1024',
    styles: [] as string[],
    speed: 'fast'
  });

  useEffect(() => {
    const checkAdminAuth = () => {
      // Check if user is admin
      const token = localStorage.getItem('access_token');
      const adminKey = localStorage.getItem('admin_key');

      // Simple admin check - in production, verify with backend
      // Allow access with query parameter for demo or with token + admin key
      if (window.location.search.includes('admin=true') ||
          (token && adminKey === 'dreamforge_admin_2024')) {
        setIsAuthenticated(true);
        setIsAdmin(true);
      } else {
        // Redirect to login or show access denied
        alert('Admin access required. Add ?admin=true to URL for demo access.');
        router.push('/');
      }
    };

    checkAdminAuth();
    loadModels();
  }, [router]);


  const loadModels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/models');
      if (response.ok) {
        const data = await response.json();
        setModels(data);
      }
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newModel,
          id: Date.now().toString(),
          capabilities: {
            max_resolution: newModel.max_resolution,
            styles: newModel.styles,
            speed: newModel.speed
          }
        })
      });

      if (response.ok) {
        const createdModel = await response.json();
        setModels([...models, createdModel]);
        // Reset form
        setNewModel({
          name: '',
          description: '',
          category: 'realistic',
          thumbnail_url: '',
          is_premium: false,
          is_featured: false,
          nano_banana_model: 'gemini-2.5-flash-image-preview',
          max_resolution: '1024x1024',
          styles: [],
          speed: 'fast'
        });
        setActiveTab('models');
        alert('Model created successfully!');
      }
    } catch (error) {
      console.error('Error creating model:', error);
      alert('Failed to create model');
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    try {
      const response = await fetch(`/api/admin/models/${modelId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setModels(models.filter(m => m.id !== modelId));
        alert('Model deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting model:', error);
      alert('Failed to delete model');
    }
  };

  const handleTogglePremium = async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    try {
      const response = await fetch(`/api/admin/models/${modelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_premium: !model.is_premium })
      });

      if (response.ok) {
        setModels(models.map(m =>
          m.id === modelId ? { ...m, is_premium: !m.is_premium } : m
        ));
      }
    } catch (error) {
      console.error('Error updating model:', error);
    }
  };

  const handleToggleFeatured = async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    try {
      const response = await fetch(`/api/admin/models/${modelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !model.is_featured })
      });

      if (response.ok) {
        setModels(models.map(m =>
          m.id === modelId ? { ...m, is_featured: !m.is_featured } : m
        ));
      }
    } catch (error) {
      console.error('Error updating model:', error);
    }
  };

  const addStyle = (style: string) => {
    if (style && !newModel.styles.includes(style)) {
      setNewModel({ ...newModel, styles: [...newModel.styles, style] });
    }
  };

  const removeStyle = (style: string) => {
    setNewModel({ ...newModel, styles: newModel.styles.filter(s => s !== style) });
  };

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Admin Access Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please login with admin credentials
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        userTier={userTier}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage AI models, settings, and configurations
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('models')}
            className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'models'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            Manage Models
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'create'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            Create Model
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {activeTab === 'models' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                AI Models ({models.length})
              </h2>

              {loading ? (
                <div className="animate-pulse">Loading models...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left py-3 px-4">ID</th>
                        <th className="text-left py-3 px-4">Name</th>
                        <th className="text-left py-3 px-4">Category</th>
                        <th className="text-left py-3 px-4">Premium</th>
                        <th className="text-left py-3 px-4">Featured</th>
                        <th className="text-left py-3 px-4">Nano Banana Model</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {models.map((model) => (
                        <tr key={model.id} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-3 px-4">{model.id}</td>
                          <td className="py-3 px-4 font-medium">{model.name}</td>
                          <td className="py-3 px-4">{model.category}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleTogglePremium(model.id)}
                              className={`px-3 py-1 rounded-full text-xs ${
                                model.is_premium
                                  ? 'bg-purple-100 text-purple-600'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {model.is_premium ? 'Premium' : 'Free'}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleFeatured(model.id)}
                              className={`px-3 py-1 rounded-full text-xs ${
                                model.is_featured
                                  ? 'bg-yellow-100 text-yellow-600'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {model.is_featured ? 'Featured' : 'Regular'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-sm">{model.nano_banana_model}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => router.push(`/model/${model.id}`)}
                              className="text-blue-600 hover:text-blue-700 mr-3"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDeleteModel(model.id)}
                              className="text-red-600 hover:text-red-700"
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
          )}

          {activeTab === 'create' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Create New Model
              </h2>

              <form onSubmit={handleCreateModel} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Model Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newModel.name}
                      onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g. DreamForge Ultra"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={newModel.category}
                      onChange={(e) => setNewModel({ ...newModel, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="realistic">Realistic</option>
                      <option value="anime">Anime</option>
                      <option value="abstract">Abstract</option>
                      <option value="3d">3D</option>
                      <option value="artistic">Artistic</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      required
                      value={newModel.description}
                      onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={3}
                      placeholder="Describe the model's capabilities..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Thumbnail URL
                    </label>
                    <input
                      type="text"
                      value={newModel.thumbnail_url}
                      onChange={(e) => setNewModel({ ...newModel, thumbnail_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nano Banana Model
                    </label>
                    <select
                      value={newModel.nano_banana_model}
                      onChange={(e) => setNewModel({ ...newModel, nano_banana_model: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="gemini-2.5-flash-image-preview">Gemini 2.5 Flash (Preview)</option>
                      <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Resolution
                    </label>
                    <select
                      value={newModel.max_resolution}
                      onChange={(e) => setNewModel({ ...newModel, max_resolution: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="512x512">512x512</option>
                      <option value="1024x1024">1024x1024</option>
                      <option value="2048x2048">2048x2048</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Processing Speed
                    </label>
                    <select
                      value={newModel.speed}
                      onChange={(e) => setNewModel({ ...newModel, speed: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="fast">Fast</option>
                      <option value="medium">Medium</option>
                      <option value="slow">Slow (High Quality)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Style Tags
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add style tag..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addStyle((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newModel.styles.map((style) => (
                        <span
                          key={style}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-sm flex items-center"
                        >
                          {style}
                          <button
                            type="button"
                            onClick={() => removeStyle(style)}
                            className="ml-2 text-blue-800 dark:text-blue-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 flex gap-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newModel.is_premium}
                        onChange={(e) => setNewModel({ ...newModel, is_premium: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Premium Model</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newModel.is_featured}
                        onChange={(e) => setNewModel({ ...newModel, is_featured: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Featured Model</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Model
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('models')}
                    className="px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Admin Settings
              </h2>

              <div className="space-y-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Nano Banana Configuration
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Configure your Nano Banana SDK settings for AI model integration
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        API Key
                      </label>
                      <input
                        type="password"
                        defaultValue="AIzaSyCiMwaVuUFCXVNHmZejVhKmY5YptQJir5A"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Runpod Endpoint
                      </label>
                      <input
                        type="text"
                        defaultValue="https://api.runpod.ai/v2/xez46ruk06q834/run"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Model Storage
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Models are currently stored in-memory. In production, connect to a database.
                  </p>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Export Models as JSON
                  </button>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Quick Access
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Admin URL: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/admin?admin=true</code>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    For production, implement proper authentication with Supabase or similar.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}