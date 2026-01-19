CREATE TABLE `cached_daily_project_sums` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`project_id` text NOT NULL,
	`project_name` text NOT NULL,
	`client_id` text NOT NULL,
	`seconds` integer NOT NULL,
	`calculated_at` integer NOT NULL,
	`invalidated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cached_daily_user_date_idx` ON `cached_daily_project_sums` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `cached_daily_user_project_idx` ON `cached_daily_project_sums` (`user_id`,`project_id`,`date`);--> statement-breakpoint
CREATE TABLE `cached_weekly_sums` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`week_start` text NOT NULL,
	`week_end` text NOT NULL,
	`client_id` text NOT NULL,
	`total_seconds` integer NOT NULL,
	`regular_hours_baseline` real NOT NULL,
	`overtime_seconds` integer NOT NULL,
	`cumulative_overtime_seconds` integer,
	`config_snapshot_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`committed_at` integer,
	`calculated_at` integer NOT NULL,
	`invalidated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cached_weekly_user_week_idx` ON `cached_weekly_sums` (`user_id`,`week_start`);--> statement-breakpoint
CREATE INDEX `cached_weekly_status_idx` ON `cached_weekly_sums` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `weekly_discrepancies` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`week_start` text NOT NULL,
	`original_total_seconds` integer NOT NULL,
	`new_total_seconds` integer NOT NULL,
	`difference_seconds` integer NOT NULL,
	`detected_at` integer NOT NULL,
	`resolved_at` integer,
	`resolution` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `discrepancy_user_week_idx` ON `weekly_discrepancies` (`user_id`,`week_start`);--> statement-breakpoint
CREATE INDEX `discrepancy_unresolved_idx` ON `weekly_discrepancies` (`user_id`,`resolved_at`);