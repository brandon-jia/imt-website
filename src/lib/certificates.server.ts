import { createHash } from 'node:crypto';

type Certificate = {
  name: string;
  issuedOn: string;
  award: string;
};

type VerificationResult =
  | { status: 'verified'; certificate: Certificate }
  | { status: 'invalid' | 'not-found' | 'unavailable' };

export function verifyCertificate(input: string): VerificationResult {
  const code = input.trim();
  if (code.length !== 12 || !/^[A-HJ-NP-Z2-9]+$/i.test(code)) {
    return { status: 'invalid' };
  }

  // Read the server's runtime environment. The registry is never part of a build.
  const registryJson = process.env.CERTIFICATE_REGISTRY_JSON;
  if (!registryJson) return { status: 'unavailable' };

  try {
    const registry = JSON.parse(registryJson);
    if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
      return { status: 'unavailable' };
    }

    const digest = createHash('sha256').update(code.toUpperCase()).digest('hex');
    if (!Object.hasOwn(registry, digest)) return { status: 'not-found' };

    const record = registry[digest];
    if (!record || typeof record.name !== 'string' || !record.name.trim() ||
      typeof record.award !== 'string' || !record.award.trim() ||
      typeof record.issuedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.issuedOn) ||
      new Date(record.issuedOn).toISOString().slice(0, 10) !== record.issuedOn) {
      return { status: 'unavailable' };
    }

    const { name, issuedOn, award } = record;
    return { status: 'verified', certificate: { name, issuedOn, award } };
  } catch {
    return { status: 'unavailable' };
  }
}
