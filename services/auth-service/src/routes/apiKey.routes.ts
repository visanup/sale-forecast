import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiKeyService } from '../services/apiKey.service';
import { AuditService } from '../services/audit.service';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body, param } from 'express-validator';
import { Request, Response } from 'express';

const router = Router();
const prisma = new PrismaClient();
const auditService = new AuditService(prisma);
const apiKeyService = new ApiKeyService(prisma, auditService);

// Middleware to require authentication for all API key routes
router.use(requireAuth);

/**
 * Create a new API client
 * POST /api/v1/api-keys/clients
 */
router.post('/clients', 
  [
    body('name').isString().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be 1-100 characters'),
    body('contactEmail').optional().isEmail().withMessage('Contact email must be valid')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { name, contactEmail } = req.body;
      
      const client = await apiKeyService.createApiClient({
        name,
        contactEmail
      });

      return res.status(201).json({
        success: true,
        data: client,
        message: 'API client created successfully'
      });
    } catch (error) {
      console.error('Error creating API client:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create API client'
        }
      });
    }
  }
);

/**
 * List all API clients
 * GET /api/v1/api-keys/clients
 */
router.get('/clients', async (_req: Request, res: Response) => {
  try {
    const clients = await apiKeyService.listApiClients();
    
    return res.json({
      success: true,
      data: clients
    });
  } catch (error) {
    console.error('Error listing API clients:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list API clients'
      }
    });
  }
});

/**
 * Get API client by ID
 * GET /api/v1/api-keys/clients/:clientId
 */
router.get('/clients/:clientId',
  [
    param('clientId').isNumeric().withMessage('Client ID must be numeric')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const clientId = BigInt(req.params['clientId']!);
      const client = await apiKeyService.getApiClient(clientId);
      
      if (!client) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'API client not found'
          }
        });
      }
      
      return res.json({
        success: true,
        data: client
      });
    } catch (error) {
      console.error('Error getting API client:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get API client'
        }
      });
    }
  }
);

/**
 * Create a new API key for a client
 * POST /api/v1/api-keys/clients/:clientId/keys
 */
router.post('/clients/:clientId/keys',
  [
    param('clientId').isNumeric().withMessage('Client ID must be numeric'),
    body('scope').optional().isString().withMessage('Scope must be a string')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const clientId = BigInt(req.params['clientId']!);
      const { scope } = req.body;
      
      // Check if client exists
      const client = await apiKeyService.getApiClient(clientId);
      if (!client) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'API client not found'
          }
        });
      }

      if (!client.isActive) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CLIENT_INACTIVE',
            message: 'Cannot create API key for inactive client'
          }
        });
      }
      
      const apiKey = await apiKeyService.createApiKey({
        clientId,
        scope
      });

      return res.status(201).json({
        success: true,
        data: apiKey,
        message: 'API key created successfully'
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create API key'
        }
      });
    }
  }
);

/**
 * Revoke an API key
 * DELETE /api/v1/api-keys/keys/:keyId
 */
router.delete('/keys/:keyId',
  [
    param('keyId').isNumeric().withMessage('Key ID must be numeric')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const keyId = BigInt(req.params['keyId']!);
      
      await apiKeyService.revokeApiKey(keyId);
      
      return res.json({
        success: true,
        message: 'API key revoked successfully'
      });
    } catch (error) {
      console.error('Error revoking API key:', error);
      if (error instanceof Error && error.message === 'API key not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'API key not found'
          }
        });
      }
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to revoke API key'
        }
      });
    }
  }
);

/**
 * Deactivate an API client
 * DELETE /api/v1/api-keys/clients/:clientId
 */
router.delete('/clients/:clientId',
  [
    param('clientId').isNumeric().withMessage('Client ID must be numeric')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const clientId = BigInt(req.params['clientId']!);
      
      await apiKeyService.deactivateApiClient(clientId);
      
      return res.json({
        success: true,
        message: 'API client deactivated successfully'
      });
    } catch (error) {
      console.error('Error deactivating API client:', error);
      if (error instanceof Error && error.message === 'API client not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'API client not found'
          }
        });
      }
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to deactivate API client'
        }
      });
    }
  }
);

export { router as apiKeyRoutes };
