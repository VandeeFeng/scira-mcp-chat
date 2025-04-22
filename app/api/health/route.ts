import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
    try {
        const sql = neon(process.env.DATABASE_URL!);
        
        // Test database connection
        await sql`SELECT 1`;
        
        // Test table existence
        await sql`SELECT 1 FROM chats LIMIT 1`;
        await sql`SELECT 1 FROM messages LIMIT 1`;
        
        return NextResponse.json({ 
            status: 'healthy',
            database: 'connected',
            tables: 'exist'
        });
    } catch (error) {
        console.error('Health check failed:', error);
        return NextResponse.json(
            { 
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 