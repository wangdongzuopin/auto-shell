-- Team/Enterprise collaboration foundation.
-- Personal edition remains limited to Product and Engineering roles.

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'password',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_login_at INTEGER
);

CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    owner_account_id TEXT,
    edition TEXT NOT NULL DEFAULT 'team',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (owner_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS workspace_members (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    member_role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(workspace_id, account_id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS role_profiles (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    name TEXT NOT NULL,
    role_key TEXT NOT NULL,
    description TEXT DEFAULT '',
    skill_category TEXT DEFAULT '',
    is_builtin INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(workspace_id, role_key),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_templates (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_stages (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    stage_order INTEGER NOT NULL,
    name TEXT NOT NULL,
    primary_role_key TEXT NOT NULL,
    collaborator_role_keys TEXT NOT NULL DEFAULT '[]',
    required_artifact_types TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ideas (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    project_id TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_role_key TEXT NOT NULL DEFAULT 'operations',
    status TEXT NOT NULL DEFAULT 'draft',
    assessment_summary TEXT DEFAULT '',
    current_role_key TEXT DEFAULT '',
    next_role_key TEXT DEFAULT '',
    created_by_account_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    role_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_by_account_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS handoffs (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL,
    from_role_key TEXT DEFAULT '',
    to_role_key TEXT NOT NULL,
    status_from TEXT DEFAULT '',
    status_to TEXT NOT NULL,
    note TEXT DEFAULT '',
    created_by_account_id TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL,
    artifact_id TEXT,
    status TEXT NOT NULL DEFAULT 'approved',
    note TEXT DEFAULT '',
    approved_by_account_id TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    project_id TEXT,
    idea_id TEXT,
    actor_account_id TEXT,
    event_type TEXT NOT NULL,
    summary TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE SET NULL,
    FOREIGN KEY (actor_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_role_profiles_workspace ON role_profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_stages_template ON workflow_stages(template_id);
CREATE INDEX IF NOT EXISTS idx_ideas_workspace ON ideas(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ideas_project ON ideas(project_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_idea ON artifacts(idea_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_idea ON handoffs(idea_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_workspace ON audit_events(workspace_id);

INSERT OR IGNORE INTO role_profiles (
    id, workspace_id, name, role_key, description, skill_category, is_builtin, sort_order, created_at, updated_at
) VALUES
('builtin-role-operations', NULL, '运营', 'operations', '提出增长想法、活动方案和用户反馈，并评估业务价值。', '运营', 1, 10, 1700000000000, 1700000000000),
('builtin-role-product-management', NULL, '产品经理', 'product_management', '将想法拆解为需求、流程、原型和验收标准。', '产品', 1, 20, 1700000000000, 1700000000000),
('builtin-role-design', NULL, '设计', 'design', '生成页面结构、HTML 原型、交互说明和体验评估。', '设计', 1, 30, 1700000000000, 1700000000000),
('builtin-role-engineering', NULL, '工程开发', 'engineering', '进行技术方案、任务拆解、代码实现和 Diff 审核。', '开发', 1, 40, 1700000000000, 1700000000000),
('builtin-role-qa', NULL, '测试', 'qa', '生成测试用例、回归清单、验收报告和缺陷记录。', '测试', 1, 50, 1700000000000, 1700000000000),
('builtin-role-project-owner', NULL, '项目负责人', 'project_owner', '统筹目标、里程碑、风险和跨角色决策。', '管理', 1, 60, 1700000000000, 1700000000000);
