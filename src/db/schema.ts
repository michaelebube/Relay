import { pgTable, text, timestamp, uuid, boolean, unique } from "drizzle-orm/pg-core";

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  clientId: uuid("client_id").references(() => clients.id, {onDelete: "cascade"}).notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const endpoints = pgTable("endpoints", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id, {onDelete: "cascade"}).notNull(),
  url: text("url").notNull(),
  description: text("description"),
  signingSecret: text("signing_secret").notNull(),
  enabled: boolean("is_enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const endpointSubscriptions = pgTable("endpoint_subscriptions", {
    id: uuid("id").defaultRandom().primaryKey(),
    endpointId: uuid("endpoint_id").references(() => endpoints.id, {onDelete: "cascade"}).notNull(),
    eventType: text("event_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [unique("endpoint_event_unique").on(table.endpointId, table.eventType)]
);

