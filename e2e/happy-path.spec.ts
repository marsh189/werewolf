import { expect, test } from '@playwright/test';

test('signup → create lobby → start game', async ({ page }) => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const name = `E2E ${runId}`;
  const email = `e2e-${runId}@example.com`;
  const password = 'password123!';
  const lobbyName = `e2e-lobby-${runId}`.slice(0, 32);

  await page.goto('/signup');

  await page.getByPlaceholder('Enter your name...').fill(name);
  await page.getByPlaceholder('Enter your email...').fill(email);
  await page.getByPlaceholder('Enter your password...').fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Lobbies' })).toBeVisible();

  await page.getByRole('button', { name: 'Create New Lobby' }).click();
  const createDialog = page.getByRole('dialog', { name: 'Create Lobby' });
  await createDialog.getByPlaceholder('Enter lobby name').fill(lobbyName);
  await createDialog.getByRole('button', { name: 'Create', exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/lobby/${lobbyName}$`));
  await expect(page.getByRole('button', { name: 'Leave Lobby' })).toBeVisible();

  await page.getByRole('button', { name: 'Start Game' }).click();
  await expect(page).toHaveURL(new RegExp(`/lobby/${lobbyName}/game$`), {
    timeout: 25_000,
  });
  await expect(
    page.getByRole('heading', { name: /Game begins soon|Day|Night|Game/i }),
  ).toBeVisible();
});
