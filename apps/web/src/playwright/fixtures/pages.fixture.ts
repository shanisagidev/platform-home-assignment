import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { AlertsPage } from '../pages/alerts-page';
import { PoliciesPage } from '../pages/policies-page';
import { UpperNavbar } from '../pages/upper-navbar';

export type PageFixtures = {
  loginPage: LoginPage;
  alertsPage: AlertsPage;
  policiesPage: PoliciesPage;
  upperNavbar: UpperNavbar;
};

export const test = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  alertsPage: async ({ page }, use) => {
    await use(new AlertsPage(page));
  },

  policiesPage: async ({ page }, use) => {
    await use(new PoliciesPage(page));
  },

  upperNavbar: async ({ page }, use) => {
    await use(new UpperNavbar(page));
  },
});

export { expect } from '@playwright/test';
