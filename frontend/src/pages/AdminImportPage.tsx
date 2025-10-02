import { useState } from 'react';
import { FileUpload } from '../components/FileUpload';
import { ingestApi } from '../services/api';
import * as XLSX from 'xlsx';
import { 
  Database, 
  Upload, 
  Calendar, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Eye,
  BarChart3,
  Settings,
  ArrowRight,
  RefreshCw,
  X
} from 'lucide-react';

export function AdminImportPage() {
  const [anchorMonth, setAnchorMonth] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showImportSettings, setShowImportSettings] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [importSettings, setImportSettings] = useState({
    autoValidate: true,
    skipDuplicates: true,
    updateExisting: true,
    emailNotification: true,
    batchSize: 1000
  });

  async function handleFile(file: File) {
    setMessage(null);
    setSelectedFile(file);
    setUploadStatus('idle');
    
    try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    setPreview(json.slice(0, 20));
    } catch (error) {
      setMessage('Error reading file. Please ensure it\'s a valid Excel file.');
      setUploadStatus('error');
    }
  }

  async function upload(file: File) {
    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      const res = await ingestApi.upload(file, anchorMonth || new Date().toISOString().slice(0,7));
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setMessage(`Successfully uploaded! Run ID: ${res.runId}`);
      setUploadStatus('success');
    } catch (e: any) {
      setMessage(e.message || 'Upload failed');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  }

  const handleUpload = async () => {
    if (selectedFile) {
      await upload(selectedFile);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreview([]);
    setMessage(null);
    setUploadStatus('idle');
    setUploadProgress(0);
  };

  const handleImportSettings = () => {
    setShowImportSettings(true);
  };

  const handleViewReports = () => {
    setShowReports(true);
  };

  const handleSettingsChange = (key: string, value: any) => {
    setImportSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveImportSettings = () => {
    // Save settings to localStorage
    localStorage.setItem('importSettings', JSON.stringify(importSettings));
    setShowImportSettings(false);
    setMessage('Import settings saved successfully!');
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900 py-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-40 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl mb-6 shadow-2xl">
            <Database className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">Admin Import</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Seed Masters Data Management & Import System - Professional Data Processing</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Import Configuration */}
    <div className="space-y-6">
            {/* Main Import Card */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 animate-fade-in-up hover:shadow-3xl transition-all duration-300 h-fit">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Upload className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Import Configuration</h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400">Upload and configure your seed masters data with advanced processing</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Anchor Month Selection */}
                <div className="group">
                  <label className="block text-lg font-bold text-gray-700 dark:text-gray-300 mb-4">Anchor Month Selection</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Calendar className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input 
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md" 
                      type="month" 
                      value={anchorMonth} 
                      onChange={e => setAnchorMonth(e.target.value)}
                      placeholder="Select anchor month"
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">The reference month for your data import and processing</p>
                </div>

                {/* File Upload Section */}
                <div className="group">
                  <label className="block text-lg font-bold text-gray-700 dark:text-gray-300 mb-4">Excel File Upload</label>
                  <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                    selectedFile 
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                  }`}>
                    <div className="relative">
                      <FileSpreadsheet className={`w-16 h-16 mx-auto mb-4 transition-all duration-300 ${
                        selectedFile 
                          ? 'text-emerald-500' 
                          : 'text-gray-400 group-hover:text-blue-500'
                      }`} />
                      {selectedFile && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <p className={`text-lg font-medium transition-colors ${
                        selectedFile 
                          ? 'text-emerald-700 dark:text-emerald-300' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {selectedFile ? selectedFile.name : 'Choose an Excel file or drag and drop'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        Supports .xlsx, .xls files up to 10MB • Advanced data validation included
                      </p>
                    </div>
                    <div className="mt-6">
                      <FileUpload 
                        label="Choose Excel File" 
                        onFile={handleFile}
                        className="bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 hover:from-blue-600 hover:via-cyan-600 hover:to-indigo-600 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <RefreshCw className="w-4 h-4 text-white animate-spin" />
                        </div>
                        <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">Processing Upload...</span>
                      </div>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 h-3 rounded-full transition-all duration-500 shadow-lg"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Validating data and preparing for import...</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6">
                  {selectedFile && !isUploading && (
                    <button 
                      onClick={handleUpload}
                      className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                    >
                      <Upload className="w-5 h-5" />
                      Upload Data
                    </button>
                  )}
                  
                  {selectedFile && (
                    <button 
                      onClick={resetForm}
                      className="flex items-center gap-3 px-6 py-4 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      <X className="w-5 h-5" />
                      Reset Form
                    </button>
                  )}
                </div>

                {/* Status Message */}
                {message && (
                  <div className={`p-6 rounded-2xl border-2 shadow-lg ${
                    uploadStatus === 'success' 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-700' 
                      : uploadStatus === 'error'
                      ? 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-300 dark:border-red-700'
                      : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-300 dark:border-blue-700'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        uploadStatus === 'success' 
                          ? 'bg-green-500' 
                          : uploadStatus === 'error'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}>
                        {uploadStatus === 'success' ? (
                          <CheckCircle className="w-6 h-6 text-white" />
                        ) : uploadStatus === 'error' ? (
                          <AlertCircle className="w-6 h-6 text-white" />
                        ) : (
                          <RefreshCw className="w-6 h-6 text-white animate-spin" />
                        )}
                      </div>
          <div>
                        <p className={`text-lg font-bold ${
                          uploadStatus === 'success' 
                            ? 'text-green-700 dark:text-green-300' 
                            : uploadStatus === 'error'
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-blue-700 dark:text-blue-300'
                        }`}>
                          {uploadStatus === 'success' ? 'Upload Successful!' : uploadStatus === 'error' ? 'Upload Failed' : 'Processing...'}
                        </p>
                        <p className={`text-sm ${
                          uploadStatus === 'success' 
                            ? 'text-green-600 dark:text-green-400' 
                            : uploadStatus === 'error'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
          </div>
        </div>

            {/* Data Preview */}
      {preview.length > 0 && (
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 animate-fade-in-up hover:shadow-3xl transition-all duration-300" style={{animationDelay: '0.1s'}}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Eye className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Data Preview</h3>
                      <p className="text-lg text-gray-600 dark:text-gray-400">First 20 rows of your uploaded data with advanced formatting</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{preview.length} rows</span>
                  </div>
                </div>

                <div className="overflow-auto rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-inner">
                  <div className="min-w-[800px]">
            <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                        <tr>
                          {Object.keys(preview[0]).map((h, index) => (
                            <th key={h} className="px-6 py-4 text-left font-bold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                                <span className="text-base">{h}</span>
                              </div>
                            </th>
                  ))}
                </tr>
              </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {preview.map((r, i) => (
                          <tr key={i} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/10 dark:hover:to-indigo-900/10 transition-all duration-300">
                    {Object.keys(preview[0]).map(h => (
                              <td key={h} className="px-6 py-4 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                                <div className="max-w-xs truncate font-medium" title={String(r[h] ?? '')}>
                                  {String(r[h] ?? '')}
                                </div>
                              </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-6 animate-fade-in-up hover:shadow-3xl transition-all duration-300" style={{animationDelay: '0.4s'}}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/templates/dim-service-template.xlsx';
                    link.download = 'dim-service-template.xlsx';
                    link.click();
                  }}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-900/20 dark:hover:to-cyan-900/20 rounded-2xl transition-all duration-300 group"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold">Download Template</span>
                </button>
                <button 
                  onClick={handleImportSettings}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 rounded-2xl transition-all duration-300 group"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold">Import Settings</span>
                </button>
                <button 
                  onClick={handleViewReports}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 rounded-2xl transition-all duration-300 group"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold">View Reports</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-6 animate-fade-in-up hover:shadow-3xl transition-all duration-300" style={{animationDelay: '0.2s'}}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                Import Statistics
              </h3>
              <div className="space-y-5">
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <FileSpreadsheet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Files Processed</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">This session</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedFile ? '1' : '0'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-800/50 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Data Rows</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Preview shown</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {preview.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-6 animate-fade-in-up hover:shadow-3xl transition-all duration-300" style={{animationDelay: '0.3s'}}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                Import Guidelines
              </h3>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <span className="text-xs font-bold text-white">1</span>
                  </div>
                  <p className="font-medium">Use the same Excel layout as previous imports</p>
                </div>
                <div className="flex items-start gap-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <span className="text-xs font-bold text-white">2</span>
                  </div>
                  <p className="font-medium">Dimensions will be upserted server-side</p>
                </div>
                <div className="flex items-start gap-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl">
                  <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <span className="text-xs font-bold text-white">3</span>
                  </div>
                  <p className="font-medium">Ensure data quality before upload</p>
                </div>
                <div className="flex items-start gap-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <span className="text-xs font-bold text-white">4</span>
                  </div>
                  <p className="font-medium">Maximum file size: 10MB</p>
                </div>
              </div>

              {/* Additional Guidelines Section */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <ArrowRight className="w-3 h-3 text-white" />
                  </div>
                  Best Practices
                </h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="font-medium">Validate data format before uploading</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="font-medium">Check for missing or duplicate entries</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="font-medium">Use consistent date formats (YYYY-MM-DD)</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="font-medium">Backup your data before importing</p>
                  </div>
                </div>
              </div>

              {/* System Requirements */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Database className="w-3 h-3 text-white" />
                  </div>
                  System Requirements
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl">
                    <p className="font-bold text-cyan-700 dark:text-cyan-300 text-xs">File Format</p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">.xlsx, .xls</p>
                  </div>
                  <div className="p-2 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl">
                    <p className="font-bold text-emerald-700 dark:text-emerald-300 text-xs">Max Size</p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">10 MB</p>
                  </div>
                  <div className="p-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                    <p className="font-bold text-purple-700 dark:text-purple-300 text-xs">Max Rows</p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">50,000</p>
                  </div>
                  <div className="p-2 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl">
                    <p className="font-bold text-orange-700 dark:text-orange-300 text-xs">Encoding</p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">UTF-8</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Import Settings Modal */}
      {showImportSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                Import Settings
              </h3>
              <button
                onClick={() => setShowImportSettings(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto Validate Data</span>
                  <input
                    type="checkbox"
                    checked={importSettings.autoValidate}
                    onChange={(e) => handleSettingsChange('autoValidate', e.target.checked)}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Skip Duplicates</span>
                  <input
                    type="checkbox"
                    checked={importSettings.skipDuplicates}
                    onChange={(e) => handleSettingsChange('skipDuplicates', e.target.checked)}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Update Existing Records</span>
                  <input
                    type="checkbox"
                    checked={importSettings.updateExisting}
                    onChange={(e) => handleSettingsChange('updateExisting', e.target.checked)}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Notification</span>
                  <input
                    type="checkbox"
                    checked={importSettings.emailNotification}
                    onChange={(e) => handleSettingsChange('emailNotification', e.target.checked)}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    value={importSettings.batchSize}
                    onChange={(e) => handleSettingsChange('batchSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="100"
                    max="10000"
                    step="100"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveImportSettings}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Save Settings
                </button>
                <button
                  onClick={() => setShowImportSettings(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-xl transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Reports Modal */}
      {showReports && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/30 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                Import Reports
              </h3>
              <button
                onClick={() => setShowReports(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">0</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Total Imports</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-200 dark:border-green-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">0</p>
                      <p className="text-sm text-green-600 dark:text-green-400">Successful</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-6 rounded-2xl border border-red-200 dark:border-red-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300">0</p>
                      <p className="text-sm text-red-600 dark:text-red-400">Failed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Imports Table */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Imports</h4>
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No import history available</p>
                  <p className="text-sm">Import data to see reports here</p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowReports(false)}
                  className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-xl transition-all duration-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


