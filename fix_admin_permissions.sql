-- 1. Ensure 'admin' role exists in cms_roles
INSERT INTO cms_roles (name, description, is_system)
VALUES ('admin', 'System Administrator', true)
ON CONFLICT (name) DO UPDATE 
SET is_system = true; -- Ensure it is marked as system role

-- 2. Ensure all standard permissions exist in cms_permissions
INSERT INTO cms_permissions (code, name, description) VALUES
('/dashboard', 'Dashboard', 'Access dashboard'),
('/reports', 'Reports', 'Access reports'),
('/content/posts', 'Posts', 'Manage posts'),
('/content/comments', 'Comments', 'Manage comments'),
('/users', 'Users', 'Manage users'),
('/user-resources', 'User Resources', 'Manage user resources'),
('/recharge-records', 'Recharge Records', 'View recharge records'),
('/recharge-options', 'Recharge Options', 'Manage recharge options'),
('/case-ops', 'Case Operations', 'Case operations'),
('/tags', 'Tags', 'Manage tags'),
('/wiki', 'Wiki', 'Manage wiki'),
('/system/roles', 'Roles', 'Manage roles'),
('/system/messages', 'Messages', 'Manage system messages'),
('/audit-logs', 'Audit Logs', 'View audit logs'),
('/library-books', 'Library Books', 'Manage library books')
ON CONFLICT (code) DO NOTHING;

-- 3. Assign all permissions to the 'admin' role
DO $$
DECLARE
  v_role_id INT;
BEGIN
  -- Get the role_id for 'admin'
  SELECT id INTO v_role_id FROM cms_roles WHERE name = 'admin';

  IF v_role_id IS NOT NULL THEN
    -- Insert permissions linkage
    INSERT INTO cms_role_permissions (role_id, permission_id)
    SELECT v_role_id, id FROM cms_permissions
    WHERE code IN (
      '/dashboard',
      '/reports',
      '/content/posts',
      '/content/comments',
      '/users',
      '/user-resources',
      '/recharge-records',
      '/recharge-options',
      '/case-ops',
      '/tags',
      '/wiki',
      '/system/roles',
      '/system/messages',
      '/audit-logs',
      '/library-books'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE 'Permissions assigned to admin role (ID: %)', v_role_id;
  ELSE
    RAISE WARNING 'Admin role not found';
  END IF;
END $$;

-- 4. Ensure the specific user has the 'admin' role
UPDATE profiles
SET role = 'admin'
WHERE id = '04bedf2f-5249-44f9-8d0d-0e50b11d6e39';

-- 5. Ensure the RPC function exists and is correct
CREATE OR REPLACE FUNCTION app_get_my_permission_codes()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_permissions text[];
BEGIN
  -- Get user role from profiles
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  -- If no role, return empty
  IF v_role IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;
  
  -- Super admin check
  IF v_role = 'super_admin' THEN
     RETURN ARRAY['*'];
  END IF;

  -- Get permissions for the role
  SELECT COALESCE(array_agg(p.code), ARRAY[]::text[])
  INTO v_permissions
  FROM cms_roles r
  JOIN cms_role_permissions rp ON r.id = rp.role_id
  JOIN cms_permissions p ON rp.permission_id = p.id
  WHERE r.name = v_role;

  RETURN v_permissions;
END;
$$;
