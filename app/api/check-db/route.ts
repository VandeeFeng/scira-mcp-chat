import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Check if tables exist
        const sql = neon(process.env.DATABASE_URL!);

        try {
            // Try to query the chats table
            await sql`SELECT 1 FROM chats LIMIT 1`;
        } catch (error) {
            // If table doesn't exist, create it
            await sql`
                CREATE TABLE IF NOT EXISTS "users" (
                    "id" text PRIMARY KEY NOT NULL,
                    "client_id" text NOT NULL,
                    "created_at" timestamp DEFAULT now() NOT NULL,
                    "updated_at" timestamp DEFAULT now() NOT NULL,
                    CONSTRAINT "users_client_id_unique" UNIQUE("client_id")
                );
            `;

            await sql`
                CREATE TABLE IF NOT EXISTS "chats" (
                    "id" text PRIMARY KEY NOT NULL,
                    "user_id" text NOT NULL,
                    "title" text DEFAULT 'New Chat' NOT NULL,
                    "created_at" timestamp DEFAULT now() NOT NULL,
                    "updated_at" timestamp DEFAULT now() NOT NULL,
                    CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
                );
            `;

            await sql`
                CREATE TABLE IF NOT EXISTS "messages" (
                    "id" text PRIMARY KEY NOT NULL,
                    "chat_id" text NOT NULL,
                    "role" text NOT NULL,
                    "parts" json NOT NULL,
                    "created_at" timestamp DEFAULT now() NOT NULL,
                    CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action
                );
            `;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error checking database:", error);
        return NextResponse.json(
            { error: "Failed to check database" },
            { status: 500 }
        );
    }
} 