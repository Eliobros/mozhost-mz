// app/api/domains/route.js
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import dns from 'dns/promises';

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const SERVER_IP = process.env.SERVER_IP || '45.76.123.45';

// GET - Listar domínios
export async function GET(request) {
  try {
    const [domains] = await db.query(
      'SELECT * FROM custom_domains ORDER BY created_at DESC'
    );
    
    return NextResponse.json(domains);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar domínios' },
      { status: 500 }
    );
  }
}

// POST - Adicionar domínio
export async function POST(request) {
  try {
    const { containerId, domain } = await request.json();
    
    // Validar domínio
    const domainRegex = /^[a-z0-9\-\.]+\.[a-z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Domínio inválido' },
        { status: 400 }
      );
    }
    
    // Verificar se já existe
    const [existing] = await db.query(
      'SELECT * FROM custom_domains WHERE domain = ?',
      [domain]
    );
    
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Domínio já cadastrado' },
        { status: 400 }
      );
    }
    
    // Inserir no banco
    await db.query(
      'INSERT INTO custom_domains (container_id, domain, status, server_ip) VALUES (?, ?, ?, ?)',
      [containerId, domain, 'pending', SERVER_IP]
    );
    
    // Iniciar monitoramento DNS (você implementa isso depois)
    // startDNSMonitoring(domain, containerId);
    
    return NextResponse.json({
      success: true,
      domain,
      instructions: {
        ip: SERVER_IP
      }
    });
    
  } catch (error) {
    console.error('Erro ao adicionar domínio:', error);
    return NextResponse.json(
      { error: 'Erro ao adicionar domínio' },
      { status: 500 }
    );
  }
}
