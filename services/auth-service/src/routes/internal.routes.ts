import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiKeyService } from '../services/apiKey.service';
import { AuditService } from '../services/audit.service';

const router = Router();
const prisma = new PrismaClient();
const auditService = new AuditService(prisma);
const apiKeyService = new ApiKeyService(prisma, auditService);

// Internal API key validation endpoint for inter-service calls
router.post('/validate', async (req, res) => {
  const internalSecretHeader = req.header('X-Internal-Secret') || '';
  const expectedSecret = process.env['INTERNAL_SHARED_SECRET'] || '';
  if (!expectedSecret || internalSecretHeader !== expectedSecret) {
    return res.status(401).json({ valid: false, error: { code: 'UNAUTHORIZED' } });
  }

  const apiKey = (req.body && req.body.apiKey) || '';
  if (!apiKey) {
    return res.status(400).json({ valid: false, error: { code: 'BAD_REQUEST' } });
  }

  try {
    const validation = await apiKeyService.validateApiKey(apiKey);
    
    if (!validation.valid) {
      return res.json({ valid: false, error: { code: 'INVALID_API_KEY' } });
    }

    return res.json({ 
      valid: true, 
      clientId: validation.clientId,
      scope: validation.scope ? [validation.scope] : ['read']
    });
  } catch (error) {
    console.error('Error validating API key:', error);
    return res.status(500).json({ 
      valid: false, 
      error: { code: 'INTERNAL_ERROR' } 
    });
  }
});

export { router as internalRoutes };


