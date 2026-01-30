import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://d53bmv0g91htqli3vq50.baseapi.memfiredb.com';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiZXhwIjozMzQzMDQzMTk2LCJpYXQiOjE3NjYyNDMxOTYsImlzcyI6InN1cGFiYXNlIn0.RyD-B5l-p6OCPbJ9zhgGztbNYjt1Wba0Et5tXf43r0w';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const userId = '89c32026-5cf8-45e3-927b-a1d6e1a76403';

async function check() {
  console.log(`正在检查用户 ID: ${userId} 的配置信息...`);
  
  // 1. 检查 profiles 表中的基础信息
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, cms_role_id, nickname')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('获取用户信息失败:', profileError);
    return;
  }

  console.log('用户信息 (profiles):', profile);

  if (!profile) {
    console.log('未找到该用户。');
    return;
  }

  // 模拟修复后的逻辑
  if (profile.role !== 'admin' && profile.role !== 'super_admin') {
    console.error('⚠️ 警告: 用户 role 字段不是 "admin" 或 "super_admin"，这会导致 getAdminContext 返回 403 Forbidden。');
  } else {
    console.log(`✅ 用户 role 字段正确 (${profile.role})，权限检查应该通过。`);
  }

  // 2. 检查 CMS 角色 (cms_roles)
  if (profile.cms_role_id) {
    const { data: role, error: roleError } = await supabase
      .from('cms_roles')
      .select('*, cms_role_permissions(cms_permissions(code))')
      .eq('id', profile.cms_role_id)
      .single();

    if (roleError) {
      console.error('获取 CMS 角色失败:', roleError);
    } else {
      console.log('CMS 角色详情:', JSON.stringify(role, null, 2));
      
      if (role.id === 1) {
         console.log('✅ 用户是超级管理员 (ID: 1)。');
      } else {
         console.log(`ℹ️ 用户角色 ID 为 ${role.id} (不是 ID 1 的超级管理员)。`);
      }
    }
  } else {
    console.log('⚠️ 未分配 cms_role_id。');
  }
}

check();
