CREATE TABLE `historique_veille` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`veille_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`contenu` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`veille_id`) REFERENCES `veille`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `veille` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`titre` text NOT NULL,
	`sujet` text NOT NULL,
	`contexte` text,
	`resultat` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
