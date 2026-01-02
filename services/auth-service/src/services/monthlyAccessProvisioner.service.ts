import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { Role } from '@prisma/client';
import { config } from '../config/config';

type ProvisioningUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  role?: Role;
};

function buildDisplayName(user: ProvisioningUser) {
  const parts = [user.firstName, user.lastName]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);
  if (parts.length > 0) {
    return parts.join(' ');
  }
  const username = typeof user.username === 'string' ? user.username.trim() : '';
  return username || user.email.trim();
}

export class MonthlyAccessProvisioner {
  private readonly endpoint: string;
  private readonly apiKey: string;

  constructor(endpoint = config.dataServiceUrl, apiKey = config.dataServiceApiKey) {
    this.endpoint = (endpoint || '').trim();
    this.apiKey = (apiKey || '').trim();
  }

  async seedDefaultAccessForUser(user: ProvisioningUser): Promise<void> {
    if (!this.isEnabled()) return;
    if (!user?.email) return;
    if (user.role && user.role !== Role.USER) return;

    const payload = {
      users: [
        {
          user_email: user.email.trim().toLowerCase(),
          user_id: user.id,
          user_name: buildDisplayName(user)
        }
      ]
    };

    await this.postJson('/v1/monthly-access/seed-default', payload);
  }

  private isEnabled() {
    return Boolean(this.endpoint && this.apiKey);
  }

  private postJson(path: string, body: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(path, this.endpoint);
        const serialized = JSON.stringify(body ?? {});
        const isHttps = url.protocol === 'https:';
        const transport = isHttps ? https : http;
        const requestOptions: http.RequestOptions = {
          method: 'POST',
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(serialized),
            'X-API-Key': this.apiKey
          }
        };

        const req = transport.request(requestOptions, (res) => {
          res.resume(); // drain response to free up sockets
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            res.on('end', () => resolve());
          } else {
            const status = res.statusCode || 0;
            res.on('end', () => reject(new Error(`Unexpected status ${status}`)));
          }
        });

        req.setTimeout(10000, () => {
          req.destroy(new Error('Request timed out'));
        });

        req.on('error', (err) => reject(err));
        req.write(serialized);
        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
