CREATE TABLE `config_chronic` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`config_type` text NOT NULL,
	`value` text NOT NULL,
	`valid_from` integer NOT NULL,
	`valid_until` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `config_chronic_temporal_idx` ON `config_chronic` (`user_id`,`config_type`,`valid_from`,`valid_until`);