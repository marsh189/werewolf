import { expect, test, type Browser, type Page } from '@playwright/test';

const createAccountAndReachLobbyList = async (
  page: Page,
  { name, email, password }: { name: string; email: string; password: string },
) => {
  await page.goto('/signup');

  await page.getByPlaceholder('Enter your name...').fill(name);
  await page.getByPlaceholder('Enter your email...').fill(email);
  await page.getByPlaceholder('Enter your password...').fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Lobbies' })).toBeVisible();
};

const createSession = async (
  browser: Browser,
  {
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  },
) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await createAccountAndReachLobbyList(page, { name, email, password });
  return { context, page };
};

test('two players sync lobby display names into the game view', async ({ browser, baseURL }) => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const lobbyName = `e2e-multi-${runId}`.slice(0, 32);

  const playerOne = {
    name: `Alice Host ${runId}`,
    email: `alice-${runId}@example.com`,
    password: 'password123!',
  };
  const playerTwo = {
    name: `Bob Guest ${runId}`,
    email: `bob-${runId}@example.com`,
    password: 'password123!',
  };

  const { context: hostContext, page: hostPage } = await createSession(browser, playerOne);
  const { context: guestContext, page: guestPage } = await createSession(browser, playerTwo);

  try {
    await hostPage.getByRole('button', { name: 'Create New Lobby' }).click();
    const createDialog = hostPage.getByRole('dialog', { name: 'Create Lobby' });
    await createDialog.getByPlaceholder('Enter lobby name').fill(lobbyName);
    await createDialog.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(hostPage).toHaveURL(new RegExp(`/lobby/${lobbyName}$`));
    await expect(hostPage.getByRole('heading', { name: 'Players' })).toBeVisible();
    await expect(hostPage.getByText('Alice', { exact: true })).toBeVisible();

    await guestPage.goto(baseURL ?? '/');
    await guestPage.getByPlaceholder('Find a game').fill(lobbyName);
    await guestPage.getByRole('button', { name: lobbyName }).click();

    await expect(guestPage).toHaveURL(new RegExp(`/lobby/${lobbyName}$`));
    await expect(guestPage.getByText('Alice', { exact: true })).toBeVisible();
    await expect(guestPage.getByText('Bob', { exact: true })).toBeVisible();

    await hostPage.getByRole('button', { name: 'Edit name' }).click();
    await hostPage.getByPlaceholder('Enter display name...').fill('Captain Alice');
    await hostPage.getByRole('button', { name: 'Confirm name' }).click();

    await expect(hostPage.getByText('Captain', { exact: true })).toBeVisible();
    await expect(guestPage.getByText('Captain', { exact: true })).toBeVisible();
    await expect(guestPage.getByText('Bob', { exact: true })).toBeVisible();

    await hostPage.getByRole('button', { name: 'Start Game' }).click();

    await expect(hostPage).toHaveURL(new RegExp(`/lobby/${lobbyName}/game$`), {
      timeout: 25_000,
    });
    await expect(guestPage).toHaveURL(new RegExp(`/lobby/${lobbyName}/game$`), {
      timeout: 25_000,
    });

    await expect(hostPage.getByText('Captain Alice', { exact: true })).toBeVisible();
    await expect(hostPage.getByText('Bob', { exact: true })).toBeVisible();
    await expect(guestPage.getByText('Captain Alice', { exact: true })).toBeVisible();
    await expect(guestPage.getByText('Bob', { exact: true })).toBeVisible();
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
