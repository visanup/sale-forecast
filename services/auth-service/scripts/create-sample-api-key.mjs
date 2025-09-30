#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function createSampleApiKey() {
  try {
    console.log('Creating sample API client and key...');
    
    // Create a sample API client
    const client = await prisma.api_clients.create({
      data: {
        name: 'Demo Client',
        contact_email: 'demo@example.com'
      }
    });
    
    console.log(`Created API client: ${client.name} (ID: ${client.client_id})`);
    
    // Generate API key
    const apiKey = `sf_${crypto.randomBytes(32).toString('hex')}`;
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Create API key
    const key = await prisma.api_keys.create({
      data: {
        client_id: client.client_id,
        api_key_hash: apiKeyHash,
        scope: 'read:forecast'
      }
    });
    
    console.log(`Created API key: ${key.key_id}`);
    console.log('');
    console.log('🔑 Your API Key:');
    console.log(apiKey);
    console.log('');
    console.log('📋 Usage:');
    console.log('curl -H "x-api-key: ' + apiKey + '" http://localhost:6603/v1/forecast');
    console.log('curl -H "x-api-key: ' + apiKey + '" http://localhost:6602/v1/upload');
    console.log('curl -H "x-api-key: ' + apiKey + '" http://localhost:6604/v1/dim/companies');
    
  } catch (error) {
    console.error('Error creating sample API key:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleApiKey();
