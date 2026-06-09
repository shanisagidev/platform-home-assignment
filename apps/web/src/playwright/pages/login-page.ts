import { type Page, type Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailAddress: Locator;
  readonly password: Locator;
  readonly signInButton: Locator;
  readonly alertMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailAddress = page.getByLabel("Email Address");
    this.password = page.getByLabel("Password");
    this.signInButton = page.getByRole("button", { name: "Sign in" });
    this.alertMessage = page.getByRole("alert");
  }

  async login(username: string, password: string) {
    await this.emailAddress.fill(username);
    await this.password.fill(password);
    await this.signInButton.click();
  }

  async getAlertMessage() {
    return await this.alertMessage.textContent();
  }
}
