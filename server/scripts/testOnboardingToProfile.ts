/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   OWL FENC — ONBOARDING → PROFILE END-TO-END TEST               ║
 * ║   Tests that ALL onboarding fields persist correctly to:          ║
 * ║   1. PostgreSQL (used by estimates, contracts, invoices)          ║
 * ║   2. Firestore (used by Profile/Settings page)                   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Run: npx tsx server/scripts/testOnboardingToProfile.ts
 */

import "../firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { userMappingService } from "../services/userMappingService";
import { walletService } from "../services/walletService";

// ─── Test data (simulates exactly what ContractorOnboarding sends) ───────────
const TEST_EMAIL = `test_onboarding_${Date.now()}@owlfenc-test.com`;
const TEST_UID_PLACEHOLDER = ""; // will be filled after Firebase user creation

const ONBOARDING_DATA = {
  company: "Apex Construction LLC",
  ownerName: "Carlos Mendez",
  phone: "(512) 555-0199",
  state: "TX",
  city: "Austin",
  zipCode: "78701",
  website: "https://apexconstruction.com",
  specialties: ["General Contractor", "Fencing", "Concrete Work"],
  license: "TX-GC-2024-88821",
  insurancePolicy: "AXA-POL-2024-99123",
  yearEstablished: "2018",
  businessType: "LLC",
  logo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  profilePhoto: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  email: TEST_EMAIL,
  role: "Owner",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pass = (msg: string) => console.log(`  ✅ PASS  ${msg}`);
const fail = (msg: string) => { console.log(`  ❌ FAIL  ${msg}`); failures++; };
const info = (msg: string) => console.log(`  ℹ️  ${msg}`);
let failures = 0;
let testCount = 0;

function check(label: string, expected: any, actual: any) {
  testCount++;
  const exp = JSON.stringify(expected);
  const act = JSON.stringify(actual);
  if (exp === act) {
    pass(`${label}: "${act}"`);
  } else {
    fail(`${label}\n       Expected: ${exp}\n       Actual:   ${act}`);
  }
}

function checkTruthy(label: string, value: any) {
  testCount++;
  if (value) {
    pass(`${label}: "${value}"`);
  } else {
    fail(`${label}: got "${value}" (falsy)`);
  }
}

// ─── Main test ────────────────────────────────────────────────────────────────
async function runTest() {
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║   OWL FENC — ONBOARDING → PROFILE E2E TEST                      ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");

  const auth = getAuth();
  const firestore = getFirestore();
  let firebaseUid = "";

  // ── PHASE 1: Create Firebase user ─────────────────────────────────────────
  console.log("━━━ PHASE 1: Create Firebase test user ━━━");
  const fbUser = await auth.createUser({
    email: TEST_EMAIL,
    password: "TestPass123!",
    displayName: ONBOARDING_DATA.ownerName,
  });
  firebaseUid = fbUser.uid;
  info(`Firebase user created: ${TEST_EMAIL} (UID: ${firebaseUid})`);

  // ── PHASE 2: Simulate POST /api/profile (PostgreSQL write) ────────────────
  console.log("\n━━━ PHASE 2: Simulate onboarding → PostgreSQL save ━━━");
  const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(
    firebaseUid,
    TEST_EMAIL
  );
  info(`PostgreSQL user_id: ${userId}`);

  // Simulate exactly what POST /api/profile does
  const pgUpdateData: any = {
    company: ONBOARDING_DATA.company,
    ownerName: ONBOARDING_DATA.ownerName,
    phone: ONBOARDING_DATA.phone,
    state: ONBOARDING_DATA.state,
    city: ONBOARDING_DATA.city,
    zipCode: ONBOARDING_DATA.zipCode,
    website: ONBOARDING_DATA.website,
    specialties: ONBOARDING_DATA.specialties,
    license: ONBOARDING_DATA.license,
    insurancePolicy: ONBOARDING_DATA.insurancePolicy,
    yearEstablished: ONBOARDING_DATA.yearEstablished,
    businessType: ONBOARDING_DATA.businessType,
    logo: ONBOARDING_DATA.logo,
    profilePhoto: ONBOARDING_DATA.profilePhoto,
  };
  await db.update(users).set(pgUpdateData).where(eq(users.id, userId));
  info("PostgreSQL update executed");

  // ── PHASE 3: Verify PostgreSQL fields ─────────────────────────────────────
  console.log("\n━━━ PHASE 3: Verify PostgreSQL fields ━━━");
  const pgUser = await db.query.users.findFirst({ where: eq(users.id, userId) });

  if (!pgUser) {
    fail("User not found in PostgreSQL after update");
  } else {
    check("company", ONBOARDING_DATA.company, pgUser.company);
    check("ownerName", ONBOARDING_DATA.ownerName, pgUser.ownerName);
    check("phone", ONBOARDING_DATA.phone, pgUser.phone);
    check("state", ONBOARDING_DATA.state, pgUser.state);
    check("city", ONBOARDING_DATA.city, pgUser.city);
    check("zipCode", ONBOARDING_DATA.zipCode, pgUser.zipCode);
    check("website", ONBOARDING_DATA.website, pgUser.website);
    check("license", ONBOARDING_DATA.license, pgUser.license);
    check("insurancePolicy", ONBOARDING_DATA.insurancePolicy, pgUser.insurancePolicy);
    check("yearEstablished", ONBOARDING_DATA.yearEstablished, pgUser.yearEstablished);
    check("businessType", ONBOARDING_DATA.businessType, pgUser.businessType);
    check("specialties[0]", ONBOARDING_DATA.specialties[0], (pgUser.specialties as string[])?.[0]);
    check("specialties[1]", ONBOARDING_DATA.specialties[1], (pgUser.specialties as string[])?.[1]);
    check("specialties[2]", ONBOARDING_DATA.specialties[2], (pgUser.specialties as string[])?.[2]);
    checkTruthy("logo (base64 stored)", pgUser.logo);
    checkTruthy("profilePhoto (base64 stored)", pgUser.profilePhoto);
  }

  // ── PHASE 4: Simulate Firestore write (what onboarding does) ──────────────
  console.log("\n━━━ PHASE 4: Simulate onboarding → Firestore sync ━━━");
  const firestorePayload = {
    company: ONBOARDING_DATA.company,
    companyName: ONBOARDING_DATA.company,  // canonical Firestore field
    ownerName: ONBOARDING_DATA.ownerName,
    phone: ONBOARDING_DATA.phone,
    mobilePhone: "",
    address: "",
    city: ONBOARDING_DATA.city,
    state: ONBOARDING_DATA.state,
    zipCode: ONBOARDING_DATA.zipCode,
    website: ONBOARDING_DATA.website,
    specialties: ONBOARDING_DATA.specialties,
    license: ONBOARDING_DATA.license,
    insurancePolicy: ONBOARDING_DATA.insurancePolicy,
    yearEstablished: ONBOARDING_DATA.yearEstablished,
    businessType: ONBOARDING_DATA.businessType,
    ein: "",
    description: "",
    socialMedia: {},
    documents: {},
    logo: ONBOARDING_DATA.logo,
    profilePhoto: ONBOARDING_DATA.profilePhoto,
    role: "Owner",
    email: TEST_EMAIL,
    userId: firebaseUid,
    firebaseUid: firebaseUid,
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  const docRef = firestore.collection("userProfiles").doc(firebaseUid);
  await docRef.set(firestorePayload);
  info("Firestore write executed");

  // ── PHASE 5: Verify Firestore fields (simulates what Profile page reads) ───
  console.log("\n━━━ PHASE 5: Verify Firestore fields (as Profile page reads them) ━━━");
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    fail("Document not found in Firestore after write");
  } else {
    const fsData = docSnap.data()!;

    // Profile page reads 'companyName' and maps it to 'company'
    const companyForDisplay = fsData.companyName || fsData.company || "";
    check("company (via companyName)", ONBOARDING_DATA.company, companyForDisplay);
    check("ownerName", ONBOARDING_DATA.ownerName, fsData.ownerName);
    check("phone", ONBOARDING_DATA.phone, fsData.phone);
    check("state", ONBOARDING_DATA.state, fsData.state);
    check("city", ONBOARDING_DATA.city, fsData.city);
    check("zipCode", ONBOARDING_DATA.zipCode, fsData.zipCode);
    check("website", ONBOARDING_DATA.website, fsData.website);
    check("license", ONBOARDING_DATA.license, fsData.license);
    check("insurancePolicy", ONBOARDING_DATA.insurancePolicy, fsData.insurancePolicy);
    check("yearEstablished", ONBOARDING_DATA.yearEstablished, fsData.yearEstablished);
    check("businessType", ONBOARDING_DATA.businessType, fsData.businessType);
    check("email", TEST_EMAIL, fsData.email);
    check("role", "Owner", fsData.role);
    check("specialties[0]", ONBOARDING_DATA.specialties[0], fsData.specialties?.[0]);
    check("specialties[1]", ONBOARDING_DATA.specialties[1], fsData.specialties?.[1]);
    check("specialties[2]", ONBOARDING_DATA.specialties[2], fsData.specialties?.[2]);
    checkTruthy("logo stored in Firestore", fsData.logo);
    checkTruthy("profilePhoto stored in Firestore", fsData.profilePhoto);
    checkTruthy("userId matches firebaseUid", fsData.userId === firebaseUid);
  }

  // ── PHASE 6: Verify welcome credits ───────────────────────────────────────
  console.log("\n━━━ PHASE 6: Verify welcome credits (120) ━━━");
  await walletService.addCredits({
    firebaseUid,
    amountCredits: 120,
    type: "bonus",
    description: "Welcome bonus — test",
    idempotencyKey: `welcome_bonus_120:${firebaseUid}`,
  });
  const balance = await walletService.getBalance(firebaseUid);
  check("wallet balance after welcome bonus", 120, balance);

  // Idempotency: second grant should not add more
  await walletService.addCredits({
    firebaseUid,
    amountCredits: 120,
    type: "bonus",
    description: "Welcome bonus — duplicate attempt",
    idempotencyKey: `welcome_bonus_120:${firebaseUid}`,
  });
  const balanceAfterDuplicate = await walletService.getBalance(firebaseUid);
  check("wallet balance after duplicate grant (idempotency)", 120, balanceAfterDuplicate);

  // ── PHASE 7: Cross-check — PostgreSQL vs Firestore consistency ─────────────
  console.log("\n━━━ PHASE 7: Cross-check PostgreSQL ↔ Firestore consistency ━━━");
  const pgFinal = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const fsFinal = (await docRef.get()).data()!;

  check("company consistent PG↔FS", pgFinal?.company, fsFinal.companyName);
  check("phone consistent PG↔FS", pgFinal?.phone, fsFinal.phone);
  check("state consistent PG↔FS", pgFinal?.state, fsFinal.state);
  check("city consistent PG↔FS", pgFinal?.city, fsFinal.city);
  check("license consistent PG↔FS", pgFinal?.license, fsFinal.license);
  check("website consistent PG↔FS", pgFinal?.website, fsFinal.website);
  check("businessType consistent PG↔FS", pgFinal?.businessType, fsFinal.businessType);

  // ── CLEANUP ───────────────────────────────────────────────────────────────
  console.log("\n━━━ Cleanup ━━━");
  await auth.deleteUser(firebaseUid);
  info(`Firebase user deleted: ${TEST_EMAIL}`);

  await docRef.delete();
  info(`Firestore document deleted: userProfiles/${firebaseUid}`);

  // Delete PostgreSQL records (wallet first due to FK)
  await db.execute(`DELETE FROM credit_transactions WHERE firebase_uid = '${firebaseUid}'`);
  await db.execute(`DELETE FROM credit_wallets WHERE firebase_uid = '${firebaseUid}'`);
  await db.delete(users).where(eq(users.id, userId));
  info(`PostgreSQL records deleted for user_id: ${userId}`);

  // ── RESULTS ───────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║                        TEST RESULTS                             ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");

  const passed = testCount - failures;
  console.log(`\n  Results: ${passed}/${testCount} tests passed\n`);

  if (failures === 0) {
    console.log("  🎉 ALL TESTS PASSED — Onboarding → Profile data flow is working correctly!\n");
  } else {
    console.log(`  ⚠️  ${failures} test(s) FAILED — See details above\n`);
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error("\n❌ FATAL ERROR:", err);
  process.exit(1);
});
