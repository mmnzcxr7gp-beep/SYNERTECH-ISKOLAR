const assert = require('assert');
const { startTestServer, signToken, db } = require('./testHelper');
const fs = require('fs');
const path = require('path');

async function run() {
  const env = await startTestServer();
  try {
    const admin = { id: 11011, email: 'admin.render@iskolar.test', role: 'admin', accountStatus: 'ACTIVE' };
    const student = { id: 11012, email: 'student.render@iskolar.test', role: 'student', name: 'Maria Santos', accountStatus: 'ACTIVE' };
    const provider = { id: 11013, email: 'provider.render@iskolar.test', role: 'provider', name: 'Ayala Foundation', company: 'Ayala', accountStatus: 'ACTIVE', sponsor_verified: true, organization_verified: true };

    db.data.users = (db.data.users || []).filter(u => ![11011, 11012, 11013].includes(u.id));
    db.data.users.push(admin, student, provider);
    await db.write();

    const token = signToken(admin);

    // 1. Verify students API returns all required table fields
    const sRes = await env.request('GET', '/api/admin/students', null, token);
    assert.strictEqual(sRes.status, 200);
    const sAccount = sRes.body.students.find(s => s.id === student.id);
    assert(sAccount, 'Student must be returned in students directory');
    assert(sAccount.name);
    assert(sAccount.email);
    assert.strictEqual(sAccount.role, 'student');

    // 2. Verify providers API returns all required table fields
    const pRes = await env.request('GET', '/api/admin/providers', null, token);
    assert.strictEqual(pRes.status, 200);
    const pAccount = pRes.body.providers.find(p => p.id === provider.id);
    assert(pAccount, 'Provider must be returned in providers directory');
    assert(pAccount.name || pAccount.company);
    assert(pAccount.email);

    // 3. Verify AccountActionsMenu component file exists and contains ARIA attributes
    const menuComponentPath = path.join(__dirname, '../../client/src/components/AccountActionsMenu.jsx');
    assert(fs.existsSync(menuComponentPath), 'AccountActionsMenu.jsx must exist');
    const menuCode = fs.readFileSync(menuComponentPath, 'utf8');
    assert(menuCode.includes('aria-label='), 'Must include dynamic aria-label for accessibility');
    assert(menuCode.includes('aria-haspopup="menu"'), 'Must declare aria-haspopup="menu"');
    assert(menuCode.includes('aria-expanded={isOpen}'), 'Must declare aria-expanded={isOpen}');
    assert(menuCode.includes('role="menu"'), 'Must declare role="menu"');
    assert(menuCode.includes('role="menuitem"'), 'Must declare role="menuitem"');

    console.log('✅ [PASS] test_account_action_menu_rendering passed successfully');
  } finally {
    await env.close();
  }
  process.exit(0);
}

run().catch(err => {
  console.error('❌ [FAIL] test_account_action_menu_rendering:', err);
  process.exit(1);
});
