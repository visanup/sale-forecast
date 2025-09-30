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
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');
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
        const SwaggerUI = await import('swagger-ui-dist');
        
        // Test if the service is available first
        const response = await fetch(active.url);
        if (!response.ok) {
          throw new Error(`Service not available: ${response.status} ${response.statusText}`);
        }
        
        // @ts-ignore
        ui = (window as any).SwaggerUIBundle({
          url: active.url,
          domNode: container.current!,
          presets: [
            // @ts-ignore
            (window as any).SwaggerUIBundle.presets.apis
          ],
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
      const response = await api.get('api/v1/api-keys/clients');
      setApiClients(response.data.data);
    } catch (err) {
      // Ignore error - user might not be logged in
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-600/5 to-blue-600/5 dark:from-brand-600/10 dark:to-blue-600/10"></div>
        <div className="relative w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-brand-600 to-blue-600 rounded-xl shadow-lg">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  API Portal
                </h1>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
                Explore and test our comprehensive API documentation. Generate forecasts, manage data, and integrate with your applications.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {selectedApiKey ? (
                <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">API Key Active</span>
                  <button
                    onClick={() => {
                      setSelectedApiKey('');
                      setShowApiKeyInput(false);
                    }}
                    className="ml-2 p-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowApiKeyInput(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-blue-600 text-white font-medium rounded-xl hover:from-brand-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Key className="w-5 h-5" />
                  Add API Key
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showApiKeyInput && (
        <div className="w-full px-4 sm:px-6 lg:px-8 mb-8">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add API Key for Testing</h3>
                <p className="text-gray-600 dark:text-gray-400">Enter your API key to test the endpoints</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter your API key (sf_...)"
                  value={selectedApiKey}
                  onChange={(e) => setSelectedApiKey(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Copy className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowApiKeyInput(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowApiKeyInput(false)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-600 to-blue-600 text-white rounded-xl hover:from-brand-700 hover:to-blue-700 transition-all duration-200 shadow-lg font-medium"
                >
                  Add Key
                </button>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                  <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  You can get an API key from the API Keys Management page or create one using the script.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            {/* Available Services */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-brand-600 to-blue-600 rounded-lg">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Available Services</h3>
              </div>
              
              <div className="space-y-3">
                {services.map(s => {
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
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white border-transparent shadow-lg'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
                          isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-600'
                        }`}>
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                        </div>
                        <div>
                          <div className="font-semibold">{s.name}</div>
                          <div className={`text-sm ${isActive ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>
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
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Service Information</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-brand-600" />
                      <span className="font-semibold text-gray-900 dark:text-white">Service:</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{active.name}</p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-brand-600" />
                      <span className="font-semibold text-gray-900 dark:text-white">Description:</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{active.description}</p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Code className="w-4 h-4 text-brand-600" />
                      <span className="font-semibold text-gray-900 dark:text-white">Endpoints:</span>
                    </div>
                    <div className="space-y-2">
                      {active.endpoints.map(endpoint => (
                        <div key={endpoint} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-brand-600 rounded-full"></div>
                          <code className="text-sm bg-white dark:bg-gray-800 px-2 py-1 rounded border text-gray-800 dark:text-gray-200">
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
            {apiClients.length > 0 && (
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
                    <Key className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your API Clients</h3>
                </div>
                
                <div className="space-y-3">
                  {apiClients.map(client => (
                    <div key={client.clientId} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{client.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Key className="w-3 h-3" />
                            {client.keyCount} active keys
                          </div>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 px-8 py-6 border-b border-gray-200/70 dark:border-gray-700/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-brand-600 to-blue-600 rounded-xl">
                      <Code className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {active.name} Documentation
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Interactive API documentation and testing
                      </p>
                    </div>
                  </div>
                  
                  {selectedApiKey && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        API Key Active
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="relative">
                {loading && (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-brand-600 to-blue-600 rounded-2xl mb-4">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Loading API Documentation
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Please wait while we load the documentation for {active.name}
                      </p>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="p-8">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="inline-flex items-center justify-center w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl">
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                            Connection Error
                          </h3>
                          <div className="text-red-700 dark:text-red-300 space-y-2">
                            <p>{error}</p>
                            <p className="text-sm">
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
  );
}


