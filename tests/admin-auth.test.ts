import { test } from "node:test";
import assert from "node:assert/strict";
import { isAuthorizedAdminRequest, adminAuthHeaders } from "../lib/admin-auth";

const url = "https://narata.net/api/admin/ingest-tmdb";
const req = (headers: Record<string, string> = {}) => new Request(url, { headers });

test("rejects everything when INGEST_ADMIN_SECRET is unset", () => {
  delete process.env.INGEST_ADMIN_SECRET;
  assert.equal(isAuthorizedAdminRequest(req({ authorization: "Bearer " })), false);
  assert.equal(isAuthorizedAdminRequest(req({ authorization: "Bearer undefined" })), false);
});

test("accepts only the exact Bearer header", () => {
  process.env.INGEST_ADMIN_SECRET = "s3cret";
  assert.equal(isAuthorizedAdminRequest(req({ authorization: "Bearer s3cret" })), true);
  assert.equal(isAuthorizedAdminRequest(req({ authorization: "s3cret" })), false);
  assert.equal(isAuthorizedAdminRequest(req({ authorization: "Bearer wrong" })), false);
  assert.equal(isAuthorizedAdminRequest(req({ authorization: "Bearer s3cret2" })), false);
  assert.equal(isAuthorizedAdminRequest(req()), false);
});

test("ignores the old ?secret= query param", () => {
  process.env.INGEST_ADMIN_SECRET = "s3cret";
  assert.equal(isAuthorizedAdminRequest(new Request(`${url}?secret=s3cret`)), false);
});

test("continuation headers pass the check", () => {
  process.env.INGEST_ADMIN_SECRET = "s3cret";
  assert.equal(isAuthorizedAdminRequest(req(adminAuthHeaders())), true);
});
