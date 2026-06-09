import { type Page, type Locator, expect } from "@playwright/test";

export class AlertsPage {
readonly page: Page;                
readonly alertsPageSection: Locator;
readonly alertsTable: Locator;
readonly drawer: Locator;

    constructor(page: Page) {
    this.page = page;
    this.alertsPageSection = page.getByTestId('alerts-page');
    this.alertsTable = page.getByRole('table', { name: 'Alerts list' });
    this.drawer = page.getByTestId('alert-details-drawer');
    }

    async selectFilterValue(filterName: string, value: string) {
        await this.page.getByRole('button', { name: filterName }).click();
        await this.page.getByRole('option', { name: value , exact: true }).click();
        await this.page.keyboard.press('Escape');
    }

    async clickFirstAlertRow() {    
        await this.alertsTable.getByRole('cell').nth(1).click();
    }

    async getDrawerLocator() {
        return this.page.getByTestId('alert-details-drawer');
    }

    async changeAlertStatus(newStatus: string) {
        await this.drawer.getByRole('button', { name: 'Change alert status' }).click();
        await this.page.getByRole('option', { name: newStatus }).click();
    }

    async getAlertStatus() {
        const statusButton = this.drawer.getByRole('button', { name: 'Change alert status' });
        return statusButton;
    }

    async assignAlert(assignee: string) {
        await this.drawer.getByRole('button', { name: 'Assign alert' }).click();
        await this.page.getByRole('option', { name: assignee }).click();
    }

    async expandRemediationSection() {
        await this.drawer.getByRole('button', { name: /Remediation/ }).click();
    }

    async addRemediationNote(note: string) {
        await this.drawer.getByLabel('Remediation note').fill(note);
    }

    async clickRemediateButton() {
        await this.drawer.getByRole('button', { name: 'Remediate' }).click();
    }

    async addComment(comment: string) {
        await this.drawer.getByLabel('Comment message').fill(comment);
        await this.drawer.getByRole('button', { name: 'Post comment' }).click();
    }

}


