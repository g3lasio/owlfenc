CREATE TABLE "agent_memory_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pattern_id" varchar(100) NOT NULL,
	"intention_type" varchar(100) NOT NULL,
	"intention_complexity" varchar(50) NOT NULL,
	"execution_plan" jsonb NOT NULL,
	"success" boolean NOT NULL,
	"execution_time" integer NOT NULL,
	"endpoints_used" jsonb NOT NULL,
	"parameters_used" jsonb,
	"user_satisfaction" integer,
	"optimizations" jsonb,
	"confidence" numeric(3, 2),
	"context_data" jsonb,
	"conversation_history" jsonb,
	"active_entities" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_memory_patterns_pattern_id_unique" UNIQUE("pattern_id")
);
--> statement-breakpoint
CREATE TABLE "chat_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"role" varchar(50) NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"address" text,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_information" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company" text,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"phone" text,
	"email" text,
	"website" text,
	"license" text,
	"logo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contextual_memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"context_id" varchar(100) NOT NULL,
	"context_type" varchar(50) NOT NULL,
	"scope" varchar(50) NOT NULL,
	"entities" jsonb NOT NULL,
	"relationships" jsonb,
	"preferences" jsonb,
	"importance" integer DEFAULT 1 NOT NULL,
	"access_count" integer DEFAULT 0 NOT NULL,
	"last_accessed" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"auto_cleanup" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contextual_memory_context_id_unique" UNIQUE("context_id")
);
--> statement-breakpoint
CREATE TABLE "contract_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"event" varchar(50) NOT NULL,
	"party" varchar(20),
	"ip_address" varchar(45),
	"user_agent" text,
	"signature_hash" varchar(64),
	"pdf_hash" varchar(64),
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_name" text NOT NULL,
	"client_address" text,
	"client_phone" text,
	"client_email" text,
	"project_type" text NOT NULL,
	"project_description" text,
	"project_location" text,
	"contractor_name" text,
	"contractor_address" text,
	"contractor_phone" text,
	"contractor_email" text,
	"contractor_license" text,
	"total_amount" text,
	"start_date" timestamp,
	"completion_date" timestamp,
	"html" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL,
	"missing_fields" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digital_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"contract_id" text NOT NULL,
	"contractor_name" varchar(255) NOT NULL,
	"contractor_email" varchar(255) NOT NULL,
	"contractor_phone" varchar(50),
	"contractor_company" varchar(255),
	"client_name" varchar(255) NOT NULL,
	"client_email" varchar(255) NOT NULL,
	"client_phone" varchar(50),
	"client_address" text,
	"project_description" text NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"start_date" timestamp,
	"completion_date" timestamp,
	"contract_html" text NOT NULL,
	"original_pdf_path" text,
	"signed_pdf_path" text,
	"permanent_pdf_url" text,
	"contractor_signed" boolean DEFAULT false NOT NULL,
	"contractor_signed_at" timestamp,
	"contractor_signature_data" text,
	"contractor_signature_type" varchar(20),
	"client_signed" boolean DEFAULT false NOT NULL,
	"client_signed_at" timestamp,
	"client_signature_data" text,
	"client_signature_type" varchar(20),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"email_sent" boolean DEFAULT false NOT NULL,
	"email_sent_at" timestamp,
	"folio" varchar(50),
	"pdf_hash" varchar(64),
	"signing_ip" varchar(45),
	"final_pdf_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "digital_contracts_contract_id_unique" UNIQUE("contract_id")
);
--> statement-breakpoint
CREATE TABLE "estimate_adjustments" (
	"id" text PRIMARY KEY NOT NULL,
	"estimate_id" text NOT NULL,
	"client_name" varchar(255) NOT NULL,
	"client_email" varchar(255) NOT NULL,
	"client_notes" text NOT NULL,
	"requested_changes" text NOT NULL,
	"contractor_email" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"contractor_response" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "estimates" (
	"id" text PRIMARY KEY NOT NULL,
	"estimate_number" varchar(50) NOT NULL,
	"client_name" varchar(255) NOT NULL,
	"client_email" varchar(255) NOT NULL,
	"client_phone" varchar(50),
	"client_address" text,
	"contractor_name" varchar(255) NOT NULL,
	"contractor_email" varchar(255) NOT NULL,
	"contractor_company" varchar(255) NOT NULL,
	"contractor_phone" varchar(50),
	"contractor_address" text,
	"project_type" varchar(255) NOT NULL,
	"project_description" text,
	"project_location" text,
	"scope_of_work" text,
	"items" jsonb NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) NOT NULL,
	"tax_rate" numeric(5, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"status" varchar(50) DEFAULT 'sent' NOT NULL,
	"notes" text,
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	"approver_name" varchar(255),
	"approver_signature" text
);
--> statement-breakpoint
CREATE TABLE "learning_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"total_interactions" integer DEFAULT 0 NOT NULL,
	"successful_predictions" integer DEFAULT 0 NOT NULL,
	"total_predictions" integer DEFAULT 0 NOT NULL,
	"adaptation_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"intention_recognition_accuracy" numeric(5, 2) DEFAULT '0',
	"workflow_optimization_score" numeric(5, 2) DEFAULT '0',
	"prediction_accuracy" numeric(5, 2) DEFAULT '0',
	"learning_phase" varchar(50) DEFAULT 'initial' NOT NULL,
	"last_learning_session" timestamp DEFAULT now() NOT NULL,
	"next_optimization_due" timestamp DEFAULT now() NOT NULL,
	"knowledge_version" integer DEFAULT 1 NOT NULL,
	"learning_velocity" numeric(5, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learning_progress_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(10, 2),
	"unit" varchar(50),
	"category" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"related_id" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "optimization_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"suggestion_id" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"reason" text NOT NULL,
	"estimated_improvement" numeric(5, 2) NOT NULL,
	"confidence" numeric(3, 2) NOT NULL,
	"applicable_intentions" jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"applied_at" timestamp,
	"feedback_score" integer,
	"supporting_data" jsonb,
	"related_patterns" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "optimization_suggestions_suggestion_id_unique" UNIQUE("suggestion_id")
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"code" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"is_registration" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" varchar(10) DEFAULT 'false',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payment_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" varchar(50) NOT NULL,
	"payment_date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permit_search_history" (
	"id" text PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"results" jsonb,
	"user_id" integer NOT NULL,
	"search_date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"description" text,
	"client_email" varchar(255),
	"client_name" varchar(255),
	"invoice_number" varchar(100),
	"stripe_payment_intent_id" varchar(255),
	"stripe_checkout_session_id" varchar(255),
	"checkout_url" text,
	"payment_link_url" text,
	"notes" text,
	"due_date" timestamp,
	"paid_date" timestamp,
	"sent_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"project_type" varchar(100) NOT NULL,
	"description" text,
	"template_data" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" text,
	"client_name" text,
	"client_email" text,
	"client_phone" text,
	"address" text,
	"fence_type" text,
	"length" integer,
	"height" integer,
	"gates" jsonb,
	"additional_details" text,
	"estimate_html" text,
	"contract_html" text,
	"total_price" integer,
	"status" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"project_progress" text,
	"scheduled_date" timestamp,
	"completed_date" timestamp,
	"assigned_to" jsonb,
	"attachments" jsonb,
	"permit_status" text,
	"permit_details" jsonb,
	"client_notes" text,
	"internal_notes" text,
	"payment_status" text,
	"payment_details" jsonb,
	"invoice_generated" boolean DEFAULT false,
	"invoice_number" varchar(50),
	"invoice_html" text,
	"invoice_due_date" timestamp,
	"invoice_status" varchar(50),
	"last_reminder_sent" timestamp,
	"project_type" text,
	"project_subtype" text,
	"project_category" text,
	"project_description" text,
	"project_scope" text,
	"description" text,
	"materials_list" jsonb,
	"labor_hours" integer,
	"difficulty" text,
	"priority" text
);
--> statement-breakpoint
CREATE TABLE "prompt_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_search_history" (
	"id" text PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"results" jsonb,
	"user_id" integer NOT NULL,
	"search_date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"user_id" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "short_urls" (
	"id" serial PRIMARY KEY NOT NULL,
	"short_code" varchar(20) NOT NULL,
	"original_url" text NOT NULL,
	"firebase_uid" text NOT NULL,
	"resource_type" varchar(50),
	"resource_id" text,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "short_urls_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "sign_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"party" varchar(20) NOT NULL,
	"scope" varchar(20) NOT NULL,
	"token" varchar(128) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp,
	"bound_to" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sign_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "smart_material_lists" (
	"id" text PRIMARY KEY NOT NULL,
	"project_type" varchar(100) NOT NULL,
	"project_description" text NOT NULL,
	"region" varchar(100) NOT NULL,
	"materials_list" jsonb NOT NULL,
	"labor_costs" jsonb,
	"additional_costs" jsonb,
	"total_materials_cost" numeric(10, 2),
	"total_labor_cost" numeric(10, 2),
	"total_additional_cost" numeric(10, 2),
	"grand_total" numeric(10, 2),
	"confidence" numeric(3, 2),
	"usage_count" integer DEFAULT 1 NOT NULL,
	"last_used" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"price" integer NOT NULL,
	"yearly_price" integer,
	"description" text,
	"features" jsonb NOT NULL,
	"motto" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"feature" text NOT NULL,
	"action" text NOT NULL,
	"details" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_behavior_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"common_intentions" jsonb NOT NULL,
	"preferred_workflows" jsonb NOT NULL,
	"time_patterns" jsonb NOT NULL,
	"total_tasks" integer DEFAULT 0 NOT NULL,
	"successful_tasks" integer DEFAULT 0 NOT NULL,
	"average_execution_time" integer DEFAULT 0 NOT NULL,
	"working_hours" jsonb,
	"preferred_complexity" varchar(50),
	"most_used_endpoints" jsonb,
	"last_analysis_date" timestamp DEFAULT now() NOT NULL,
	"adaptation_level" varchar(50) DEFAULT 'basic',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_behavior_analytics_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"billing_cycle" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_usage_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"month" text NOT NULL,
	"plan_id" integer NOT NULL,
	"basic_estimates_limit" integer DEFAULT 0,
	"ai_estimates_limit" integer DEFAULT 0,
	"contracts_limit" integer DEFAULT 0,
	"property_verifications_limit" integer DEFAULT 0,
	"permit_advisor_limit" integer DEFAULT 0,
	"projects_limit" integer DEFAULT 0,
	"basic_estimates_used" integer DEFAULT 0,
	"ai_estimates_used" integer DEFAULT 0,
	"contracts_used" integer DEFAULT 0,
	"property_verifications_used" integer DEFAULT 0,
	"permit_advisor_used" integer DEFAULT 0,
	"projects_used" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" varchar(255),
	"username" text NOT NULL,
	"password" text NOT NULL,
	"company" text,
	"owner_name" text,
	"role" text,
	"email" text NOT NULL,
	"phone" text,
	"mobile_phone" text,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"license" text,
	"insurance_policy" text,
	"ein" text,
	"business_type" text,
	"year_established" text,
	"website" text,
	"description" text,
	"specialties" jsonb,
	"social_media" jsonb,
	"documents" jsonb,
	"logo" text,
	"has_used_trial" boolean DEFAULT false NOT NULL,
	"trial_start_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"stripe_connect_account_id" text,
	"default_payment_terms" integer DEFAULT 30,
	"invoice_message_template" text,
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webauthn_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"device_type" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used" timestamp,
	"name" varchar(255),
	"transports" jsonb,
	CONSTRAINT "webauthn_credentials_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "user_monthly_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"month" varchar(7) NOT NULL,
	"basic_estimates" integer DEFAULT 0 NOT NULL,
	"ai_estimates" integer DEFAULT 0 NOT NULL,
	"contracts" integer DEFAULT 0 NOT NULL,
	"property_verifications" integer DEFAULT 0 NOT NULL,
	"permit_advisor" integer DEFAULT 0 NOT NULL,
	"projects" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_trials" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_trials_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "contract_audit_log" ADD CONSTRAINT "contract_audit_log_contract_id_digital_contracts_contract_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."digital_contracts"("contract_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_adjustments" ADD CONSTRAINT "estimate_adjustments_estimate_id_estimates_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_firebase_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("firebase_uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_tokens" ADD CONSTRAINT "sign_tokens_contract_id_digital_contracts_contract_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."digital_contracts"("contract_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memory_patterns_user_id_idx" ON "agent_memory_patterns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memory_patterns_intention_type_idx" ON "agent_memory_patterns" USING btree ("intention_type");--> statement-breakpoint
CREATE INDEX "memory_patterns_success_idx" ON "agent_memory_patterns" USING btree ("success");--> statement-breakpoint
CREATE INDEX "memory_patterns_created_at_idx" ON "agent_memory_patterns" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contextual_memory_user_id_idx" ON "contextual_memory" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contextual_memory_context_type_idx" ON "contextual_memory" USING btree ("context_type");--> statement-breakpoint
CREATE INDEX "contextual_memory_importance_idx" ON "contextual_memory" USING btree ("importance");--> statement-breakpoint
CREATE INDEX "contextual_memory_expires_at_idx" ON "contextual_memory" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "audit_contract_id_idx" ON "contract_audit_log" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "audit_event_idx" ON "contract_audit_log" USING btree ("event");--> statement-breakpoint
CREATE INDEX "audit_timestamp_idx" ON "contract_audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "digital_contracts_contract_id_idx" ON "digital_contracts" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "digital_contracts_user_id_idx" ON "digital_contracts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "digital_contracts_status_idx" ON "digital_contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "learning_progress_user_id_idx" ON "learning_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "learning_progress_learning_phase_idx" ON "learning_progress" USING btree ("learning_phase");--> statement-breakpoint
CREATE INDEX "learning_progress_last_session_idx" ON "learning_progress" USING btree ("last_learning_session");--> statement-breakpoint
CREATE INDEX "optimization_suggestions_user_id_idx" ON "optimization_suggestions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "optimization_suggestions_status_idx" ON "optimization_suggestions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "optimization_suggestions_confidence_idx" ON "optimization_suggestions" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "optimization_suggestions_created_at_idx" ON "optimization_suggestions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_idx" ON "otp_codes" USING btree ("email");--> statement-breakpoint
CREATE INDEX "code_idx" ON "otp_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "short_code_idx" ON "short_urls" USING btree ("short_code");--> statement-breakpoint
CREATE INDEX "short_urls_firebase_uid_idx" ON "short_urls" USING btree ("firebase_uid");--> statement-breakpoint
CREATE INDEX "sign_tokens_contract_id_idx" ON "sign_tokens" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "sign_tokens_token_idx" ON "sign_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sign_tokens_expires_at_idx" ON "sign_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_feature_idx" ON "usage_audit_log" USING btree ("user_id","feature");--> statement-breakpoint
CREATE INDEX "timestamp_idx" ON "usage_audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "behavior_analytics_user_id_idx" ON "user_behavior_analytics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "behavior_analytics_last_analysis_idx" ON "user_behavior_analytics" USING btree ("last_analysis_date");--> statement-breakpoint
CREATE INDEX "user_month_idx" ON "user_usage_limits" USING btree ("user_id","month");--> statement-breakpoint
CREATE INDEX "webauthn_user_id_idx" ON "webauthn_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "webauthn_credential_id_idx" ON "webauthn_credentials" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "usage_user_month_idx" ON "user_monthly_usage" USING btree ("user_id","month");--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "user_monthly_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trial_user_id_idx" ON "user_trials" USING btree ("user_id");