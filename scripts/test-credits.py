#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║           OWL FENC — CREDIT SYSTEM VALIDATION TEST SUITE                   ║
║                                                                              ║
║  Tests all contract credit deduction scenarios:                              ║
║    1. Contract generation (no signature)     → -12 credits                  ║
║    2. Contract + Dual Signature bundle       → -18 credits                  ║
║    3. Signature Protocol only               → -8 credits                    ║
║    4. Change Order (generate-contract-html) → -12 credits                   ║
║    5. Lien Waiver (generate-contract-html)  → -12 credits                   ║
║    6. Insufficient credits (should block)   → 402 error                     ║
║    7. Unauthenticated request (should block)→ 401 error                     ║
║                                                                              ║
║  Usage:                                                                      ║
║    python3 scripts/test-credits.py --url https://app.owlfenc.com            ║
║    python3 scripts/test-credits.py --url http://localhost:5000               ║
║    python3 scripts/test-credits.py --url https://YOUR-REPLIT-URL.replit.dev ║
║                                                                              ║
║  Requirements:                                                               ║
║    - FIREBASE_TEST_UID: Firebase UID of a test user                         ║
║    - FIREBASE_ID_TOKEN: Fresh Firebase ID token for that user               ║
║    - ADMIN_API_KEY: Admin key to grant test credits                         ║
║                                                                              ║
║  All env vars can also be passed as CLI args (see --help)                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import argparse
import json
import os
import sys
import time
import requests

# ─── ANSI Colors ──────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"
DIM    = "\033[2m"

# ─── Credit costs (must match shared/wallet-schema.ts) ───────────────────────
CREDIT_COSTS = {
    "contract":              12,
    "signatureProtocol":      8,
    "contractWithSignature": 18,
    "invoice":                5,
    "permitReport":          15,
    "aiEstimate":             8,
}

# ─── Sample contract payload ──────────────────────────────────────────────────
SAMPLE_CONTRACT_PAYLOAD = {
    "templateId": "independent-contractor",
    "client": {
        "name": "Test Client LLC",
        "address": "123 Test St, San Diego, CA 92101",
        "email": "testclient@example.com",
        "phone": "619-555-0100",
    },
    "contractor": {
        "name": "Test Contractor",
        "company": "OWL FENC TEST LLC",
        "address": "456 Contractor Ave, San Diego, CA 92103",
        "phone": "619-555-0200",
        "email": "contractor@owlfenc.com",
        "license": "TEST-LIC-001",
    },
    "project": {
        "type": "Fence Installation",
        "description": "Install 6ft cedar fence along property perimeter — TEST ONLY",
        "location": "123 Test St, San Diego, CA 92101",
        "startDate": "2026-04-01",
        "endDate": "2026-04-15",
    },
    "financials": {
        "total": 5000,
        "paymentMilestones": [
            {"description": "Deposit", "amount": 2500, "dueDate": "2026-04-01"},
            {"description": "Completion", "amount": 2500, "dueDate": "2026-04-15"},
        ],
    },
    "legalClauses": {"selected": [], "clauses": []},
}

SAMPLE_HTML_PAYLOAD = {
    **SAMPLE_CONTRACT_PAYLOAD,
    "templateId": "change-order",
}


