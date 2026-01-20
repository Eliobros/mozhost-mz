// app/api/domains/[id]/route.js
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// DELETE - Remover domínio
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    await db.query('DELETE FROM custom_domains WHERE id = ?', [id]);
    
    // Aqui você também removeria a config do Nginx
    // removeNginxConfig(domain);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao remover domínio' },
      { status: 500 }
    );
  }
}
