'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import LoraLibrary from '@/components/admin/LoraLibrary';
import MissionControl from '@/components/admin/MissionControl';
import PhotoShootStudio from '@/components/admin/PhotoShootStudio';
import { adminAuthClient } from '@/lib/admin-auth-client';
import { type AdminTab, adminTabFromPath, adminTabPath, pushAdminUrl } from '@/lib/admin-routes';

interface Model {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail_url: string;
  is_premium: boolean;
  is_featured: boolean;
  nano_banana_model: string;
  generation_mode: 'text-to-image' | 'image-to-image' | 'both';
  sample_prompts?: string[];
  negative_prompt?: string;
  generated_images?: string[];
  capabilities?: {
    max_resolution: string;
    styles: string[];
    speed: string;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthenticated] = useState(true);
  const [userTier] = useState('admin');
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const activeTab = adminTabFromPath(usePathname());
  const setActiveTab = (tab: AdminTab) => pushAdminUrl(adminTabPath(tab));

  // Form state for new model
  const [newModel, setNewModel] = useState({
    name: '',
    description: '',
    category: 'realistic',
    thumbnail_url: '',
    is_premium: false,
    is_featured: false,
    nano_banana_model: 'stable-diffusion-xl',
    generation_mode: 'both' as 'text-to-image' | 'image-to-image' | 'both',
    max_resolution: '1024x1024',
    styles: [] as string[],
    speed: 'fast',
    sample_prompts: [
      'nude woman, completely naked, full body, professional photography',
      'explicit nudity, sexy nude model, no clothes, high quality',
      'naked woman, full nude, uncensored, artistic photography'
    ] as string[],
    negative_prompt: 'child, minor, underage, teenager, young',
    generated_images: [] as string[]
  });
  const [generatingImage, setGeneratingImage] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Auth is guaranteed by the admin layout server component
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadModels(); }, []);

  const handleSignOut = async () => {
    await adminAuthClient.signOut();
    router.push('/admin-login');
  };

  const loadModels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/models', {
        credentials: 'include'
      });
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
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...newModel,
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
          nano_banana_model: 'stable-diffusion-xl',
          generation_mode: 'both',
          max_resolution: '1024x1024',
          styles: [],
          speed: 'fast',
          sample_prompts: [],
          negative_prompt: '',
          generated_images: []
        });
        setUploadedImage(null);
        setCurrentPrompt('');
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
        method: 'DELETE',
        credentials: 'include'
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
        credentials: 'include',
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
        credentials: 'include',
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

  const addSamplePrompt = (prompt: string) => {
    if (prompt && !newModel.sample_prompts.includes(prompt)) {
      setNewModel({ ...newModel, sample_prompts: [...newModel.sample_prompts, prompt] });
    }
  };

  const removeSamplePrompt = (prompt: string) => {
    setNewModel({ ...newModel, sample_prompts: newModel.sample_prompts.filter(p => p !== prompt) });
  };

  const generateImage = async (useImageToImage = false) => {
    if (!currentPrompt.trim() && !useImageToImage) return;

    setGeneratingImage(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: currentPrompt || `nude ${newModel.name || 'woman'}, completely naked, no clothes, full nude, explicit nudity, professional photography, studio lighting, high quality, 8k`,
          model_id: 'stable-diffusion-xl',
          parameters: {
            negative_prompt: 'child, minor, underage, teenager, young',
            width: 1024,
            height: 1024,
            steps: 30,
            guidance_scale: 7.5,
            enhance: false
          },
          ...(useImageToImage && uploadedImage ? { input_image: uploadedImage } : {})
        })
      });

      const result = await response.json();

      // Poll for completion if job is processing
      if (result.status === 'processing' && result.id) {
        const pollJob = async () => {
          const statusResponse = await fetch(`/api/generate?job_id=${result.id}`);
          const statusData = await statusResponse.json();

          if (statusData.status === 'completed' && statusData.image_url) {
            // Add to generated images
            setNewModel(prev => ({
              ...prev,
              generated_images: [...prev.generated_images, statusData.image_url],
              thumbnail_url: prev.thumbnail_url || statusData.image_url
            }));
            setGeneratingImage(false);
          } else if (statusData.status === 'error' || statusData.status === 'failed') {
            alert('Generation failed: ' + (statusData.error || 'Unknown error'));
            setGeneratingImage(false);
          } else {
            setTimeout(pollJob, 2000);
          }
        };
        setTimeout(pollJob, 2000);
      } else if (result.image_url) {
        setNewModel(prev => ({
          ...prev,
          generated_images: [...prev.generated_images, result.image_url],
          thumbnail_url: prev.thumbnail_url || result.image_url
        }));
        setGeneratingImage(false);
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate image');
      setGeneratingImage(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={() => {}}
        userTier={userTier}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage AI models, settings, and configurations
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Sign Out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6">
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
            onClick={() => setActiveTab('create-model')}
            className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'create-model'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            Create Model
          </button>
          <button
            onClick={() => setActiveTab('characters')}
            className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'characters'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            Characters
          </button>
          <button
            onClick={() => setActiveTab('loras')}
            className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'loras'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            LoRAs
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
          <button
            onClick={() => setActiveTab('mission-control')}
            className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
              activeTab === 'mission-control'
                ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            Mission Control
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
                        <th className="text-left py-3 px-4">Model Type</th>
                        <th className="text-left py-3 px-4">Mode</th>
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
                          <td className="py-3 px-4 text-sm">{model.generation_mode || 'text-to-image'}</td>
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

          {activeTab === 'create-model' && (
            <div>
              <PhotoShootStudio />

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
                      Generation Mode
                    </label>
                    <select
                      value={newModel.generation_mode}
                      onChange={(e) => setNewModel({ ...newModel, generation_mode: e.target.value as 'text-to-image' | 'image-to-image' | 'both' })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="text-to-image">Text to Image</option>
                      <option value="image-to-image">Image to Image</option>
                      <option value="both">Both</option>
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

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Negative Prompt (for NSFW generation)
                    </label>
                    <textarea
                      value={newModel.negative_prompt}
                      onChange={(e) => setNewModel({ ...newModel, negative_prompt: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={2}
                      placeholder="clothes, clothing, dressed, covered, censored, child, minor"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Leave empty for default NSFW negative prompts
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sample Prompts
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add sample prompt for this model..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSamplePrompt((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newModel.sample_prompts.map((prompt) => (
                        <span
                          key={prompt}
                          className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded-full text-sm flex items-center"
                        >
                          {prompt}
                          <button
                            type="button"
                            onClick={() => removeSamplePrompt(prompt)}
                            className="ml-2 text-purple-800 dark:text-purple-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Generate Images for Model
                    </label>
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Text to Image
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={currentPrompt}
                            onChange={(e) => setCurrentPrompt(e.target.value)}
                            placeholder="beautiful sexy nude model, professional photography..."
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => generateImage(false)}
                            disabled={generatingImage || !currentPrompt.trim()}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generatingImage ? 'Generating...' : 'Generate'}
                          </button>
                        </div>
                      </div>

                      {(newModel.generation_mode === 'image-to-image' || newModel.generation_mode === 'both') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Image to Image
                          </label>
                          <div className="space-y-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                            />
                            {uploadedImage && (
                              <div className="flex items-center gap-4">
                                <img src={uploadedImage} alt="Uploaded" className="w-20 h-20 object-cover rounded" />
                                <button
                                  type="button"
                                  onClick={() => generateImage(true)}
                                  disabled={generatingImage}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {generatingImage ? 'Generating...' : 'Generate from Image'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {newModel.generated_images.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Generated Images ({newModel.generated_images.length})
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {newModel.generated_images.map((img, idx) => (
                              <div key={idx} className="relative group">
                                <img src={img} alt={`Generated ${idx}`} className="w-full h-24 object-cover rounded" />
                                <button
                                  type="button"
                                  onClick={() => setNewModel(prev => ({
                                    ...prev,
                                    thumbnail_url: img
                                  }))}
                                  className="absolute top-1 right-1 px-2 py-1 bg-green-500 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Set as Thumbnail
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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

          {activeTab === 'characters' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Character Management
              </h2>

              <div className="space-y-6">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    Create and manage character models for image generation
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        if (!confirm('Seed 15 characters? With AI avatars this takes 5–10 min. Use Quick Seed for instant placeholder images.')) return;
                        const btn = document.querySelector('[data-seed-btn]') as HTMLButtonElement;
                        const originalText = btn?.textContent;
                        if (btn) {
                          btn.disabled = true;
                          btn.textContent = 'Seeding... (5–10 min with AI)';
                        }
                        try {
                          const res = await fetch('/api/admin/seed-characters', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ quick: false }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
                          alert(`Seeded ${data.results?.length || 0} characters`);
                          if (data.success) window.location.href = '/characters';
                        } catch (e) {
                          alert('Seed failed: ' + (e as Error).message);
                        } finally {
                          if (btn) {
                            btn.disabled = false;
                            btn.textContent = originalText || 'Seed 15 Secrets-Style Characters';
                          }
                        }
                      }}
                      data-seed-btn
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                    >
                      Seed 15 Secrets-Style Characters
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('Quick seed 15 characters with placeholder images? (instant)')) return;
                        const btn = document.querySelector('[data-quick-seed-btn]') as HTMLButtonElement;
                        const originalText = btn?.textContent;
                        if (btn) {
                          btn.disabled = true;
                          btn.textContent = 'Seeding...';
                        }
                        try {
                          const res = await fetch('/api/admin/seed-characters', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ quick: true }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
                          alert(`Seeded ${data.results?.length || 0} characters`);
                          if (data.success) window.location.href = '/characters';
                        } catch (e) {
                          alert('Seed failed: ' + (e as Error).message);
                        } finally {
                          if (btn) {
                            btn.disabled = false;
                            btn.textContent = originalText || 'Quick Seed (placeholders)';
                          }
                        }
                      }}
                      data-quick-seed-btn
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors font-medium disabled:opacity-50"
                    >
                      Quick Seed (placeholders)
                    </button>
                    <button
                      onClick={async (event) => {
                        if (!confirm('Add the home page cast to the database? Only continue if every cast portrait is AI-generated and shows a fictional adult aged 21 or older. Each portrait becomes that character\'s reference image.')) return;
                        const btn = event.currentTarget;
                        const originalText = btn.textContent;
                        btn.disabled = true;
                        btn.textContent = 'Adding cast...';
                        try {
                          const res = await fetch('/api/admin/seed-cast', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ attestAiGenerated: true }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
                          const results: { slug: string; status: string }[] = data.results || [];
                          const added = results.filter((result) => result.status === 'added').length;
                          const others = results.filter((result) => result.status !== 'added');
                          alert([`Added ${added} of ${results.length} cast members.`, ...others.map((result) => `${result.slug}: ${result.status}`)].join('\n'));
                        } catch (e) {
                          alert('Could not add the cast: ' + (e as Error).message);
                        } finally {
                          btn.disabled = false;
                          btn.textContent = originalText || 'Add Home Cast to Database';
                        }
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors font-medium disabled:opacity-50"
                    >
                      Add Home Cast to Database
                    </button>
                    <Link
                      href="/admin/character"
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      + Create New Character
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Link
                    href="/admin/character?mode=multi"
                    className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
                  >
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900 dark:text-white mb-1">Start with 4+ Images</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Build a consistent character from reference images</div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/character?mode=single"
                    className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
                  >
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900 dark:text-white mb-1">Start with One Image</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Quick setup with a single reference photo</div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/character?mode=desc"
                    className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
                  >
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900 dark:text-white mb-1">Start with Description</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Generate from text description only</div>
                    </div>
                  </Link>
                </div>

                <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Existing Characters
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    View and manage all created character models
                  </p>
                  <a
                    href="/characters"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    View All Characters
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'loras' && <LoraLibrary />}

          {activeTab === 'settings' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Admin Settings
              </h2>

              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Quick Access
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    <a
                      href="/characters"
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">View Characters</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Browse all characters</div>
                      </div>
                    </a>
                    <Link
                      href="/admin/character"
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Create Character</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Add new character</div>
                      </div>
                    </Link>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Nano Banana Configuration
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    API keys and endpoints are set as server environment variables, not on this page.
                  </p>
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

          {activeTab === 'mission-control' && <MissionControl />}
        </div>
      </div>
    </main>
  );
}