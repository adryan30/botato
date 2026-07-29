CREATE TABLE "afk_marks" (
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"prefix" text NOT NULL,
	"previous_nickname" text,
	CONSTRAINT "afk_marks_guild_id_user_id_pk" PRIMARY KEY("guild_id","user_id")
);
