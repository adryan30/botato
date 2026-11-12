CREATE TABLE "tga_events" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"name" text NOT NULL,
	"organizer_id" text NOT NULL,
	"status" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tga_participants" (
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"steam_id64" text NOT NULL,
	"wishlist_url" text NOT NULL,
	"target_user_id" text,
	"dm_delivered" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	CONSTRAINT "tga_participants_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "tga_participants" ADD CONSTRAINT "tga_participants_event_id_tga_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."tga_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tga_events_one_open_per_guild" ON "tga_events" USING btree ("guild_id") WHERE "tga_events"."status" = 'open';