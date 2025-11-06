import { Link } from 'react-router-dom';
import { Mail, ShieldCheck, ArrowLeft, Sparkles } from 'lucide-react';

export function ForgotPasswordPage() {
  const supportEmail = 'agrodatateam@betagro.com';
  const subject = encodeURIComponent('Password Reset Request - Betagro DDI Portal');
  const body = encodeURIComponent(
    [
      'Dear Data Intelligence (DDI) Team,',
      '',
      'I would like to request a password reset for my account.',
      '',
      'Details:',
      '- Full name:',
      '- Company email:',
      '- Phone (optional):',
      '',
      'Thank you.',
    ].join('\n')
  );

  const mailto = `mailto:${supportEmail}?subject=${subject}&body=${body}`;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-indigo-900 dark:to-blue-900">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366F1' fill-opacity='0.12'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-24 left-24 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-24 w-80 h-80 bg-cyan-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute -bottom-8 left-48 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-20">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8 animate-fade-in-down">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-2xl mb-4 shadow-lg">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Reset Password Assistance
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              For security and compliance, password resets are handled by the Data Intelligence (DDI) team.
            </p>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-8 animate-fade-in-up">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  Professional Support Channel
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Please contact the DDI team via Outlook using your Betagro email. Include your full name and company email in the request for a smooth verification process.
                </p>
                <div className="rounded-xl border border-indigo-200/50 dark:border-indigo-800/40 bg-indigo-50/50 dark:bg-indigo-900/20 p-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">DDI Support Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">{supportEmail}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-1">
                <a
                  href={mailto}
                  className="block w-full text-center bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Contact DDI via Outlook
                </a>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                  Opens your Outlook client with a pre-filled email.
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Need help? Include any relevant details for faster support.
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

