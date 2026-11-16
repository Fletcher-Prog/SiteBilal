import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001/api';

test.describe('Auth API', () => {
  test('POST /auth/login — valid credentials', async ({ request }) => {
    const res = await request.post(`${BASE}/auth/login`, { data: { name: 'Bilel', password: 'admin123' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.user.name).toBe('Bilel');
    expect(body.user.role).toBe('admin');
  });

  test('POST /auth/login — missing fields → 400', async ({ request }) => {
    const res = await request.post(`${BASE}/auth/login`, { data: {} });
    expect(res.status()).toBe(400);
  });

  test('POST /auth/login — wrong password → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/auth/login`, { data: { name: 'Bilel', password: 'wrong' } });
    expect(res.status()).toBe(401);
  });

  test('GET /auth/users — returns user list', async ({ request }) => {
    const res = await request.get(`${BASE}/auth/users`);
    expect(res.ok()).toBeTruthy();
    const users = await res.json();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
    expect(users[0]).toHaveProperty('name');
    expect(users[0]).not.toHaveProperty('password');
  });

  test('POST /auth/users — create + DELETE cleanup', async ({ request }) => {
    const res = await request.post(`${BASE}/auth/users`, { data: { name: 'TestUser', password: 'test123', email: 'test@test.com' } });
    expect(res.status()).toBe(201);
    const user = await res.json();
    expect(user.name).toBe('TestUser');

    // duplicate → 409
    const dup = await request.post(`${BASE}/auth/users`, { data: { name: 'TestUser', password: 'x' } });
    expect(dup.status()).toBe(409);

    // cleanup
    await request.delete(`${BASE}/auth/users/${user.id}`);
  });

  test('PATCH /auth/users/:id — toggle active', async ({ request }) => {
    const u = await (await request.post(`${BASE}/auth/users`, { data: { name: 'ToggleUser', password: 'x1', role: 'user', permissions: ['planning'] } })).json();
    const res = await request.patch(`${BASE}/auth/users/${u.id}`, { data: { active: 0 } });
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).active).toBe(0);
    const back = await request.patch(`${BASE}/auth/users/${u.id}`, { data: { active: 1 } });
    expect((await back.json()).active).toBe(1);
    await request.delete(`${BASE}/auth/users/${u.id}`);
  });

  test('GET /auth/me — valid token', async ({ request }) => {
    const login = await (await request.post(`${BASE}/auth/login`, { data: { name: 'Bilel', password: 'admin123' } })).json();
    const res = await request.get(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${login.token}` } });
    expect(res.ok()).toBeTruthy();
    const me = await res.json();
    expect(me.name).toBe('Bilel');
  });

  test('GET /auth/me — no token → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/auth/me`, { headers: { Authorization: '' } });
    expect(res.status()).toBe(401);
  });

  test('POST /auth/logout — always ok', async ({ request }) => {
    const res = await request.post(`${BASE}/auth/logout`);
    expect(res.ok()).toBeTruthy();
  });
});
