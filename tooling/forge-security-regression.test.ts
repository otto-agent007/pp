// @vitest-environment node
import { generateKeyPairSync, privateEncrypt, constants } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Resolve the actual Expo dependency chain, not a separate test-only Forge copy.
const mobileRequire = createRequire(resolve("apps/mobile/package.json"));
const expoRequire = createRequire(mobileRequire.resolve("expo/package.json"));
const cliRequire = createRequire(expoRequire.resolve("@expo/cli/package.json"));
const certificates = cliRequire("@expo/code-signing-certificates");
const certificateRequire = createRequire(
  cliRequire.resolve("@expo/code-signing-certificates"),
);
const forge = certificateRequire("node-forge");

function fixture(publicExponent: number) {
  const keys = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicExponent,
  });
  const privatePem = keys.privateKey
    .export({ format: "pem", type: "pkcs1" })
    .toString();
  const publicPem = keys.publicKey
    .export({ format: "pem", type: "pkcs1" })
    .toString();
  return {
    nativePrivate: keys.privateKey,
    privateKey: forge.pki.privateKeyFromPem(privatePem),
    publicKey: forge.pki.publicKeyFromPem(publicPem),
  };
}
const keys = fixture(3);
const sha256 = forge.md.sha256
  .create()
  .update("local regression fixture")
  .digest()
  .getBytes();

function digestInfo(
  digest: string,
  withNull: boolean,
  extras: number,
  outerExtra = false,
  nullContent = "",
  oidSuffix = "",
) {
  const a = forge.asn1;
  const children = [
    a.create(
      a.Class.UNIVERSAL,
      a.Type.OID,
      false,
      a.oidToDer(forge.oids.sha256).getBytes() + oidSuffix,
    ),
  ];
  if (withNull)
    children.push(a.create(a.Class.UNIVERSAL, a.Type.NULL, false, nullContent));
  for (let n = 0; n < extras; n++) {
    children.push(
      a.create(a.Class.UNIVERSAL, a.Type.OCTETSTRING, false, "unconsumed"),
    );
  }
  const value = [
    a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, children),
    a.create(a.Class.UNIVERSAL, a.Type.OCTETSTRING, false, digest),
  ];
  if (outerExtra)
    value.push(a.create(a.Class.UNIVERSAL, a.Type.NULL, false, ""));
  return a
    .toDer(a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, value))
    .getBytes();
}
function signature(
  digest: string,
  withNull: boolean,
  extras: number,
  outerExtra = false,
  nullContent = "",
  oidSuffix = "",
) {
  // Sign deliberately malformed DER using only an ephemeral local fixture key.
  // This tests verifier acceptance, not an end-to-end private-key-free forgery.
  return privateEncrypt(
    { key: keys.nativePrivate, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(
      digestInfo(digest, withNull, extras, outerExtra, nullContent, oidSuffix),
      "binary",
    ),
  ).toString("binary");
}

describe("Forge DigestAlgorithm strictness (GHSA-86w9-cpqp-85rv)", () => {
  it.each([true, false])("preserves valid SHA-256 with NULL=%s", (withNull) => {
    expect(keys.publicKey.verify(sha256, signature(sha256, withNull, 0))).toBe(
      true,
    );
  });
  it.each([
    [true, 1],
    [false, 1],
    [true, 2],
    [false, 2],
  ] as const)(
    "rejects unconsumed nested elements (NULL=%s, extras=%s)",
    (withNull, extras) => {
      expect(() =>
        keys.publicKey.verify(sha256, signature(sha256, withNull, extras)),
      ).toThrow(/DigestInfo/);
    },
  );
  it("rejects nonempty NULL parameters rather than accepting hidden content", () => {
    expect(() =>
      keys.publicKey.verify(
        sha256,
        signature(sha256, true, 0, false, "unconsumed garbage"),
      ),
    ).toThrow(/DigestInfo/);
  });
  it("rejects an unterminated OID suffix ignored by the legacy decoder", () => {
    expect(() =>
      keys.publicKey.verify(
        sha256,
        signature(sha256, true, 0, false, "", "\x81"),
      ),
    ).toThrow(/DigestAlgorithm/);
  });
  it("continues rejecting outer trailing elements", () => {
    expect(() =>
      keys.publicKey.verify(sha256, signature(sha256, true, 0, true)),
    ).toThrow(/DigestInfo/);
  });
  it("rejects a mismatched digest", () => {
    expect(
      keys.publicKey.verify("different digest", signature(sha256, true, 0)),
    ).toBe(false);
  });
  it("preserves conventional exponent-65537 SHA-256 signatures", () => {
    const conventional = fixture(65537);
    const md = forge.md.sha256.create().update("local regression fixture");
    expect(
      conventional.publicKey.verify(sha256, conventional.privateKey.sign(md)),
    ).toBe(true);
  });
  it("uses the patched Forge instance for both Expo consumers", () => {
    expect(cliRequire.resolve("node-forge")).toBe(
      certificateRequire.resolve("node-forge"),
    );
  });
  it("preserves Expo CSR verification and rejects malformed nested digest data", () => {
    const csr = certificates.generateCSR(keys, "local-test.invalid");
    expect(csr.verify()).toBe(true);
    csr.signature = signature(csr.md.digest().getBytes(), true, 1);
    expect(() => csr.verify()).toThrow(/DigestInfo/);
    const encoded = certificates.convertCSRToCSRPEM(csr);
    const decoded = certificates.convertCSRPEMToCSR(encoded);
    expect(() => decoded.verify()).toThrow(/DigestInfo/);
  });
  it("preserves Expo certificate signing and rejects malformed serialized certificates", () => {
    const certificate = certificates.generateSelfSignedCodeSigningCertificate({
      keyPair: keys,
      validityNotBefore: new Date("2020-01-01T00:00:00Z"),
      validityNotAfter: new Date("2100-01-01T00:00:00Z"),
      commonName: "local-test.invalid",
    });
    expect(() =>
      certificates.validateSelfSignedCertificate(certificate, keys),
    ).not.toThrow();
    const signed = certificates.signBufferRSASHA256AndVerify(
      keys.privateKey,
      certificate,
      Buffer.from("local fixture"),
    );
    expect(typeof signed).toBe("string");
    const bufferDigest = forge.md.sha256
      .create()
      .update("local fixture")
      .digest()
      .getBytes();
    expect(
      keys.publicKey.verify(
        bufferDigest,
        Buffer.from(signed, "base64").toString("binary"),
      ),
    ).toBe(true);
    certificate.signature = signature(
      certificate.md.digest().getBytes(),
      true,
      1,
    );
    const pem = certificates.convertCertificateToCertificatePEM(certificate);
    const decoded = certificates.convertCertificatePEMToCertificate(pem);
    expect(() =>
      certificates.validateSelfSignedCertificate(decoded, keys),
    ).toThrow(/DigestInfo/);
  });
});
