import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { AuditService } from './audit.service';

export interface CreateApiClientData {
  name: string;
  contactEmail?: string;
}

export interface CreateApiKeyData {
  clientId: bigint;
  scope?: string;
}

export interface ApiKeyResponse {
  keyId: string;
  apiKey: string;
  scope: string;
  createdAt: Date;
}

export interface ApiClientResponse {
  clientId: string;
  name: string;
  contactEmail?: string;
  isActive: boolean;
  createdAt: Date;
  keyCount: number;
}

export class ApiKeyService {
  constructor(
    private prisma: PrismaClient,
    private auditService: AuditService
  ) {}

  /**
   * Create a new API client
   */
  async createApiClient(data: CreateApiClientData): Promise<ApiClientResponse> {
    const client = await this.prisma.api_clients.create({
      data: {
        name: data.name,
        ...(data.contactEmail && { contact_email: data.contactEmail })
      }
    });

    await this.auditService.log({
      action: 'API_CLIENT_CREATED',
      resource: 'ApiClient',
      resourceId: client.client_id.toString(),
      details: { name: data.name, contactEmail: data.contactEmail }
    });

    return {
      clientId: client.client_id.toString(),
      name: client.name,
      ...(client.contact_email && { contactEmail: client.contact_email }),
      isActive: client.is_active,
      createdAt: client.created_at,
      keyCount: 0
    };
  }

  /**
   * Create a new API key for a client
   */
  async createApiKey(data: CreateApiKeyData): Promise<ApiKeyResponse> {
    // Generate a secure API key
    const apiKey = this.generateApiKey();
    const apiKeyHash = this.hashApiKey(apiKey);

    const key = await this.prisma.api_keys.create({
      data: {
        client_id: data.clientId,
        api_key_hash: apiKeyHash,
        scope: data.scope || 'read:forecast'
      },
      include: {
        client: true
      }
    });

    await this.auditService.log({
      action: 'API_KEY_CREATED',
      resource: 'ApiKey',
      resourceId: key.key_id.toString(),
      details: { 
        clientId: data.clientId.toString(),
        clientName: key.client.name,
        scope: key.scope
      }
    });

    return {
      keyId: key.key_id.toString(),
      apiKey,
      scope: key.scope || 'read:forecast',
      createdAt: key.created_at
    };
  }

  /**
   * Validate an API key
   */
  async validateApiKey(apiKey: string): Promise<{ valid: boolean; clientId?: string; scope?: string }> {
    if (!apiKey) {
      return { valid: false };
    }

    const apiKeyHash = this.hashApiKey(apiKey);
    
    const key = await this.prisma.api_keys.findFirst({
      where: {
        api_key_hash: apiKeyHash,
        revoked_at: null
      },
      include: {
        client: true
      }
    });

    if (!key || !key.client.is_active) {
      return { valid: false };
    }

    return {
      valid: true,
      clientId: key.client.client_id.toString(),
      scope: key.scope || 'read:forecast'
    };
  }

  /**
   * List all API clients
   */
  async listApiClients(): Promise<ApiClientResponse[]> {
    const clients = await this.prisma.api_clients.findMany({
      include: {
        _count: {
          select: {
            keys: {
              where: {
                revoked_at: null
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return clients.map(client => ({
      clientId: client.client_id.toString(),
      name: client.name,
      ...(client.contact_email && { contactEmail: client.contact_email }),
      isActive: client.is_active,
      createdAt: client.created_at,
      keyCount: client._count.keys
    }));
  }

  /**
   * Get API client by ID
   */
  async getApiClient(clientId: bigint): Promise<ApiClientResponse | null> {
    const client = await this.prisma.api_clients.findUnique({
      where: { client_id: clientId },
      include: {
        _count: {
          select: {
            keys: {
              where: {
                revoked_at: null
              }
            }
          }
        }
      }
    });

    if (!client) {
      return null;
    }

    return {
      clientId: client.client_id.toString(),
      name: client.name,
      ...(client.contact_email && { contactEmail: client.contact_email }),
      isActive: client.is_active,
      createdAt: client.created_at,
      keyCount: client._count.keys
    };
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(keyId: bigint): Promise<void> {
    const key = await this.prisma.api_keys.findUnique({
      where: { key_id: keyId },
      include: { client: true }
    });

    if (!key) {
      throw new Error('API key not found');
    }

    await this.prisma.api_keys.update({
      where: { key_id: keyId },
      data: { revoked_at: new Date() }
    });

    await this.auditService.log({
      action: 'API_KEY_REVOKED',
      resource: 'ApiKey',
      resourceId: keyId.toString(),
      details: { 
        clientId: key.client_id.toString(),
        clientName: key.client.name
      }
    });
  }

  /**
   * Deactivate an API client
   */
  async deactivateApiClient(clientId: bigint): Promise<void> {
    const client = await this.prisma.api_clients.findUnique({
      where: { client_id: clientId }
    });

    if (!client) {
      throw new Error('API client not found');
    }

    await this.prisma.api_clients.update({
      where: { client_id: clientId },
      data: { is_active: false }
    });

    await this.auditService.log({
      action: 'API_CLIENT_DEACTIVATED',
      resource: 'ApiClient',
      resourceId: clientId.toString(),
      details: { name: client.name }
    });
  }

  /**
   * Generate a secure API key
   */
  private generateApiKey(): string {
    // Generate a 32-byte random string and encode as hex
    const randomBytes = crypto.randomBytes(32);
    return `sf_${randomBytes.toString('hex')}`;
  }

  /**
   * Hash an API key for storage
   */
  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
}
