-- Seed target accounts for reply monitoring
-- Priority 1-3 = high value, 4-6 = medium, 7-10 = low

-- AI Agents / OpenClaw Community
INSERT OR IGNORE INTO target_accounts (handle, display_name, niche, priority, notes) VALUES
('OpenClawAI', 'OpenClaw', 'ai-agents', 1, 'Official account — reply to announcements, tips'),
('AnthropicAI', 'Anthropic', 'ai-agents', 2, 'Parent company — high visibility replies'),
('steipete', 'Peter Steinberger', 'ai-agents', 2, 'OpenClaw creator — engage thoughtfully'),
('simonw', 'Simon Willison', 'ai-agents', 2, 'AI/data thought leader — technical replies'),
('LangChainAI', 'LangChain', 'ai-agents', 3, 'Agent framework — overlap audience'),
('karpathy', 'Andrej Karpathy', 'ai-agents', 2, 'AI pioneer — high impression replies');

-- Automation / No-Code / Productivity
INSERT OR IGNORE INTO target_accounts (handle, display_name, niche, priority, notes) VALUES
('zapier', 'Zapier', 'automation', 4, 'Automation platform — relevant audience'),
('n8n_io', 'n8n', 'automation', 3, 'Open source automation — aligned audience'),
('BenLang', 'Ben Lang', 'automation', 4, 'Notion community — template buyers');

-- Indie Hackers / Solopreneurs
INSERT OR IGNORE INTO target_accounts (handle, display_name, niche, priority, notes) VALUES
('levelsio', 'Pieter Levels', 'indie-hackers', 1, 'King of indie — massive engagement, reply fast'),
('marc_louvion', 'Marc Lou', 'indie-hackers', 2, 'Ship fast philosophy — aligned mindset'),
('dinkydani21', 'Danny Postma', 'indie-hackers', 3, 'AI tools builder — relevant overlap'),
('swyx', 'swyx', 'indie-hackers', 3, 'AI/dev thought leader — technical credibility');

-- Freelancing / Digital Nomads
INSERT OR IGNORE INTO target_accounts (handle, display_name, niche, priority, notes) VALUES
('TheAnkurTyagi', 'Ankur Tyagi', 'freelancing', 5, 'Freelance dev content — template buyer audience'),
('alexwest', 'Alex West', 'freelancing', 5, 'Freelance/business content');

-- Growth Marketing / Customer Acquisition
INSERT OR IGNORE INTO target_accounts (handle, display_name, niche, priority, notes) VALUES
('lennysan', 'Lenny Rachitsky', 'growth-marketing', 2, 'Product/growth newsletter — massive reach'),
('aaboraey', 'Amanda Natividad', 'growth-marketing', 3, 'Marketing thought leader'),
('GrowthHackers', 'GrowthHackers', 'growth-marketing', 5, 'Community account — lower priority');
