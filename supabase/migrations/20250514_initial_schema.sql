-- Create gan_users table
CREATE TABLE IF NOT EXISTS gan_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    north_star TEXT,
    value_skill VARCHAR(100),
    trust_score INTEGER DEFAULT 500 NOT NULL,
    integrity_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES gan_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_genesis BOOLEAN DEFAULT FALSE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    integrity_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE gan_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON gan_users TO anon;
GRANT ALL ON gan_users TO authenticated;
GRANT SELECT ON tasks TO anon;
GRANT ALL ON tasks TO authenticated;

-- Create policies for gan_users
CREATE POLICY "Users can view own data" ON gan_users 
    FOR SELECT USING (auth.uid() = id);
    
CREATE POLICY "Users can update own data" ON gan_users 
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON gan_users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for tasks
CREATE POLICY "Users can view own tasks" ON tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);
