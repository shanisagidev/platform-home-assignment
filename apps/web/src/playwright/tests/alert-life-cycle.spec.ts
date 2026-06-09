import { test, expect } from "../fixtures/pages.fixture";

const CREDENTIALS = { username: "admin", password: "Aa123456" };
const REMEDIATION_NOTE =
  "Investigating potential shadow IT usage. Initiating remediation process.";
const COMMENT_TEXT = "Remediation verified successfully and issue is resolved";
const RESET_TEXT = "RESET";

/* 
Description: 
- Find an alert in status “Open” and Auto Remediate: OFF.
- Change status to In Progress and Assign it to Security Analyst.
- Add remediate notes and press the “Remediate” button to remediate the
alert.
- Once remediation is complete, change status to Resolved.
- Add a comment: “Remediation verified successfully and issue is
resolved”.
*/

test.describe("Verify Alert lifecycle: Manual Remediation", () => {
  test("should complete full alert remediation flow", async ({
    page,
    loginPage,
    policiesPage,
    alertsPage,
  }) => {
    // Scan (up to 120s) + remediation (up to 300s) + UI interactions + buffer
    test.setTimeout(600_000);

    // --- Login ---
    await page.goto("/");
    await loginPage.login(CREDENTIALS.username, CREDENTIALS.password);
    await page.waitForURL("**/policies");

    // --- Start New Scan ---
    await policiesPage.clickStartNewScan();
    await expect(
      policiesPage.getScanCompletedText(),
      "verify scan is completed",
    ).toBeVisible({ timeout: 120_000 });

    // --- Navigate to Alerts ---
    await page.goto("/alerts");
    await expect(
      alertsPage.alertsPageSection,
      "verify alert page is opened",
    ).toBeVisible();

    // --- Filter: Status = Open ---
    await alertsPage.selectFilterValue("Status: All Statuses", "Open");

    // --- Filter: Auto Remediate = OFF ---
    await alertsPage.selectFilterValue("Auto Remediate: All", "OFF");

    // --- Verify alert list appeared ---
    await expect(
      alertsPage.alertsTable,
      "verify alert list is visible",
    ).toBeVisible();

    // --- Click first matching alert row ---
    await alertsPage.clickFirstAlertRow();

    // --- Change status → In Progress ---
    await alertsPage.changeAlertStatus("In Progress");

    // --- Verify status is changed to In Progress ---
    await expect(alertsPage.getAlertStatus()).toContainText(
      "In Progress",
    );

    // --- Assign to Security Analyst ---
    await alertsPage.assignAlert("Security Analyst");

    // --- Verify alert is assigned to Security Analyst ---
    await expect(alertsPage.getAlertAssignee()).toContainText(
      "Security Analyst",
    );

    // --- Expand Remediation section ---
    await alertsPage.expandRemediationSection();

    // --- Add remediation note and click Remediate ---
    await alertsPage.addRemediationNote(REMEDIATION_NOTE);
    await alertsPage.clickRemediateButton();

    // --- Wait for remediation to complete (backend takes 10–50 s) ---
    await alertsPage.waitForStatus("Awaiting User Verification");

    // --- Change status → Resolved ---
    await alertsPage.changeAlertStatus("Resolved");

    await expect(
      alertsPage.getAlertStatus(),
      "verify status is changed to Resolved",
    ).toContainText("Resolved");

    // --- Add comment ---
    await alertsPage.addComment(COMMENT_TEXT);

    // --- Verify comment is visible ---
    await expect(
      page.getByText(COMMENT_TEXT),
      "verify comment is added",
    ).toBeVisible();
  });

  // --- Cleanup: reset test data ---
  test.afterEach(async ({ page, upperNavbar }) => {
    await page.goto("/");
    await upperNavbar.resetTestData(RESET_TEXT);
  });
});
