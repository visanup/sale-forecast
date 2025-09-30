import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, setTokens } from '../services/api';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const navigate = useNavigate();

  async function onSubmit(values: FormValues) {
    try {
      const res = await authApi.login({ username: values.email, password: values.password });
      const data: any = (res as any).data || res;
      if (data?.accessToken) setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      navigate('/');
    } catch (e: any) {
      setError('root', { message: e.message || 'Login failed' });
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-6 space-y-4">
        <h1 className="text-2xl font-bold">Login</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input className="input" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input className="input" type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
          </div>
          <button className="btn-primary w-full" disabled={isSubmitting}>
            Sign in
          </button>
          {/* @ts-ignore */}
          {errors.root && <p className="text-sm text-red-600 mt-1">{String((errors as any).root?.message)}</p>}
        </form>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">No account? <Link to="/signup" className="text-brand-600">Create one</Link></p>
      </div>
    </div>
  );
}


