import { test, expect } from "@playwright/test";
import {
  API_BASE_URL,
  login,
  startScan,
  waitForScanToComplete,
  findAutoRemediateAlert,
  waitForAutoRemediation,
  resetTestData,
  type Alert,
} from "../utils/api-helpers";

const CREDENTIALS = { username: "admin", password: "Aa123456" };
const COMMENT_TEXT = "Remediation verified successfully and issue is resolved";

/*
  Description:
  - Find an alert in status "Open" / "Remediation In Progress" with Auto Remediate: ON.
  - Once remediation is completed, change status to Resolved.
  - Add a comment: "Remediation verified successfully and issue is resolved".
  - Start another scan.
*/

test.describe("Verify Alert lifecycle: Auto Remediation (REST API)", () => {
  test("should complete full auto-remediation alert lifecycle", async ({
    request,
  }) => {
    // Two scans (2 × 90s) + auto-remediation (300s) + buffer
    test.setTimeout(600_000);

    // --- Login ---
    const authToken = await login(request, CREDENTIALS);
    expect(authToken, "Auth token should be present").toBeTruthy();
    console.log("Login successful, auth token acquired");

    const headers = { Authorization: `Bearer ${authToken}` };

    // --- Step 1: Start a scan to ensure auto-remediate alerts exist ---
    const scan = await startScan(request, headers);
    expect(scan.id, "Scan ID should be present").toBeTruthy();
    console.log(`Step 1: Scan started with id=${scan.id}`);

    // --- Step 2: Wait for scan to complete ---
    await test.step("Wait for scan to complete", async () => {
      await waitForScanToComplete(request, headers, scan.id);
      console.log(`Step 2: Scan ${scan.id} completed`);
    });

    // --- Step 3: Find an alert with Auto Remediate ON in OPEN or REMEDIATION_IN_PROGRESS ---
    let targetAlertId = '';
    await test.step("Find alert with Auto Remediate ON", async () => {
      targetAlertId = await findAutoRemediateAlert(request, headers);
      console.log(`Step 3: Target alert found with id=${targetAlertId}`);
    });
    expect(
      targetAlertId,
      "An alert with Auto Remediate ON in OPEN or REMEDIATION_IN_PROGRESS status should exist",
    ).toBeTruthy();

    // --- Step 4: Poll until remediation completes (REMEDIATED_WAITING_FOR_CUSTOMER) ---
    await test.step("Wait for auto-remediation to complete", async () => {
      await waitForAutoRemediation(request, headers, targetAlertId);
      console.log(
        `Step 4: Auto-remediation complete for alert ${targetAlertId}`,
      );
    });

    // --- Step 5: Change status to RESOLVED ---
    const resolveRes = await request.patch(
      `${API_BASE_URL}/api/alerts/${targetAlertId}`,
      {
        headers,
        data: { status: "RESOLVED" },
      },
    );
    expect(
      resolveRes.status(),
      "Status change to RESOLVED should succeed",
    ).toBe(200);
    const resolvedAlert: Alert = await resolveRes.json();
    expect(resolvedAlert.status, "Alert status should be RESOLVED").toBe(
      "RESOLVED",
    );
    console.log(`Step 5: Alert ${targetAlertId} status changed to RESOLVED`);

    // --- Step 6: Add comment ---
    const commentRes = await request.post(
      `${API_BASE_URL}/api/alerts/${targetAlertId}/comments`,
      {
        headers,
        data: { message: COMMENT_TEXT },
      },
    );
    expect(commentRes.status(), "Comment should be created").toBe(201);
    const comment = await commentRes.json();
    expect(comment.message, "Comment message should match").toBe(COMMENT_TEXT);
    console.log(
      `Step 6: Comment added to alert ${targetAlertId}: "${comment.message}"`,
    );

    // --- Step 7: Verify comment is persisted on the alert ---
    const alertWithCommentsRes = await request.get(
      `${API_BASE_URL}/api/alerts/${targetAlertId}`,
      { headers },
    );
    expect(alertWithCommentsRes.status()).toBe(200);
    const alertWithComments: Alert = await alertWithCommentsRes.json();
    const addedComment = alertWithComments.comments?.find(
      (c) => c.message === COMMENT_TEXT,
    );
    expect(addedComment, "Comment should be visible on the alert").toBeTruthy();
    console.log(`Step 7: Comment verified on alert ${targetAlertId}`);

    // --- Step 8: Start another scan ---
    const newScan = await startScan(request, headers);
    expect(newScan.id, "New scan should have an ID").toBeTruthy();
    expect(newScan.status, "New scan should be RUNNING").toBe("RUNNING");
    console.log(`Step 8: New scan started with id=${newScan.id}`);

    // --- Step 9: Verify no identical alert was re-detected after the scan ---
    // The system intentionally re-detects resolved auto-remediated alerts on the next scan.
    // This step is expected to FAIL — proving re-detection occurred.
    // Step 9 is a known bug: the system re-detects resolved auto-remediated alerts on the next scan.
    await test.step("Verify no identical alert was re-detected", async () => {
      await waitForScanToComplete(request, headers, newScan.id);
      console.log(
        `Step 9: New scan ${newScan.id} completed, checking for re-detected alerts`,
      );

      const alertsRes = await request.get(
        `${API_BASE_URL}/api/alerts?policyId=${resolvedAlert.policyId}`,
        { headers },
      );
      expect(alertsRes.status()).toBe(200);
      const alerts: Alert[] = await alertsRes.json();

      // An identical alert shares the same policy, violation type, and asset — and is not the original resolved alert
      const reDetectedAlert = alerts.find(
        (a) =>
          a.id !== targetAlertId &&
          a.violationType === resolvedAlert.violationType &&
          a.assetDisplayName === resolvedAlert.assetDisplayName &&
          a.status !== "RESOLVED",
      );

      if (reDetectedAlert) {
        console.log(
          `Step 9 FAILED: Re-detected alert found — id=${reDetectedAlert.id}, status=${reDetectedAlert.status}`,
        );
      }

      expect(
        reDetectedAlert,
        `Identical alert was re-detected after resolving (id=${reDetectedAlert?.id}). Remediation did not prevent re-detection.`,
      ).toBeUndefined();
    });
  });

  // --- Cleanup: reset test data after each test ---
  test.afterEach(async ({ request }) => {
    const cleanupToken = await login(request, CREDENTIALS);
    await resetTestData(request, { Authorization: `Bearer ${cleanupToken}` });
    console.log("Cleanup: test data reset");
  });
});
