import { type Page, type Locator } from "@playwright/test";

export class UpperNavbar {
  readonly page: Page;
  readonly resetData: Locator;
  readonly resetTextbox: Locator;
  readonly resetEnviromentButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.resetData = page.getByRole("button", { name: "Reset environment" });
    this.resetTextbox = page.getByRole("textbox", {
      name: "Type RESET to confirm",
    });
    this.resetEnviromentButton = page
      .getByRole("button", { name: "Reset environment" })
      .getByText("Reset environment", { exact: true });
  }
  async resetTestData(resetText: string) {
    await this.resetData.click();
    await this.resetTextbox.fill(resetText);
    await this.resetEnviromentButton.click();
  }
}
