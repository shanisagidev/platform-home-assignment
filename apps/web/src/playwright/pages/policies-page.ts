import { type Page, type Locator } from '@playwright/test';

export class PoliciesPage {
  readonly page: Page;
  readonly startNewScanButton: Locator;
  readonly policiesTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.startNewScanButton = page.getByRole('button', { name: 'Start new security scan' });
    this.policiesTable = page.getByTestId('policies-table');
  }

  async clickStartNewScan() {
    await this.startNewScanButton.click();
  }

  getScanCompletedText() {
    return this.page.getByText('Scan complete');
  }

}
