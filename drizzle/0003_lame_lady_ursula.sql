CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `cached_daily_invalidated_idx` ON `cached_daily_project_sums` (`invalidated_at`);--> statement-breakpoint
CREATE INDEX `cached_weekly_invalidated_idx` ON `cached_weekly_sums` (`invalidated_at`);