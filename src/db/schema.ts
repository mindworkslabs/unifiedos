import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { BoardState } from "@/lib/hack/engine";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

export const terminals = pgTable("terminals", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  welcome: text("welcome").notNull().default(""),
  serverNo: integer("server_no").notNull().default(1),
  firmware: text("firmware").$type<"uos" | "termlink">().notNull().default("uos"),
  phosphor: text("phosphor").$type<"green" | "amber" | "white" | "blue">().notNull().default("green"),
  securityLevel: integer("security_level").notNull().default(3),
  /** Seconds an intruder is locked out after four misses. 0 = until the owner resets it. */
  lockoutSeconds: integer("lockout_seconds").notNull().default(300),
  /** Leaving the hacking screen early resets the board (the classic exploit). */
  exploitEnabled: boolean("exploit_enabled").notNull().default(true),
  createdAt: createdAt(),
});

export const nodes = pgTable(
  "nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    terminalId: uuid("terminal_id")
      .notNull()
      .references(() => terminals.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => nodes.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"folder" | "document">().notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("nodes_terminal_parent_idx").on(t.terminalId, t.parentId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    createdAt: createdAt(),
    readAt: timestamp("read_at", { withTimezone: true }),
    deletedBySender: boolean("deleted_by_sender").notNull().default(false),
    deletedByRecipient: boolean("deleted_by_recipient").notNull().default(false),
  },
  (t) => [index("messages_to_idx").on(t.toUserId, t.createdAt), index("messages_from_idx").on(t.fromUserId, t.createdAt)],
);

export const hackSessions = pgTable(
  "hack_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    terminalId: uuid("terminal_id")
      .notNull()
      .references(() => terminals.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    state: jsonb("state").$type<BoardState>().notNull(),
    status: text("status").$type<BoardState["status"] | "abandoned">().notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("hack_sessions_visitor_idx").on(t.terminalId, t.visitorId)],
);

export const lockouts = pgTable(
  "lockouts",
  {
    terminalId: uuid("terminal_id")
      .notNull()
      .references(() => terminals.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    ipHash: text("ip_hash").notNull(),
    until: timestamp("until", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.terminalId, t.visitorId] }), index("lockouts_ip_idx").on(t.terminalId, t.ipHash)],
);

export const accessLog = pgTable(
  "access_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    terminalId: uuid("terminal_id")
      .notNull()
      .references(() => terminals.id, { onDelete: "cascade" }),
    actor: text("actor").$type<"owner" | "intruder" | "visitor">().notNull(),
    visitorId: text("visitor_id"),
    event: text("event").notNull(),
    detail: text("detail").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("access_log_terminal_idx").on(t.terminalId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Terminal = typeof terminals.$inferSelect;
export type Node = typeof nodes.$inferSelect;
export type Message = typeof messages.$inferSelect;

