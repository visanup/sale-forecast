import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { 
  Code, 
  Key, 
  Database, 
  Upload, 
  Layers, 
  Globe, 
  Shield, 
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { getActiveApiKey, setActiveApiKey } from '../services/apiKeyStorage';

type Service = { 
  name: string; 
  url: string;
  description: string;
  endpoints: string[];
};

const services: Service[] = [
  { 
    name: 'Data Service', 
    url: (import.meta.env.VITE_DATA_URL || 'http://localhost:6603') + '/openapi.json',
    description: 'Access forecast data and price information',
    endpoints: ['/v1/forecast', '/v1/prices']
  },
  { 
    name: 'Ingest Service', 
    url: (import.meta.env.VITE_INGEST_URL || 'http://localhost:6602') + '/openapi.json',
    description: 'Upload Excel files and manual data entry',
    endpoints: ['/v1/upload', '/v1/manual']
  },
  { 
    name: 'Dim Service', 
    url: (import.meta.env.VITE_DIM_URL || 'http://localhost:6604') + '/openapi.json',
    description: 'Access dimension data (companies, materials, etc.)',
    endpoints: ['/v1/dim/companies', '/v1/dim/materials', '/v1/dim/depts', '/v1/dim/distribution-channels']
  }
];

interface ApiClient {
  clientId: string;
  name: string;
  keyCount: number;
}

export function ApiPortalPage() {
  const [active, setActive] = useState<Service>(services[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiClients, setApiClients] = useState<ApiClient[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState<string>(() => getActiveApiKey() || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchApiClients();
  }, []);

  useEffect(() => {
    let ui: any;
    setLoading(true);
    setError(null);
    
    // Clear container
    if (container.current) {
      container.current.innerHTML = '';
    }

    (async () => {
      try {
        // Test if the service is available first
        const headers: HeadersInit = {};
        if (selectedApiKey) {
          headers['x-api-key'] = selectedApiKey;
        }
        
        const response = await fetch(active.url, { headers });
        if (!response.ok) {
          throw new Error(`Service not available: ${response.status} ${response.statusText}`);
        }
        
        // Load SwaggerUI from CDN
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js';
        
        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css';
        document.head.appendChild(link);
        
        script.onload = () => {
          // Create SwaggerUI instance
          ui = (window as any).SwaggerUIBundle({
            url: active.url,
            domNode: container.current!,
            layout: 'BaseLayout',
            requestInterceptor: (request: any) => {
              // Add API key to requests if available
              if (selectedApiKey) {
                request.headers['x-api-key'] = selectedApiKey;
              }
              return request;
            },
            onComplete: () => {
              setLoading(false);
            },
            onFailure: (error: any) => {
              setError(`Failed to load API documentation: ${error.message || error}`);
              setLoading(false);
            }
          });
        };
        
        script.onerror = () => {
          setError('Failed to load SwaggerUI');
          setLoading(false);
        };
        
        document.head.appendChild(script);
      } catch (err) {
        setError(`Cannot connect to ${active.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    })();
    
    return () => { 
      if (ui && ui.destroy) ui.destroy(); 
      if (container.current) container.current.innerHTML = ''; 
    };
  }, [active, selectedApiKey]);

  const fetchApiClients = async () => {
    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setApiClients([]);
        return;
      }
      
      const response = await fetch('http://localhost:6601/api/v1/api-keys/clients', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiClients(data.data?.data || []);
      } else {
        setApiClients([]);
      }
    } catch (err) {
      // Ignore error - user might not be logged in
      setApiClients([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 py-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-900 dark:to-blue-900"></div>
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366F1' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute -bottom-8 left-40 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>
      </div>

      {/* Header Section */}
      <div className="relative w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-2xl">
              <Code className="w-8 h-8 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">API Portal</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Explore and test our comprehensive API documentation. Generate forecasts, manage data, and integrate with your applications.</p>
        </div>
      </div>

      {showApiKeyInput && (
        <div className="relative w-full px-4 sm:px-6 lg:px-8 mb-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 animate-fade-in-up">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Add API Key for Testing</h3>
                  <p className="text-gray-600 dark:text-gray-400">Enter your API key to test the endpoints</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter your API key (sf_...)"
                    value={selectedApiKey}
                    onChange={(e) => setSelectedApiKey(e.target.value)}
                    className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <Copy className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" />
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowApiKeyInput(false)}
                    className="flex-1 px-6 py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const normalized = selectedApiKey.trim();
                      setActiveApiKey(normalized);
                      setSelectedApiKey(normalized);
                      setShowApiKeyInput(false);
                    }}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
                  >
                    Add Key
                  </button>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-3">
                    <ExternalLink className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span>You can get an API key from the API Keys Management page or create one using the script.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
              {/* Available Services */}
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 animate-fade-in-up">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Available Services</h3>
                </div>
              
                <div className="space-y-4">
                  {services.map((s, index) => {
                    const isActive = active.name === s.name;
                    const serviceIcons = {
                      'Data Service': Database,
                      'Ingest Service': Upload,
                      'Dim Service': Layers
                    };
                    const Icon = serviceIcons[s.name as keyof typeof serviceIcons] || Globe;
                    
                    return (
                      <button
                        key={s.name}
                        onClick={() => setActive(s)}
                        className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 transform hover:scale-105 ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow-2xl'
                            : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-600 border-gray-200 dark:border-gray-600 hover:shadow-xl'
                        }`}
                        style={{animationDelay: `${index * 0.1}s`}}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg ${
                            isActive ? 'bg-white/20' : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700'
                          }`}>
                            <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                          </div>
                          <div>
                            <div className="font-bold text-lg">{s.name}</div>
                            <div className={`text-sm ${isActive ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>
                              {s.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
            </div>

              {/* Service Information */}
              {active && (
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Service Information</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-700/30">
                      <div className="flex items-center gap-3 mb-3">
                        <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span className="font-bold text-gray-900 dark:text-white">Service:</span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-lg font-semibold">{active.name}</p>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-700/30">
                      <div className="flex items-center gap-3 mb-3">
                        <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="font-bold text-gray-900 dark:text-white">Description:</span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{active.description}</p>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-700/30">
                      <div className="flex items-center gap-3 mb-4">
                        <Code className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <span className="font-bold text-gray-900 dark:text-white">Endpoints:</span>
                      </div>
                      <div className="space-y-3">
                        {active.endpoints.map((endpoint, index) => (
                          <div key={endpoint} className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                            <code className="text-sm bg-white dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-mono">
                              {endpoint}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* API Clients */}
              {apiClients && apiClients.length > 0 && (
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Key className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your API Clients</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {apiClients && apiClients.map((client, index) => (
                      <div key={client.clientId} className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-300" style={{animationDelay: `${index * 0.1}s`}}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white text-lg">{client.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
                              <Key className="w-4 h-4" />
                              {client.keyCount} active keys
                            </div>
                          </div>
                          <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Quick API Key Selection */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-700/30">
                    <div className="flex items-center gap-3 mb-3">
                      <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="font-semibold text-blue-800 dark:text-blue-200">Quick Access</span>
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          const demoKey = 'sf_bc8229e6a718bde8a960bf9ae8075682240df3711594c76857c2c05b6e30ebe9';
                          setSelectedApiKey(demoKey);
                          setActiveApiKey(demoKey);
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all duration-300 ${
                          selectedApiKey === 'sf_bc8229e6a718bde8a960bf9ae8075682240df3711594c76857c2c05b6e30ebe9'
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-300 dark:border-green-600'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            selectedApiKey === 'sf_bc8229e6a718bde8a960bf9ae8075682240df3711594c76857c2c05b6e30ebe9'
                              ? 'bg-green-500'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}></div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white text-sm">Demo API Key</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">sf_bc8229e6a718bde8a960bf9ae8075682240df3711594c76857c2c05b6e30ebe9</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
        </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 overflow-hidden animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 px-8 py-8 border-b border-gray-200/70 dark:border-gray-700/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <Code className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {active.name} Documentation
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-lg">
                          Interactive API documentation and testing
                        </p>
                      </div>
                    </div>
                    
                    {selectedApiKey ? (
                      <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl border border-green-200 dark:border-green-700/30">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="font-semibold text-green-800 dark:text-green-200">
                          API Key Active
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl border border-amber-200 dark:border-amber-700/30">
                        <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <span className="font-semibold text-amber-800 dark:text-amber-200">
                          No API Key Selected
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="relative">
                  {!selectedApiKey && !loading && !error && (
                    <div className="p-8">
                      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-amber-200/50 dark:border-amber-800/50 p-8">
                        <div className="flex items-start gap-6">
                          <div className="flex-shrink-0">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg">
                              <Key className="w-8 h-8 text-white" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-4">
                              API Key Required
                            </h3>
                            <div className="text-amber-700 dark:text-amber-300 space-y-3 text-lg">
                              <p className="font-semibold">Please select an API key to access the {active.name} documentation.</p>
                              <p className="text-base">
                                You can add an API key using the "Add API Key" button in the sidebar.
                              </p>
                            </div>
                            <div className="mt-6">
                              <button
                                onClick={() => setShowApiKeyInput(true)}
                                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
                              >
                                Add API Key
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {loading && (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-3xl mb-6 shadow-2xl">
                          <Loader2 className="w-10 h-10 text-white animate-spin" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                          Loading API Documentation
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-lg">
                          Please wait while we load the documentation for {active.name}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {error && (
                    <div className="p-8">
                      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-red-200/50 dark:border-red-800/50 p-8">
                        <div className="flex items-start gap-6">
                          <div className="flex-shrink-0">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl shadow-lg">
                              <XCircle className="w-8 h-8 text-white" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-4">
                              Connection Error
                            </h3>
                            <div className="text-red-700 dark:text-red-300 space-y-3 text-lg">
                              <p className="font-semibold">{error}</p>
                              <p className="text-base">
                                Make sure the {active.name} is running on the expected port.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                
                  {!loading && !error && (
                    <div className="p-0">
                      <div ref={container} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

