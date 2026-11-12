ALTER TABLE "tga_events" ADD COLUMN "budget_cents" integer;--> statement-breakpoint
ALTER TABLE "tga_participants" ADD COLUMN "gift_bought" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tga_participants" ADD COLUMN "gift_ideas" text;