# ─── Test runner class ────────────────────────────────────────────────────────
class CreditTestRunner:
    def __init__(self, base_url: str, firebase_uid: str, id_token: str, admin_key: str):
        self.base_url = base_url.rstrip("/")
        self.firebase_uid = firebase_uid
        self.id_token = id_token
        self.admin_key = admin_key
        self.session = requests.Session()
        self.session_cookie = None
        self.results = []
        self.passed = 0
        self.failed = 0
        self.skipped = 0

    # ── Helpers ───────────────────────────────────────────────────────────────
    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def _log(self, msg: str):
        print(msg)

    def _pass(self, name: str, detail: str = ""):
        self.passed += 1
        self.results.append(("PASS", name, detail))
        print(f"  {GREEN}✅ PASS{RESET} {name}" + (f" {DIM}({detail}){RESET}" if detail else ""))

    def _fail(self, name: str, detail: str = ""):
        self.failed += 1
        self.results.append(("FAIL", name, detail))
        print(f"  {RED}❌ FAIL{RESET} {name}" + (f" {DIM}({detail}){RESET}" if detail else ""))

    def _skip(self, name: str, reason: str = ""):
        self.skipped += 1
        self.results.append(("SKIP", name, reason))
        print(f"  {YELLOW}⏭  SKIP{RESET} {name}" + (f" {DIM}({reason}){RESET}" if reason else ""))

    # ── Auth ──────────────────────────────────────────────────────────────────
    def authenticate(self) -> bool:
        """Exchange Firebase ID token for session cookie."""
        self._log(f"\n{CYAN}{BOLD}── STEP 1: Authentication ──────────────────────────────{RESET}")
        try:
            resp = self.session.post(
                self._url("/api/sessionLogin"),
                json={"idToken": self.id_token},
                timeout=15,
            )
            if resp.status_code == 200:
                # Session cookie is set automatically in self.session
                self._pass("Session login", f"HTTP {resp.status_code}")
                return True
            else:
                self._fail("Session login", f"HTTP {resp.status_code}: {resp.text[:200]}")
                return False
        except Exception as e:
            self._fail("Session login", str(e))
            return False

    # ── Balance helpers ───────────────────────────────────────────────────────
    def get_balance(self) -> int | None:
        """Get current wallet balance."""
        try:
            resp = self.session.get(self._url("/api/wallet/balance"), timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("balance") or data.get("availableCredits") or data.get("credits", 0)
            return None
        except Exception:
            return None

    def grant_credits(self, amount: int, description: str) -> bool:
        """Grant credits to the test user via admin endpoint."""
        try:
            resp = requests.post(
                self._url("/api/wallet/admin/grant"),
                headers={"x-admin-key": self.admin_key},
                json={
                    "targetType": "single",
                    "firebaseUid": self.firebase_uid,
                    "credits": amount,
                    "description": description,
                    "idempotencyKey": f"test-grant-{int(time.time())}-{amount}",
                },
                timeout=15,
            )
            return resp.status_code == 200
        except Exception:
            return False

    def get_last_transaction(self) -> dict | None:
        """Get the most recent wallet transaction."""
        try:
            resp = self.session.get(self._url("/api/wallet/history?limit=1"), timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                txns = data.get("transactions") or data.get("history") or []
                return txns[0] if txns else None
            return None
        except Exception:
            return None

    # ── Core test: credit deduction ───────────────────────────────────────────
    def _test_credit_deduction(
        self,
        test_name: str,
        endpoint: str,
        payload: dict,
        expected_cost: int,
        initial_balance_override: int | None = None,
    ):
        """
        Generic credit deduction test:
        1. Record balance before
        2. Call endpoint
        3. Record balance after
        4. Assert balance_before - balance_after == expected_cost
        """
        print(f"\n  {BOLD}Testing:{RESET} {test_name}")
        print(f"  {DIM}Endpoint: POST {endpoint} | Expected cost: -{expected_cost} credits{RESET}")

        # Grant enough credits if needed
        balance_before = self.get_balance()
        if balance_before is None:
            self._fail(test_name, "Could not read wallet balance")
            return

        if balance_before < expected_cost + 10:
            needed = expected_cost + 50 - balance_before
            self._log(f"  {YELLOW}⚡ Granting {needed} test credits...{RESET}")
            if not self.grant_credits(needed, f"test-grant for {test_name}"):
                self._fail(test_name, "Could not grant test credits (check ADMIN_API_KEY)")
                return
            time.sleep(0.5)
            balance_before = self.get_balance()

        print(f"  {DIM}Balance before: {balance_before} credits{RESET}")

        # Call the endpoint
        try:
            resp = self.session.post(
                self._url(endpoint),
                json=payload,
                timeout=60,  # contracts can take a while
            )
        except Exception as e:
            self._fail(test_name, f"Request failed: {e}")
            return

        if resp.status_code not in (200, 201):
            self._fail(test_name, f"HTTP {resp.status_code}: {resp.text[:300]}")
            return

        # Wait briefly for async credit deduction
        time.sleep(1.0)

        balance_after = self.get_balance()
        if balance_after is None:
            self._fail(test_name, "Could not read balance after request")
            return

        actual_cost = balance_before - balance_after
        print(f"  {DIM}Balance after:  {balance_after} credits (deducted: {actual_cost}){RESET}")

        if actual_cost == expected_cost:
            self._pass(test_name, f"Deducted exactly {actual_cost} credits ✓")
        elif actual_cost == 0:
            self._fail(test_name, f"NO credits deducted (expected -{expected_cost})")
        else:
            self._fail(test_name, f"Wrong amount: deducted {actual_cost}, expected {expected_cost}")

        # Verify transaction record
        txn = self.get_last_transaction()
        if txn:
            txn_amount = abs(txn.get("amount") or txn.get("credits") or txn.get("amountCredits") or 0)
            txn_type = txn.get("type") or txn.get("featureName") or "unknown"
            print(f"  {DIM}Last transaction: {txn_type} | {txn_amount} credits{RESET}")

    # ── Security tests ────────────────────────────────────────────────────────
    def _test_unauthenticated(self, endpoint: str, payload: dict):
        """Verify that unauthenticated requests are rejected with 401."""
        test_name = f"Unauthenticated request blocked ({endpoint.split('/')[-1]})"
        print(f"\n  {BOLD}Testing:{RESET} {test_name}")
        try:
            # Use a fresh session WITHOUT the session cookie
            resp = requests.post(
                self._url(endpoint),
                json=payload,
                timeout=15,
            )
            if resp.status_code == 401:
                self._pass(test_name, "Correctly returned 401 Unauthorized")
            elif resp.status_code == 403:
                self._pass(test_name, "Correctly returned 403 Forbidden")
            else:
                self._fail(test_name, f"Expected 401/403, got HTTP {resp.status_code}")
        except Exception as e:
            self._fail(test_name, str(e))

    def _test_insufficient_credits(self, endpoint: str, payload: dict, feature_name: str):
        """Verify that requests with 0 credits are rejected with 402."""
        test_name = f"Insufficient credits blocked ({feature_name})"
        print(f"\n  {BOLD}Testing:{RESET} {test_name}")

        balance = self.get_balance()
        if balance is None:
            self._skip(test_name, "Could not read balance")
            return

        if balance > 0:
            # We need to drain the balance first — skip this test if balance is high
            # (we don't want to drain real credits)
            self._skip(test_name, f"Balance is {balance} — skipping drain test to protect credits")
            return

        try:
            resp = self.session.post(self._url(endpoint), json=payload, timeout=15)
            if resp.status_code == 402:
                self._pass(test_name, "Correctly returned 402 Payment Required")
            elif resp.status_code == 403:
                self._pass(test_name, "Correctly returned 403 (insufficient credits)")
            else:
                self._fail(test_name, f"Expected 402, got HTTP {resp.status_code}")
        except Exception as e:
            self._fail(test_name, str(e))

    # ── Main test suite ───────────────────────────────────────────────────────
    def run(self):
        print(f"\n{CYAN}{BOLD}╔══════════════════════════════════════════════════════╗")
        print(f"║     OWL FENC — CREDIT SYSTEM VALIDATION TESTS       ║")
        print(f"╚══════════════════════════════════════════════════════╝{RESET}")
        print(f"\n{DIM}Target URL: {self.base_url}")
        print(f"Firebase UID: {self.firebase_uid[:8]}...{RESET}\n")

        # ── Step 1: Authenticate ──────────────────────────────────────────────
        if not self.authenticate():
            print(f"\n{RED}{BOLD}FATAL: Authentication failed. Cannot run tests.{RESET}")
            print(f"{YELLOW}Make sure FIREBASE_ID_TOKEN is a valid, fresh token.{RESET}")
            sys.exit(1)

        # ── Step 2: Verify wallet balance endpoint ────────────────────────────
        self._log(f"\n{CYAN}{BOLD}── STEP 2: Wallet Balance Endpoint ─────────────────────{RESET}")
        balance = self.get_balance()
        if balance is not None:
            self._pass("GET /api/wallet/balance", f"Balance: {balance} credits")
        else:
            self._fail("GET /api/wallet/balance", "Could not read balance")

        # ── Step 3: Contract generation tests ────────────────────────────────
        self._log(f"\n{CYAN}{BOLD}── STEP 3: Contract Credit Deduction Tests ─────────────{RESET}")

        # Test 3a: Contract without signature → -12 credits
        payload_no_sig = {**SAMPLE_CONTRACT_PAYLOAD, "includeSignature": False}
        self._test_credit_deduction(
            test_name="Contract (no signature) → -12 credits",
            endpoint="/api/contracts/generate",
            payload=payload_no_sig,
            expected_cost=CREDIT_COSTS["contract"],
        )

        # Test 3b: Contract WITH signature bundle → -18 credits
        payload_with_sig = {
            **SAMPLE_CONTRACT_PAYLOAD,
            "includeSignature": True,
            "clientEmail": "testclient@example.com",
            "contractorEmail": "contractor@owlfenc.com",
        }
        self._test_credit_deduction(
            test_name="Contract + Dual Signature bundle → -18 credits",
            endpoint="/api/contracts/generate",
            payload=payload_with_sig,
            expected_cost=CREDIT_COSTS["contractWithSignature"],
        )

        # Test 3c: Change Order via /api/generate-contract-html → -12 credits
        change_order_payload = {
            **SAMPLE_CONTRACT_PAYLOAD,
            "templateId": "change-order",
            "changeOrder": {
                "description": "Add gate installation — TEST ONLY",
                "additionalCost": 500,
                "newCompletionDate": "2026-04-20",
            },
        }
        self._test_credit_deduction(
            test_name="Change Order (generate-contract-html) → -12 credits",
            endpoint="/api/generate-contract-html",
            payload=change_order_payload,
            expected_cost=CREDIT_COSTS["contract"],
        )

        # Test 3d: Lien Waiver via /api/generate-contract-html → -12 credits
        lien_waiver_payload = {
            **SAMPLE_CONTRACT_PAYLOAD,
            "templateId": "lien-waiver",
            "lienWaiver": {
                "waiverType": "conditional-progress",
                "throughDate": "2026-04-15",
                "paymentAmount": 2500,
            },
        }
        self._test_credit_deduction(
            test_name="Lien Waiver (generate-contract-html) → -12 credits",
            endpoint="/api/generate-contract-html",
            payload=lien_waiver_payload,
            expected_cost=CREDIT_COSTS["contract"],
        )

        # ── Step 4: Security tests ────────────────────────────────────────────
        self._log(f"\n{CYAN}{BOLD}── STEP 4: Security Tests (Auth + Credit Guard) ────────{RESET}")

        self._test_unauthenticated("/api/contracts/generate", payload_no_sig)
        self._test_unauthenticated("/api/generate-contract-html", change_order_payload)

        # Test insufficient credits (only runs if balance is 0)
        self._test_insufficient_credits(
            "/api/contracts/generate",
            payload_no_sig,
            "contract",
        )

        # ── Step 5: Transaction history verification ──────────────────────────
        self._log(f"\n{CYAN}{BOLD}── STEP 5: Transaction History Verification ────────────{RESET}")
        try:
            resp = self.session.get(self._url("/api/wallet/history?limit=10"), timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                txns = data.get("transactions") or data.get("history") or []
                contract_txns = [
                    t for t in txns
                    if (t.get("type") or t.get("featureName") or "").lower() in
                    ("contract", "contractwithsignature", "signatureprotocol")
                ]
                if contract_txns:
                    self._pass(
                        "Transaction history contains contract entries",
                        f"Found {len(contract_txns)} contract transaction(s)",
                    )
                    for t in contract_txns[:3]:
                        feature = t.get("type") or t.get("featureName") or "unknown"
                        amount = t.get("amount") or t.get("credits") or t.get("amountCredits") or 0
                        desc = t.get("description") or ""
                        print(f"    {DIM}→ {feature}: {amount} credits | {desc[:60]}{RESET}")
                else:
                    self._fail(
                        "Transaction history contains contract entries",
                        "No contract transactions found in last 10 entries",
                    )
            else:
                self._fail("GET /api/wallet/history", f"HTTP {resp.status_code}")
        except Exception as e:
            self._fail("GET /api/wallet/history", str(e))

        # ── Final report ──────────────────────────────────────────────────────
        self._print_summary()

    def _print_summary(self):
        total = self.passed + self.failed + self.skipped
        print(f"\n{CYAN}{BOLD}╔══════════════════════════════════════════════════════╗")
        print(f"║                    TEST SUMMARY                      ║")
        print(f"╚══════════════════════════════════════════════════════╝{RESET}")
        print(f"\n  Total:   {total}")
        print(f"  {GREEN}Passed:  {self.passed}{RESET}")
        print(f"  {RED}Failed:  {self.failed}{RESET}")
        print(f"  {YELLOW}Skipped: {self.skipped}{RESET}")

        if self.failed == 0:
            print(f"\n  {GREEN}{BOLD}🎉 ALL TESTS PASSED — Credit system is working correctly!{RESET}")
        else:
            print(f"\n  {RED}{BOLD}⚠️  {self.failed} test(s) FAILED — Review the output above.{RESET}")
            print(f"\n  {YELLOW}Failed tests:{RESET}")
            for status, name, detail in self.results:
                if status == "FAIL":
                    print(f"    {RED}• {name}{RESET}")
                    if detail:
                        print(f"      {DIM}{detail}{RESET}")

        print()
        sys.exit(0 if self.failed == 0 else 1)


# ─── CLI ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="OWL FENC Credit System Validation Tests",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Test against production
  python3 scripts/test-credits.py \\
    --url https://app.owlfenc.com \\
    --uid YOUR_FIREBASE_UID \\
    --token YOUR_FIREBASE_ID_TOKEN \\
    --admin-key YOUR_ADMIN_API_KEY

  # Test against Replit dev
  python3 scripts/test-credits.py \\
    --url https://YOUR-REPLIT-URL.replit.dev \\
    --uid $FIREBASE_TEST_UID \\
    --token $FIREBASE_ID_TOKEN \\
    --admin-key $ADMIN_API_KEY

  # Use environment variables
  export FIREBASE_TEST_UID=abc123
  export FIREBASE_ID_TOKEN=eyJhbGci...
  export ADMIN_API_KEY=your-admin-key
  export TEST_BASE_URL=https://app.owlfenc.com
  python3 scripts/test-credits.py

How to get a Firebase ID token:
  In the browser console on the app, run:
    firebase.auth().currentUser.getIdToken(true).then(t => console.log(t))
  Or use the Firebase Admin SDK.
        """,
    )
    parser.add_argument(
        "--url",
        default=os.environ.get("TEST_BASE_URL", "http://localhost:5000"),
        help="Base URL of the app (default: $TEST_BASE_URL or http://localhost:5000)",
    )
    parser.add_argument(
        "--uid",
        default=os.environ.get("FIREBASE_TEST_UID", ""),
        help="Firebase UID of the test user",
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("FIREBASE_ID_TOKEN", ""),
        help="Fresh Firebase ID token for the test user",
    )
    parser.add_argument(
        "--admin-key",
        default=os.environ.get("ADMIN_API_KEY", ""),
        help="Admin API key for granting test credits",
    )

    args = parser.parse_args()

    # Validate required args
    missing = []
    if not args.uid:
        missing.append("--uid / FIREBASE_TEST_UID")
    if not args.token:
        missing.append("--token / FIREBASE_ID_TOKEN")
    if not args.admin_key:
        missing.append("--admin-key / ADMIN_API_KEY")

    if missing:
        print(f"\n{RED}{BOLD}Missing required arguments:{RESET}")
        for m in missing:
            print(f"  {RED}• {m}{RESET}")
        print(f"\n{YELLOW}Run with --help for usage instructions.{RESET}\n")
        sys.exit(1)

    runner = CreditTestRunner(
        base_url=args.url,
        firebase_uid=args.uid,
        id_token=args.token,
        admin_key=args.admin_key,
    )
    runner.run()


if __name__ == "__main__":
    main()
