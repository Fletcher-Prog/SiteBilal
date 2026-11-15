import { Page } from '@playwright/test';

const BASE = 'http://localhost:3001';

export async function login(page: Page, name = 'Bilel', password = 'admin123') {
  // Get token via API
  const res = await page.request.post(`${BASE}/api/auth/login`, { data: { name, password } });
  const { token, user } = await res.json();
  // Set in localStorage before navigating
  await page.goto(`${BASE}/login`);
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, { token, user });
}

export { BASE };
