-- Kids Safe Circle - core schema
-- Design principle: the safety model lives in the data model, not just the
-- app code. There is no table or column that supports public search,
-- global discovery, or child-to-stranger contact.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- A parent is the only party that ever authenticates directly.
CREATE TABLE parents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               CITEXT UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,
  consent_verified_at TIMESTAMPTZ,        -- NULL until verifiable parental consent completes
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Children never get their own credentials. They exist only as profiles
-- nested under a parent account, selected by avatar/PIN inside a session
-- the parent has already authenticated.
CREATE TABLE children (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_key  TEXT NOT NULL DEFAULT 'sprout',
  favorite_color TEXT NOT NULL DEFAULT 'sunshine', -- purely cosmetic, parent-set, never moderated
  bio         TEXT,                        -- short, parent-authored - not kid-authored, so no moderation queue needed
  pin_hash    TEXT,                        -- optional 4-digit PIN so kids can pick their own profile
  birth_year  SMALLINT,                    -- year only, never a full DOB
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Connections are between PARENTS, never between children directly, and
-- require the requesting parent to already know the other parent's email
-- (no directory, no search, no suggested-friends).
CREATE TYPE connection_status AS ENUM ('pending', 'approved', 'blocked');

CREATE TABLE connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_a_id   UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  parent_b_id   UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  status        connection_status NOT NULL DEFAULT 'pending',
  requested_by  UUID NOT NULL REFERENCES parents(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at  TIMESTAMPTZ,
  CHECK (parent_a_id <> parent_b_id),
  UNIQUE (parent_a_id, parent_b_id)
);

-- Every post moves seed -> sprout -> bloom (or wilts, if rejected).
-- Nothing is visible to anyone but the posting child's own parent until
-- moderation_status = 'bloom'.
CREATE TYPE moderation_status AS ENUM ('seed', 'sprout', 'bloom', 'wilted');
CREATE TYPE post_content_type AS ENUM ('text', 'image', 'video');

CREATE TABLE posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id          UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id         UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  content_type      post_content_type NOT NULL,
  text_content      TEXT,
  media_url         TEXT,
  moderation_status moderation_status NOT NULL DEFAULT 'seed',
  moderation_notes  TEXT,
  auto_check_passed BOOLEAN,               -- result of the automated screen, before parent review
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at       TIMESTAMPTZ
);

-- Any parent can report anything they or their child can see. Reports are
-- never routed back through the reported party.
CREATE TYPE report_status AS ENUM ('open', 'reviewed', 'resolved');

CREATE TABLE reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_parent_id UUID NOT NULL REFERENCES parents(id),
  target_post_id    UUID REFERENCES posts(id) ON DELETE SET NULL,
  target_child_id   UUID REFERENCES children(id) ON DELETE SET NULL,
  reason            TEXT NOT NULL,
  status            report_status NOT NULL DEFAULT 'open',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments go through the EXACT same seed -> sprout -> bloom pipeline as
-- posts (see services/moderation.js moderateText). Free text from a child
-- never becomes visible to another family without a parent approving it -
-- reactions below are different specifically because they AREN'T free text.
CREATE TABLE comments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  child_id          UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id         UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  text_content      TEXT NOT NULL,
  moderation_status moderation_status NOT NULL DEFAULT 'seed',
  moderation_notes  TEXT,
  auto_check_passed BOOLEAN,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at       TIMESTAMPTZ
);

-- Reactions skip the moderation queue on purpose: the emoji a child can
-- send is a fixed, small set enforced by both the frontend and the API
-- (see routes/posts.js REACTION_EMOJI) - there is no free-text path here,
-- so there's nothing for a parent to review.
CREATE TABLE post_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  child_id   UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, child_id) -- one reaction per child per post, not one per emoji
);

CREATE INDEX idx_children_parent ON children(parent_id);
CREATE INDEX idx_connections_parent_a ON connections(parent_a_id);
CREATE INDEX idx_connections_parent_b ON connections(parent_b_id);
CREATE INDEX idx_posts_child ON posts(child_id);
CREATE INDEX idx_posts_status ON posts(moderation_status);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_status ON comments(moderation_status);
CREATE INDEX idx_reactions_post ON post_reactions(post_id);
