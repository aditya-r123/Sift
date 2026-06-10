import { type Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { seedAuthenticatedSession, stubCommonApiRoutes } from './helpers';

// [GenAI Use] Prompt: "Make friends page fixtures for accepted, incoming, and sent requests, as well as searchable
// profiles for flows involving accepting, canceling, and unfriending."
// [GenAI Use] LLM Response Start
const profiles = [
  { id: 'friend-accepted', display_name: 'Maya Patel', avatar_url: null },
  { id: 'friend-incoming', display_name: 'Noah Kim', avatar_url: null },
  { id: 'friend-sent', display_name: 'Lena Ortiz', avatar_url: null },
  { id: 'friend-search', display_name: 'Riley Stone', avatar_url: null },
];

const friendRows = [
  {
    id: 'row-accepted',
    requester_id: 'user-1',
    addressee_id: 'friend-accepted',
    status: 'accepted',
    created_at: '2026-06-01T12:00:00.000Z',
  },
  {
    id: 'row-incoming',
    requester_id: 'friend-incoming',
    addressee_id: 'user-1',
    status: 'pending',
    created_at: '2026-06-02T12:00:00.000Z',
  },
  {
    id: 'row-sent',
    requester_id: 'user-1',
    addressee_id: 'friend-sent',
    status: 'pending',
    created_at: '2026-06-03T12:00:00.000Z',
  },
];
// [GenAI Use] LLM Response End

async function openFriends(page: Page, rows = friendRows) {
  await seedAuthenticatedSession(page, {
    tables: { profiles, friends: rows },
  });
  await stubCommonApiRoutes(page);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Friends' }).click();
  await expect(page.getByRole('heading', { name: 'Friends', exact: true })).toBeVisible();
}

test('friends tab shows accepted, incoming, sent requests', async ({ page }) => {
  await openFriends(page);

  await expect(page.getByText('Requests (1)')).toBeVisible();
  await expect(page.locator('li').filter({ hasText: 'Noah Kim' })).toContainText('Wants to be friends');
  await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();

  await expect(page.getByText('Sent (1)')).toBeVisible();
  await expect(page.locator('li').filter({ hasText: 'Lena Ortiz' })).toContainText('Request pending');
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

  await expect(page.getByText('Your friends (1)')).toBeVisible();
  await expect(page.locator('div').filter({ hasText: 'Maya Patel' }).first()).toBeVisible();
});

test('friends tab accepts incoming requests', async ({ page }) => {
  await openFriends(page);

  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByText('Requests (1)')).toBeHidden();
  await expect(page.getByText('Your friends (2)')).toBeVisible();
  await expect(page.locator('div').filter({ hasText: 'Noah Kim' }).first()).toBeVisible();
});

test('friends tab can send new friend request by searching for users', async ({ page }) => {
  await openFriends(page);

  await page.getByPlaceholder('Search by name…').fill('Riley');
  await expect(page.locator('li').filter({ hasText: 'Riley Stone' })).toBeVisible();

  await page.locator('li').filter({ hasText: 'Riley Stone' }).getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Sent (2)')).toBeVisible();
  await expect(page.locator('section').filter({ hasText: 'Sent (2)' }).filter({ hasText: 'Riley Stone' })).toContainText(
    'Request pending'
  );
});

test('friend tab can cancel requests', async ({ page }) => {
  await openFriends(page);

  await page.locator('li').filter({ hasText: 'Lena Ortiz' }).getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Sent (1)')).toBeHidden();
  await expect(page.locator('li').filter({ hasText: 'Lena Ortiz' })).toHaveCount(0);
});

test('friend tab can remove friends', async ({ page }) => {
  await openFriends(page);

  await page.getByRole('button', { name: 'Unfriend Maya Patel' }).click();
  await expect(page.getByText('Your friends (1)')).toBeHidden();
  await expect(page.getByText('No friends yet. Search above to send the first request.')).toBeVisible();
});

test('friend tab can show no results or no friends', async ({ page }) => {
  await openFriends(page, []);

  await expect(page.getByText('No friends yet. Search above to send the first request.')).toBeVisible();
  await page.getByPlaceholder('Search by name…').fill('Missing Person');
  await expect(page.getByText('No users match "Missing Person".')).toBeVisible();
});
